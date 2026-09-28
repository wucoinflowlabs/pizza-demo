import "server-only";
import { Redis } from "@upstash/redis";
import { after } from "next/server";
import type { DevtoolsEvent, DevtoolsEventInput, DevtoolsFeed } from "./types";

const MAX_EVENTS = 200;
const EVENTS_KEY = "devtools:events";
const SEQ_KEY = "devtools:seq";
const CLEARED_KEY = "devtools:cleared";

// Assigns the seq and pushes in one step, so the list is always in seq order
// and a poller can never skip an event that was numbered but not yet stored.
const RECORD_SCRIPT = `
local seq = redis.call('INCR', KEYS[2])
redis.call('LPUSH', KEYS[1], seq .. '|' .. ARGV[1])
redis.call('LTRIM', KEYS[1], 0, tonumber(ARGV[2]) - 1)
return seq
`;

const CLEAR_SCRIPT = `
redis.call('DEL', KEYS[1])
redis.call('SET', KEYS[3], redis.call('GET', KEYS[2]) or '0')
return 1
`;

export function isDevtoolsEnabled() {
  return process.env.DEVTOOLS_ENABLED === "true";
}

let redis: Redis | null | undefined;

/** Shared store on Vercel, where each request can land on a different instance. */
function getRedis() {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  redis = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;
  return redis;
}

// Local dev runs in one process, so memory is enough there.
const memory = ((globalThis as { __devtoolsFeed?: DevtoolsFeed }).__devtoolsFeed ??= {
  events: [],
  lastSeq: 0,
  clearedSeq: 0,
});

/** Never throws: a logging failure must not break a payments flow. */
export async function recordEvent(event: DevtoolsEventInput) {
  if (!isDevtoolsEnabled()) return;
  try {
    const client = getRedis();
    if (!client) {
      memory.lastSeq += 1;
      memory.events.push({ ...event, seq: memory.lastSeq });
      if (memory.events.length > MAX_EVENTS) memory.events.shift();
      return;
    }
    await client.eval(RECORD_SCRIPT, [EVENTS_KEY, SEQ_KEY], [
      JSON.stringify(event),
      String(MAX_EVENTS),
    ]);
  } catch (err) {
    console.error("[devtools] failed to record event", err);
  }
}

/**
 * Starts recording now, so the panel shows the step while the caller carries
 * on, without making the caller wait. `after` keeps a serverless function
 * alive until the write lands.
 */
export function recordEventInBackground(event: DevtoolsEventInput) {
  if (!isDevtoolsEnabled()) return;
  const pending = recordEvent(event);
  try {
    after(() => pending);
  } catch {
    // Outside a request (e.g. a script): the write still runs, just unawaited.
  }
}

/** Events newer than `afterSeq`, oldest first. */
export async function listEvents(afterSeq: number): Promise<DevtoolsFeed> {
  const client = getRedis();
  if (!client) {
    return {
      events: memory.events.filter((event) => event.seq > afterSeq),
      lastSeq: memory.lastSeq,
      clearedSeq: memory.clearedSeq,
    };
  }

  const [rawSeq, rawCleared] = await client.mget<(string | null)[]>(SEQ_KEY, CLEARED_KEY);
  const lastSeq = Number(rawSeq ?? 0);
  const clearedSeq = Number(rawCleared ?? 0);
  const from = Math.max(afterSeq, clearedSeq);
  if (lastSeq <= from) return { events: [], lastSeq, clearedSeq };

  const count = Math.min(lastSeq - from, MAX_EVENTS);
  const rows = await client.lrange<string>(EVENTS_KEY, 0, count - 1);
  const events = rows
    .map(parseRow)
    .filter((event): event is DevtoolsEvent => !!event && event.seq > from)
    .reverse();
  return { events, lastSeq, clearedSeq };
}

/** Keeps the seq counter so every open panel sees the clear on its next poll. */
export async function clearEvents() {
  const client = getRedis();
  if (!client) {
    memory.events = [];
    memory.clearedSeq = memory.lastSeq;
    return;
  }
  await client.eval(CLEAR_SCRIPT, [EVENTS_KEY, SEQ_KEY, CLEARED_KEY], []);
}

function parseRow(row: string): DevtoolsEvent | undefined {
  const separator = row.indexOf("|");
  if (separator === -1) return undefined;
  try {
    const event = JSON.parse(row.slice(separator + 1)) as DevtoolsEventInput;
    return { ...event, seq: Number(row.slice(0, separator)) };
  } catch {
    return undefined;
  }
}
