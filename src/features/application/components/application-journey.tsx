"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckIcon, CircleIcon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { ASSUME_APPROVED_ON_SUBMIT } from "@/config/onboarding";
import type { FormValues } from "@/lib/onboarding-form";
import type { SubmerchantProgress } from "@/lib/payments/verification";
import { refreshProgress } from "../actions";
import { AccountStep } from "./account-step";
import { ApprovedScreen } from "./approved-screen";
import { BusinessVerificationStep } from "./business-verification-step";
import { DetailsStep } from "./details-step";
import { OwnerVerificationStep } from "./owner-verification-step";
import { SubmitStep } from "./submit-step";
import { UnderReviewScreen } from "./under-review-screen";

type StepId = "account" | "business" | "owners" | "details" | "submit";

type Step = { id: StepId; title: string; complete: boolean; hidden: boolean };

// Approval can also come straight from the provider (e.g. an admin unblocking
// the account), with or without a submitted application.
function isApproved(progress: SubmerchantProgress): boolean {
  return progress.approved || (progress.applicationSubmitted && ASSUME_APPROVED_ON_SUBMIT);
}

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 15;

// Mirrors the provider's onboarding step rules (owner verification only
// appears once the business itself is verified).
function buildSteps(progress: SubmerchantProgress): Step[] {
  const status = progress.verificationStatus;
  return [
    { id: "account", title: "Account creation", complete: true, hidden: false },
    {
      id: "business",
      title: "Business verification",
      complete: status === "approved" || status === "partialApproval",
      hidden: false,
    },
    {
      id: "owners",
      title: "Business owner verification",
      complete: status === "approved",
      hidden: status !== "partialApproval" && status !== "approved",
    },
    {
      id: "details",
      title: "Onboarding details",
      complete: progress.onboardingFormSubmitted,
      hidden: false,
    },
    {
      id: "submit",
      title: "Submit application",
      complete: progress.applicationSubmitted || progress.approved,
      hidden: false,
    },
  ];
}

function firstIncompleteStep(progress: SubmerchantProgress): StepId {
  const steps = buildSteps(progress).filter((step) => !step.hidden);
  return steps.find((step) => !step.complete)?.id ?? "submit";
}

// A brand-new application opens on the welcome step; returning visits resume where they left off.
function initialStep(progress: SubmerchantProgress): StepId {
  if (progress.applicationSubmitted || progress.approved) return "submit";
  if (progress.verificationStatus === "pending" && !progress.onboardingFormSubmitted)
    return "account";
  return firstIncompleteStep(progress);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ApplicationJourney({
  initialProgress,
  initialValues,
}: {
  initialProgress: SubmerchantProgress;
  initialValues: FormValues;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [stepId, setStepId] = useState<StepId>(() => initialStep(initialProgress));
  const [checking, setChecking] = useState(false);
  const steps = useMemo(() => buildSteps(progress), [progress]);
  const visibleSteps = steps.filter((step) => !step.hidden);

  const goTo = (id: StepId) => {
    setStepId(id);
    window.scrollTo({ top: 0 });
  };

  const refresh = useCallback(async () => {
    const result = await refreshProgress();
    if (result.ok) setProgress(result.progress);
    return result.ok ? result.progress : undefined;
  }, []);

  // Verification results land a few seconds after the Persona flow closes.
  const waitForVerificationChange = useCallback(async () => {
    const before = progress.verificationStatus;
    const ownersBefore = progress.ownerInquiries.length;
    setChecking(true);
    try {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const next = await refresh();
        if (
          next &&
          (next.verificationStatus !== before || next.ownerInquiries.length !== ownersBefore)
        )
          return next;
        await sleep(POLL_INTERVAL_MS);
      }
    } finally {
      setChecking(false);
    }
  }, [progress.verificationStatus, progress.ownerInquiries.length, refresh]);

  const afterBusinessInquiry = async () => {
    const next = await waitForVerificationChange();
    if (next?.verificationStatus === "partialApproval") goTo("owners");
    else if (next?.verificationStatus === "approved") goTo("details");
  };

  const businessName = typeof initialValues.dba === "string" ? initialValues.dba : undefined;

  const content: Record<StepId, React.ReactNode> = {
    account: (
      <AccountStep
        progress={progress}
        businessName={businessName}
        onContinue={() => goTo(firstIncompleteStep(progress))}
      />
    ),
    business: (
      <BusinessVerificationStep
        progress={progress}
        checking={checking}
        onInquiryComplete={afterBusinessInquiry}
        onContinue={() => goTo(progress.verificationStatus === "approved" ? "details" : "owners")}
      />
    ),
    owners: (
      <OwnerVerificationStep
        progress={progress}
        checking={checking}
        onInquiryComplete={waitForVerificationChange}
        onRefresh={waitForVerificationChange}
        onContinue={() => goTo("details")}
      />
    ),
    details: (
      <DetailsStep
        initialValues={initialValues}
        alreadySubmitted={progress.onboardingFormSubmitted}
        locked={progress.applicationSubmitted}
        onSubmitted={(next) => {
          setProgress(next);
          goTo("submit");
        }}
      />
    ),
    submit: isApproved(progress) ? (
      <ApprovedScreen businessName={businessName} />
    ) : progress.applicationSubmitted ? (
      <UnderReviewScreen
        referenceId={progress.merchantId}
        onCheckStatus={async () => {
          await refresh();
        }}
      />
    ) : (
      <SubmitStep
        progress={progress}
        onGoToVerification={() =>
          goTo(progress.verificationStatus === "partialApproval" ? "owners" : "business")
        }
        onGoToDetails={() => goTo("details")}
        onBack={() => goTo("details")}
        onSubmitted={(next) => {
          setProgress(next);
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
