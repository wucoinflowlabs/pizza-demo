"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { AlertCircleIcon, ArrowRightIcon, Loader2Icon, XIcon } from "lucide-react";
import { OnboardingFields } from "@/components/onboarding-form/onboarding-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { brand } from "@/config/brand";
import { ApprovedScreen } from "@/features/application/components/approved-screen";
import { BusinessVerificationStep } from "@/features/application/components/business-verification-step";
import { StepHeader } from "@/features/application/components/step-header";
import { SubmitStep } from "@/features/application/components/submit-step";
import { UnderReviewScreen } from "@/features/application/components/under-review-screen";
import { SUBMIT_TO_APPROVAL_MS } from "@/features/operator/store-status";
import {
  FIELD_DEFINITIONS,
  validateForm,
  withoutKey,
  type FieldErrors,
  type FieldValue,
  type FormValues,
} from "@/lib/onboarding-form";
import type { SubmerchantProgress } from "@/lib/payments/verification";
import {
  refreshAdoraPayProgress,
  startAdoraPayOnboarding,
  submitAdoraPayApplication,
} from "../actions";
import { FeatureCarousel } from "./feature-carousel";

type Stage = "page" | "intro" | "form" | "kyb" | "submit" | "pending" | "approved";

function stageFor(progress?: SubmerchantProgress): Stage {
  if (!progress) return "page";
  if (
    progress.applicationSubmitted ||
    (progress.onboardingFormSubmitted && progress.approved)
  )
    return "submit";
  if (!progress.onboardingFormSubmitted) return "form";
  return "kyb";
}

