"use client";

import { useState, useTransition } from "react";
import { AlertCircleIcon, ArrowRightIcon, CheckCircle2Icon, CircleAlertIcon, Loader2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SubmerchantProgress } from "@/lib/payments/verification";
import { submitApplication } from "../actions";
import { StepHeader } from "./step-header";

type Task = { id: string; title: string; description: string; onFix: () => void };

export function SubmitStep({
  progress,
  onGoToVerification,
  onGoToDetails,
  onBack,
  onSubmitted,
}: {
  progress: SubmerchantProgress;
  onGoToVerification: () => void;
  onGoToDetails: () => void;
  onBack: () => void;
  onSubmitted: (progress: SubmerchantProgress) => void;
}) {
  const [error, setError] = useState<string>();
  const [submitting, startSubmit] = useTransition();
  // Same readiness rules the provider enforces before an application can be submitted.
  const tasks: Task[] = [];
  if (progress.verificationStatus !== "approved")
    tasks.push({
      id: "verification",
      title: "Finish business & owner verification",
      description: "Verify your business and confirm every owner has completed their ID check.",
      onFix: onGoToVerification,
    });
  if (!progress.onboardingFormSubmitted)
    tasks.push({
      id: "details",
      title: "Complete onboarding details",
      description: "Industry and business model questions are incomplete.",
      onFix: onGoToDetails,
    });
  const ready = tasks.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 5 · Submit application"
        title="Review & submit"
        description={
          ready
            ? "A quick check before our compliance team reviews. Everything looks complete — submit whenever you're ready."
            : "A quick check before our compliance team reviews. Clear the outstanding tasks below, then submit."
        }
      />

      {ready ? (
        <Card>
          <CardContent className="flex items-start gap-3">
            <CheckCircle2Icon className="mt-0.5 size-5 text-primary" />
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium">Ready to submit</span>
              <span className="text-muted-foreground">
                Your business and owners are verified and your onboarding details are complete.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <div className="border-b px-4 py-3 text-sm font-medium">
            {tasks.length} outstanding {tasks.length === 1 ? "task" : "tasks"}
          </div>
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={task.onFix}
              className="flex items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
            >
              <CircleAlertIcon className="size-4 shrink-0 text-primary" />
              <span className="flex flex-1 flex-col gap-0.5 text-sm">
                <span className="font-medium">{task.title}</span>
                <span className="text-muted-foreground">{task.description}</span>
              </span>
              <ArrowRightIcon className="size-4 text-muted-foreground" />
            </button>
          ))}
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="ml-auto"
          disabled={!ready || submitting}
          onClick={() =>
            startSubmit(async () => {
              setError(undefined);
              const result = await submitApplication();
              if (result.ok) onSubmitted(result.progress);
              else setError(result.message);
            })
          }
        >
          {submitting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </div>
  );
}
