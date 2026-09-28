"use client";

import { CheckIcon, CircleIcon } from "lucide-react";
import { UnderReviewScreen } from "@/features/application/components/under-review-screen";

const STEPS = [
  { title: "Account creation", complete: true, current: false },
  { title: "Business verification", complete: true, current: false },
  { title: "Onboarding details", complete: true, current: false },
  { title: "Submit application", complete: true, current: true },
];

/** Stay-open view of the pending screen. The live flow only shows it for 5 seconds. */
export default function PendingPreviewPage() {
  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <nav aria-label="Application steps" className="md:sticky md:top-8 md:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1">
          {STEPS.map((step, index) => (
            <li key={step.title} className="shrink-0">
              <div
                aria-current={step.current ? "step" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${
                  step.current ? "bg-accent font-medium text-accent-foreground" : ""
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    step.complete
                      ? "bg-primary text-primary-foreground"
                      : "border text-muted-foreground"
                  }`}
                >
                  {step.complete ? <CheckIcon className="size-3" /> : index + 1}
                </span>
                <span className="whitespace-nowrap">{step.title}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 hidden items-center gap-1.5 px-3 text-xs text-muted-foreground md:flex">
          <CircleIcon className="size-2 fill-current" />
          Progress saves automatically
        </p>
      </nav>
      <section className="min-w-0">
        <UnderReviewScreen />
      </section>
    </div>
  );
}
