"use client";

import { useState } from "react";
import { ArrowDownLeftIcon, ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DevtoolsEvent } from "@/lib/devtools/types";

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const SUCCESS_BADGE = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
const WARNING_BADGE = "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

export function EventRow({ event, repeats }: { event: DevtoolsEvent; repeats: number }) {
  const [expanded, setExpanded] = useState(false);
  const outgoing = event.direction === "outgoing";

  return (
    <li className="animate-in fade-in slide-in-from-top-1 border-b duration-300">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/60"
      >
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
            outgoing
              ? "bg-adora-blue/10 text-adora-blue"
              : "bg-violet-500/10 text-violet-600 dark:text-violet-300",
          )}
          aria-label={outgoing ? "Request to Coinflow" : "Webhook from Coinflow"}
        >
          {outgoing ? (
            <ArrowUpRightIcon className="size-3.5" />
          ) : (
            <ArrowDownLeftIcon className="size-3.5" />
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{event.label}</span>
            {repeats > 1 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[0.65rem]">
                ×{repeats}
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            {outgoing ? (
              <>
                <span className="font-semibold text-foreground">{event.method}</span>
                <span className="truncate">{event.path}</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">WEBHOOK</span>
                <span className="truncate">{event.eventType}</span>
              </>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <StatusBadge event={event} />
            {outgoing && <span>{event.durationMs}ms</span>}
            <span>{TIME_FORMAT.format(event.ts)}</span>
            {event.submerchantId && (
              <span className="truncate rounded bg-muted px-1.5 font-mono">
                {event.submerchantId}
              </span>
            )}
          </span>
        </span>

        <ChevronRightIcon
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 px-4 pb-4 pl-13">
          {outgoing ? (
            <>
              <JsonBlock
                title="Headers"
                value={{
                  Authorization: "••••",
                  ...(event.submerchantId
                    ? { "x-coinflow-submerchant-id": event.submerchantId }
                    : {}),
                }}
              />
              {event.requestBody !== undefined && (
                <JsonBlock title="Request body" value={event.requestBody} />
              )}
              {event.error && <JsonBlock title="Error" value={event.error} />}
              {event.responseBody !== undefined && (
                <JsonBlock title="Response body" value={event.responseBody} />
              )}
            </>
          ) : (
            <JsonBlock title="Payload" value={event.payload} />
          )}
        </div>
      )}
    </li>
  );
}

function StatusBadge({ event }: { event: DevtoolsEvent }) {
  if (event.direction === "incoming")
    return event.verified ? (
      <Badge className={cn("h-4 px-1.5 text-[0.65rem]", SUCCESS_BADGE)}>verified</Badge>
    ) : (
      <Badge className={cn("h-4 px-1.5 text-[0.65rem]", WARNING_BADGE)}>rejected</Badge>
    );

  if (event.status === undefined)
    return (
      <Badge variant="destructive" className="h-4 px-1.5 text-[0.65rem]">
        failed
      </Badge>
    );
  const ok = event.status >= 200 && event.status < 300;
  return (
    <Badge
      variant={ok ? "default" : "destructive"}
      className={cn("h-4 px-1.5 font-mono text-[0.65rem]", ok && SUCCESS_BADGE)}
    >
      {event.status}
    </Badge>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </span>
      <pre className="max-h-72 overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-[0.7rem] leading-relaxed whitespace-pre-wrap break-all">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
