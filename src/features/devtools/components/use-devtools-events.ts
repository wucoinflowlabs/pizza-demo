"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DevtoolsEvent, DevtoolsFeed } from "@/lib/devtools/types";

const OPEN_INTERVAL_MS = 1_000;
// Closed, it only needs to keep the unread badge roughly current.
const CLOSED_INTERVAL_MS = 5_000;
const MAX_KEPT = 200;

export function useDevtoolsEvents(open: boolean) {
  const [events, setEvents] = useState<DevtoolsEvent[]>([]);
  const [seenSeq, setSeenSeq] = useState(0);
  const lastSeq = useRef(0);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (!document.hidden) {
        try {
          const response = await fetch(`/api/devtools/events?after=${lastSeq.current}`, {
            cache: "no-store",
          });
          if (response.ok && !cancelled) apply((await response.json()) as DevtoolsFeed);
        } catch {
          // Offline or mid-deploy; the next poll catches up.
        }
      }
      if (!cancelled) timer = setTimeout(poll, open ? OPEN_INTERVAL_MS : CLOSED_INTERVAL_MS);
    }

    function apply(feed: DevtoolsFeed) {
      // The store restarted (e.g. dev server reload): start over on the next poll.
      if (feed.lastSeq < lastSeq.current) {
        lastSeq.current = 0;
        setEvents([]);
        return;
      }
      lastSeq.current = feed.lastSeq;
      setEvents((previous) =>
        [...previous.filter((event) => event.seq > feed.clearedSeq), ...feed.events].slice(
          -MAX_KEPT,
        ),
      );
      // History from before this page loaded isn't "unread".
      if (!loaded.current) {
        loaded.current = true;
        setSeenSeq(feed.lastSeq);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open]);

  const markSeen = useCallback(() => setSeenSeq(lastSeq.current), []);

  const clear = useCallback(async () => {
    setEvents([]);
    await fetch("/api/devtools/events", { method: "DELETE" }).catch(() => undefined);
  }, []);

  const unread = open ? 0 : events.filter((event) => event.seq > seenSeq).length;

  return { events, unread, markSeen, clear };
}
