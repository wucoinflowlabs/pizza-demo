import { CheckIcon } from "lucide-react";
import type { StoreOnboardingStatus } from "../store-status";

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

export function StoreProgress({ status }: { status: StoreOnboardingStatus }) {
  const done = progressDone(status);
  const current = done.findIndex((step) => !step);

  return (
    <ol aria-label="Onboarding progress" className="flex shrink-0 items-start">
      {PROGRESS_STEPS.map((step, index) => {
        const complete = done[index];
        const active = index === current;
        const linked = index > 0 && done[index - 1];
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={`flex shrink-0 flex-col items-center gap-1.5 ${
              step.id === "form" ? "w-[5.5rem]" : "w-16"
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
          </li>
        );
      })}
    </ol>
  );
}
