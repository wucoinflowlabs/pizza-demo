"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import type { OnboardingCompletedAt, StoreOnboardingStatus } from "../store-status";

/** Re-render when the soonest approval hold expires. */
export function useApprovalClock(deadlines: Array<string | undefined>) {
  const [now, setNow] = useState(() => Date.now());
  const next = deadlines
    .map((iso) => (iso ? Date.parse(iso) : Number.NaN))
    .filter((time) => time > now)
    .sort((a, b) => a - b)[0];

  useEffect(() => {
    if (next === undefined) return;
    const remaining = next - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(next + 1), remaining);
    return () => window.clearTimeout(timer);
  }, [next]);

  return now;
}

const STEP_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/Chicago",
});

const STEP_CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "America/Chicago",
});

const PROGRESS_STEPS = [
  { id: "account", label: "Account creation" },
  { id: "form", label: "Onboarding form submitted" },
  { id: "approved", label: "Approved" },
] as const;

function progressDone(status: StoreOnboardingStatus): boolean[] {
  const account = status !== "not-started";
  const formSubmitted =
    status === "form-submitted" || status === "under-review" || status === "approved";
  return [account, formSubmitted, status === "approved"];
}

function StepTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <time
      dateTime={iso}
      className="text-center text-[10px] leading-tight whitespace-nowrap text-muted-foreground tabular-nums"
    >
      {STEP_DAY.format(date)}
      <br />
      {STEP_CLOCK.format(date)}
    </time>
  );
}

export function StoreProgress({
  status,
  completedAt,
}: {
  status: StoreOnboardingStatus;
  completedAt?: OnboardingCompletedAt;
}) {
  const done = progressDone(status);
  const current = done.findIndex((step) => !step);
  const times = [completedAt?.account, completedAt?.form, completedAt?.approved];

  return (
    <ol aria-label="Onboarding progress" className="flex shrink-0 items-start">
      {PROGRESS_STEPS.map((step, index) => {
        const complete = done[index];
        const active = index === current;
        const linked = index > 0 && done[index - 1];
        const finishedAt = complete ? times[index] : undefined;
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={`flex shrink-0 flex-col items-center gap-1.5 ${
              step.id === "form" ? "w-[5.5rem]" : "w-20"
            }`}
          >
            <span className="relative flex h-7 w-full items-center justify-center">
              {index > 0 && (
                <span
                  aria-hidden
                  className={`absolute top-1/2 right-[calc(50%+0.875rem)] h-0.5 w-[calc(50%-0.875rem)] -translate-y-1/2 ${
                    linked ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              {index < PROGRESS_STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute top-1/2 left-[calc(50%+0.875rem)] h-0.5 w-[calc(50%-0.875rem)] -translate-y-1/2 ${
                    complete ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                  complete
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "border border-primary bg-background text-primary ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {complete ? <CheckIcon className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
            </span>
            <span
              className={`w-full text-center text-[10px] leading-tight ${
                complete || active ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {finishedAt ? <StepTime iso={finishedAt} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
