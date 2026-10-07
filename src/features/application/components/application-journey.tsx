"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { CheckIcon, CircleIcon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { ASSUME_APPROVED_ON_SUBMIT } from "@/config/onboarding";
import type { FormValues } from "@/lib/onboarding-form";
import type { SubmerchantProgress } from "@/lib/payments/verification";
import { refreshProgress } from "../actions";
import { ApprovedScreen } from "./approved-screen";
import { BusinessVerificationStep } from "./business-verification-step";
import { DetailsStep } from "./details-step";
import { SubmitStep } from "./submit-step";
import { UnderReviewScreen } from "./under-review-screen";
import { SUBMIT_TO_APPROVAL_MS } from "@/features/operator/store-status";

type StepId = "details" | "business" | "submit";

type Step = { id: StepId; title: string; complete: boolean; hidden: boolean };

// An unblocked account is not approval on its own. Onboarding details have to
// be submitted first. After that, approval can come from the provider
// unblocking the account, or from the demo shortcut once the application is submitted.
function isApproved(progress: SubmerchantProgress): boolean {
  if (!progress.onboardingFormSubmitted) return false;
  return progress.approved || (progress.applicationSubmitted && ASSUME_APPROVED_ON_SUBMIT);
}

function holdKey(merchantId: string) {
  return `za-approval-hold:${merchantId}`;
}

/** Survives the route refresh that follows a server action, so the wait is not skipped. */
function storedHold(merchantId: string): number | undefined {
  try {
    const until = Number(sessionStorage.getItem(holdKey(merchantId)));
    if (!Number.isFinite(until) || until <= Date.now()) {
      sessionStorage.removeItem(holdKey(merchantId));
      return undefined;
    }
    return until;
  } catch {
    return undefined;
  }
}

function rememberHold(merchantId: string) {
  const until = Date.now() + SUBMIT_TO_APPROVAL_MS;
  try {
    sessionStorage.setItem(holdKey(merchantId), String(until));
  } catch {
    // Private browsing can reject storage; the in-memory timer still runs.
  }
  return until;
}

function clearHold(merchantId: string) {
  try {
    sessionStorage.removeItem(holdKey(merchantId));
  } catch {
    // Ignore storage failures.
  }
}

// Details first, then Persona business and owner verification, then submit.
function buildSteps(progress: SubmerchantProgress): Step[] {
  const verified = progress.verificationStatus === "approved";
  return [
    {
      id: "details",
      title: "Onboarding details",
      complete: progress.onboardingFormSubmitted,
      hidden: false,
    },
    {
      id: "business",
      title: "Business verification",
      complete: verified || progress.applicationSubmitted,
      hidden: false,
    },
    {
      id: "submit",
      title: "Submit application",
      complete: progress.applicationSubmitted,
      hidden: false,
    },
  ];
}

function initialStep(progress: SubmerchantProgress): StepId {
  // Accounts that finished before sandbox KYB are already unblocked. Resume
  // them on submit instead of opening verification.
  if (progress.applicationSubmitted || isApproved(progress)) return "submit";
  if (!progress.onboardingFormSubmitted) return "details";
  return "business";
}

export function ApplicationJourney({
  initialProgress,
  initialValues,
}: {
  initialProgress: SubmerchantProgress;
  initialValues: FormValues;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [stepId, setStepId] = useState<StepId>(() => initialStep(initialProgress));
  const [releaseApprovalAt, setReleaseApprovalAt] = useState<number>();
  const steps = useMemo(() => buildSteps(progress), [progress]);
  const visibleSteps = steps.filter((step) => !step.hidden);
  const approvalHeld = releaseApprovalAt !== undefined && releaseApprovalAt > Date.now();

  const beginReview = (merchantId: string) => {
    setReleaseApprovalAt(rememberHold(merchantId));
  };

  // A server-action refresh remounts this screen with an already-approved
  // account. Restore the wait before paint so approval does not flash early.
  useLayoutEffect(() => {
    const until = storedHold(progress.merchantId);
    if (until) setReleaseApprovalAt(until);
  }, [progress.merchantId]);

  useEffect(() => {
    if (!approvalHeld || releaseApprovalAt === undefined) return;
    const timer = window.setTimeout(() => {
      clearHold(progress.merchantId);
      setReleaseApprovalAt(undefined);
    }, releaseApprovalAt - Date.now());
    return () => window.clearTimeout(timer);
  }, [approvalHeld, releaseApprovalAt, progress.merchantId]);

  const goTo = (id: StepId) => {
    setStepId(id);
    window.scrollTo({ top: 0 });
  };

  const businessName = typeof initialValues.dba === "string" ? initialValues.dba : undefined;

  const content: Record<StepId, React.ReactNode> = {
    business: (
      <BusinessVerificationStep
        progress={progress}
        refresh={refreshProgress}
        onProgress={setProgress}
        onComplete={() => goTo("submit")}
      />
    ),
    details: (
      <DetailsStep
        initialValues={initialValues}
        alreadySubmitted={progress.onboardingFormSubmitted}
        locked={progress.applicationSubmitted}
        onSubmitted={(next) => {
          setProgress(next);
          goTo("business");
        }}
      />
    ),
    submit:
      progress.applicationSubmitted && isApproved(progress) && !approvalHeld ? (
        <ApprovedScreen businessName={businessName} merchantId={progress.merchantId} />
      ) : progress.applicationSubmitted || approvalHeld ? (
        <UnderReviewScreen />
      ) : (
      <SubmitStep
        progress={progress}
        onGoToVerification={() => goTo("business")}
        onGoToDetails={() => goTo("details")}
        onBack={() => goTo("business")}
        verificationComplete={progress.verificationStatus === "approved"}
        onSubmitted={(next) => {
          setProgress(next);
          beginReview(next.merchantId);
          window.scrollTo({ top: 0 });
        }}
      />
    ),
  };

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <nav aria-label="Application steps" className="md:sticky md:top-8 md:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1">
          {visibleSteps.map((step, index) => {
            const current = step.id === stepId;
            return (
              <li key={step.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(step.id)}
                  aria-current={current ? "step" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    current ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted"
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
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 hidden items-center gap-1.5 px-3 text-xs text-muted-foreground md:flex">
          <CircleIcon className="size-2 fill-current" />
          Progress saves automatically
        </p>
      </nav>
      <section className="min-w-0">{content[stepId]}</section>
      <Toaster theme="light" position="bottom-right" />
    </div>
  );
}
