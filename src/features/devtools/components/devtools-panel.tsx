"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ActivityIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DevtoolsEvent } from "@/lib/devtools/types";
import { EventRow } from "./event-row";
import { useDevtoolsEvents } from "./use-devtools-events";

const STORAGE_KEY = "devtools-panel-open";
const TOGGLE_KEY = "`";

type Filter = "all" | "outgoing" | "incoming";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "outgoing", label: "API calls" },
  { value: "incoming", label: "Webhooks" },
];

// The open state lives in localStorage so it survives navigation and reloads.
const openListeners = new Set<() => void>();
let openFallback = false;

function readOpen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return openFallback;
  }
}

function writeOpen(open: boolean) {
  openFallback = open;
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    // Storage blocked: the in-memory fallback still works for this page.
  }
  openListeners.forEach((listener) => listener());
}

function subscribeOpen(listener: () => void) {
  openListeners.add(listener);
  return () => openListeners.delete(listener);
}

/** `key` stays the group's first seq so a growing group doesn't remount. */
type Row = { key: number; event: DevtoolsEvent; repeats: number };

/** Repeated status polls with an unchanged answer collapse into one row. */
function isRepeat(previous: DevtoolsEvent, next: DevtoolsEvent) {
  return (
    previous.direction === "outgoing" &&
    next.direction === "outgoing" &&
    next.method === "GET" &&
    previous.method === next.method &&
    previous.path === next.path &&
    previous.submerchantId === next.submerchantId &&
    previous.status === next.status &&
    JSON.stringify(previous.responseBody) === JSON.stringify(next.responseBody)
  );
}

function buildRows(events: DevtoolsEvent[], filter: Filter, collapse: boolean): Row[] {
  const rows: Row[] = [];
  for (const event of events) {
    if (filter !== "all" && event.direction !== filter) continue;
    const last = rows.at(-1);
    if (collapse && last && isRepeat(last.event, event)) {
      rows[rows.length - 1] = { key: last.key, event, repeats: last.repeats + 1 };
      continue;
    }
    rows.push({ key: event.seq, event, repeats: 1 });
  }
  return rows.reverse();
}

export function DevtoolsPanel() {
  const open = useSyncExternalStore(subscribeOpen, readOpen, () => false);
  const { events, unread, markSeen, clear } = useDevtoolsEvents(open);
  const [filter, setFilter] = useState<Filter>("all");
  const [collapse, setCollapse] = useState(true);
  const rows = useMemo(() => buildRows(events, filter, collapse), [events, filter, collapse]);

  const setOpen = (next: boolean) => {
    markSeen();
    writeOpen(next);
  };

  useEffect(() => {
    document.documentElement.toggleAttribute("data-devtools-open", open);
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== TOGGLE_KEY || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      markSeen();
      writeOpen(!readOpen());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [markSeen]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-adora-navy px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:bg-adora-blue"
          title={`Coinflow activity (press ${TOGGLE_KEY})`}
        >
          <ActivityIcon className="size-4" />
          Coinflow activity
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-adora-navy">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}

      <aside
        aria-label="Coinflow activity"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l bg-background shadow-2xl transition-transform duration-200 sm:w-(--devtools-width)",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Coinflow activity
            </h2>
            <p className="text-xs text-muted-foreground">
              Live API calls to Coinflow and webhooks back from it.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clear}
              aria-label="Clear activity"
              title="Clear activity"
            >
              <Trash2Icon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label="Close panel"
              title={`Close (press ${TOGGLE_KEY})`}
            >
              <XIcon />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition",
                  filter === value && "bg-background text-foreground shadow-sm",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={collapse}
              onChange={(event) => setCollapse(event.target.checked)}
              className="accent-adora-blue"
            />
            Collapse repeats
          </label>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center text-sm text-muted-foreground">
            <ActivityIcon className="size-6" />
            <p>Nothing yet. Calls to Coinflow and incoming webhooks show up here as they happen.</p>
          </div>
        ) : (
          <ol className="flex-1 overflow-y-auto">
            {rows.map(({ key, event, repeats }) => (
              <EventRow key={key} event={event} repeats={repeats} />
            ))}
          </ol>
        )}
      </aside>
    </>
  );
}