function scrollToField(name: string) {
  document
    .getElementById(`onboarding-field-${name}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function AdoraPaySignup({
  prefill,
  initialProgress,
  backdrop,
  openApplication = false,
}: {
  prefill: FormValues;
  initialProgress?: SubmerchantProgress;
  /** Shown behind the flow. Defaults to the marketing carousel. */
  backdrop?: ReactNode;
  /** Opens the onboarding application instead of the marketing page. */
  openApplication?: boolean;
}) {
  const [stage, setStage] = useState<Stage>(() =>
    openApplication && !initialProgress ? "form" : stageFor(initialProgress),
  );
  const [progress, setProgress] = useState(initialProgress);
  const [values, setValues] = useState(prefill);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();
  const [releaseAt, setReleaseAt] = useState<number>();
  const [pending, startSubmit] = useTransition();
  const prefilled = new Set(Object.keys(prefill));
  const businessName = typeof prefill.dba === "string" ? prefill.dba : undefined;

  useEffect(() => {
    if (stage !== "pending" || releaseAt === undefined) return;
    const timer = window.setTimeout(() => setStage("approved"), Math.max(0, releaseAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [stage, releaseAt]);

  const submitDetails = () => {
    setMessage(undefined);
    const clientErrors = validateForm({ values, requireAll: true });
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setMessage("Please answer the highlighted questions.");
      const first = FIELD_DEFINITIONS.find((field) => clientErrors[field.name]);
      if (first) scrollToField(first.name);
      return;
    }
    startSubmit(async () => {
      const result = await startAdoraPayOnboarding(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      setProgress(result.progress);
      setStage("kyb");
    });
  };

  const holdForApproval = (next: SubmerchantProgress) => {
    setProgress(next);
    setReleaseAt(Date.now() + SUBMIT_TO_APPROVAL_MS);
    setStage("pending");
  };

  return (
    <div className="relative min-h-[32rem] flex-1">
      {backdrop ? (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8">
          {stage === "page" && (
            <div className="flex flex-col gap-3 rounded-xl bg-shop-surface p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-heading font-semibold text-shop-ink">Finish setting up Adora Pay</p>
                <p className="text-sm text-muted-foreground">
                  Your application hasn&apos;t been sent for review yet.
                </p>
              </div>
              <Button type="button" className="gap-2" onClick={() => setStage(stageFor(progress))}>
                Continue onboarding
                <ArrowRightIcon />
              </Button>
            </div>
          )}
          {backdrop}
        </div>
      ) : (
        <FeatureCarousel />
      )}
      {stage === "page" && !backdrop && (
        <div className="absolute top-1/2 right-6 z-10 -translate-y-1/2 sm:right-10">
          <Button
            type="button"
            className="h-14 gap-2.5 rounded-full bg-white px-7 text-base font-semibold text-shop-ink shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)] transition duration-200 hover:scale-105 hover:bg-white hover:shadow-[0_24px_48px_-14px_rgba(0,0,0,0.6)] active:scale-[0.98] sm:h-20 sm:gap-3 sm:px-10 sm:text-xl"
            onClick={() => setStage("form")}
          >
            Enroll Now
            <ArrowRightIcon className="size-5 transition-transform duration-200 group-hover/button:translate-x-1 sm:size-6" />
          </Button>
        </div>
      )}
      {stage === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adora-pay-signup-title"
            className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-semibold text-shop-accent">Adora Pay</p>
              <button
                type="button"
                aria-label="Close sign up"
                onClick={() => setStage("page")}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <h1 id="adora-pay-signup-title" className="mt-1 font-heading text-2xl font-bold text-shop-ink">
              Sign up for Adora Pay
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn on card, wallet, and bank payments for {businessName ?? "this restaurant"}, inside
              the POS the shop already runs.
            </p>
            <Button type="button" className="mt-5 w-full" size="lg" onClick={() => setStage("form")}>
              Start onboarding
            </Button>
          </div>
        </div>
      )}
      {stage !== "page" && stage !== "intro" && (
        <div className="absolute inset-0 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adora-pay-form-title"
            className="my-4 flex max-h-[calc(100%-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-shop-accent">Adora Pay</p>
                <h2 id="adora-pay-form-title" className="font-heading text-xl font-bold text-shop-ink">
                  Merchant onboarding
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close onboarding form"
                onClick={() => setStage("page")}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
              {stage === "form" && (
                <>
                  <StepHeader
                    eyebrow="Step 1 · Onboarding details"
                    title="Onboarding Form"
                    description={`Provide information about your business model. ${brand.name} filled in what it already knows — review those answers and complete the rest.`}
                  />
                  <OnboardingFields
                    fields={FIELD_DEFINITIONS}
                    values={values}
                    errors={errors}
                    prefilledBadge="From Adora"
                    isPrefilled={(name) => prefilled.has(name) && name !== "payinMethods" && name !== "payoutMethods"}
                    onChange={(name: string, value: FieldValue) => {
                      setValues((current) => ({ ...current, [name]: value }));
                      setErrors((current) => withoutKey(current, name));
                    }}
                  />
                  {message && (
                    <Alert variant="destructive">
                      <AlertCircleIcon />
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setStage("intro")}>
                      Back
                    </Button>
                    <Button type="button" onClick={submitDetails} disabled={pending}>
                      {pending && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                      {pending ? "Submitting…" : "Submit"}
                    </Button>
                  </div>
                </>
              )}
              {stage === "kyb" && progress && (
                <BusinessVerificationStep
                  progress={progress}
                  refresh={refreshAdoraPayProgress}
                  onProgress={setProgress}
                  onComplete={() => setStage("submit")}
                />
              )}
              {stage === "submit" && progress && (
                <SubmitStep
                  progress={progress}
                  onGoToVerification={() => setStage("kyb")}
                  onGoToDetails={() => setStage("form")}
                  onBack={() => setStage("kyb")}
                  verificationComplete={progress.verificationStatus === "approved"}
                  onSubmitted={holdForApproval}
                  submitApplication={submitAdoraPayApplication}
                />
              )}
              {stage === "pending" && <UnderReviewScreen />}
              {stage === "approved" && (
                <ApprovedScreen
                  businessName={businessName}
                  email={typeof values.businessEmail === "string" ? values.businessEmail : undefined}
                />
              )}
            </div>
          </div>
        </div>
      )}
      <Toaster theme="light" position="bottom-right" />
    </div>
  );
}
