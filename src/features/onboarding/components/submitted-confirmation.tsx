"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { brand } from "@/config/brand";
import { resetApplication } from "../actions";
import { useOnboardingHydrated, useOnboardingStore } from "../store";

const NEXT_STEPS = [
  "Our team reviews your application, usually within 3 business days.",
  "We may email you if we need anything else.",
  "Once you're approved, you can start taking payments.",
];

export function SubmittedConfirmation() {
  const router = useRouter();
  const hydrated = useOnboardingHydrated();
  const submission = useOnboardingStore((state) => state.submission);
  const reset = useOnboardingStore((state) => state.reset);
  const [isResetting, startReset] = useTransition();

  useEffect(() => {
    if (hydrated && !submission) router.replace("/onboarding");
  }, [hydrated, submission, router]);

  if (!hydrated || !submission)
    return <div className="h-80 animate-pulse rounded-xl bg-muted" />;

  const startNewApplication = () =>
    startReset(async () => {
      await resetApplication();
      reset();
      router.push("/onboarding");
    });

  return (
    <Card>
      <CardHeader className="items-start gap-4">
        <CheckCircle2Icon className="size-10 text-primary" />
        <CardTitle className="text-2xl">Application received</CardTitle>
        <CardDescription className="text-base">
          Thanks{submission.businessName ? `, ${submission.businessName}` : ""}!
          Your application to accept payments with {brand.name} is in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {submission.referenceId && (
          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">Reference ID </span>
            <span className="font-mono font-medium">
              {submission.referenceId}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">What happens next</h3>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted-foreground">
            {NEXT_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          onClick={startNewApplication}
          disabled={isResetting}
        >
          Start a new application
        </Button>
      </CardFooter>
    </Card>
  );
}
