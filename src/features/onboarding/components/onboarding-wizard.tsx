"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InfoIcon, XIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  STEPS,
  useOnboardingHydrated,
  useOnboardingStore,
  type StepId,
} from "../store";
import { AccountStep } from "./account-step";
import { ContactStep } from "./contact-step";
import { OnlinePresenceStep } from "./online-presence-step";
import { PaymentsStep } from "./payments-step";
import { ReviewStep } from "./review-step";

const STEP_COMPONENTS: Record<StepId, () => React.ReactNode> = {
  account: AccountStep,
  contact: ContactStep,
  onlinePresence: OnlinePresenceStep,
  payments: PaymentsStep,
  review: ReviewStep,
};

export function OnboardingWizard() {
  const router = useRouter();
  const hydrated = useOnboardingHydrated();
  const stepIndex = useOnboardingStore((state) => state.stepIndex);
  const submitted = useOnboardingStore((state) => !!state.submission);
  const notice = useOnboardingStore((state) => state.notice);
  const dismissNotice = useOnboardingStore((state) => state.dismissNotice);

  useEffect(() => {
    if (hydrated && submitted) router.replace("/onboarding/submitted");
  }, [hydrated, submitted, router]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stepIndex]);

  if (!hydrated || submitted)
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  const step = STEPS[stepIndex];
  const StepComponent = STEP_COMPONENTS[step.id];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">{step.title}</span>
          <span className="text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
        </div>
        <Progress
          value={((stepIndex + 1) / STEPS.length) * 100}
          aria-label="Application progress"
        />
      </div>
      {notice && (
        <Alert>
          <InfoIcon />
          <AlertDescription>{notice}</AlertDescription>
          <AlertAction>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss"
              onClick={dismissNotice}
            >
              <XIcon />
            </Button>
          </AlertAction>
        </Alert>
      )}
      <StepComponent key={step.id} />
    </div>
  );
}
