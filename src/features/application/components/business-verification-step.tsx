"use client";

import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SubmerchantProgress } from "@/lib/payments/verification";
import { PersonaInquiry } from "./persona-inquiry";
import { StepHeader } from "./step-header";

export function BusinessVerificationStep({
  progress,
  checking,
  onInquiryComplete,
  onContinue,
}: {
  progress: SubmerchantProgress;
  checking: boolean;
  onInquiryComplete: () => void;
  onContinue: () => void;
}) {
  const verified =
    progress.verificationStatus === "approved" ||
    progress.verificationStatus === "partialApproval";

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 2 · Business verification"
        title="Verify your business"
        description="Provide information about your business such as incorporation documents and Tax ID Numbers."
      />
      {verified ? (
        <Card>
          <CardContent className="flex items-start gap-3">
            <CheckCircle2Icon className="mt-0.5 size-5 text-primary" />
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium">Business verified</span>
              <span className="text-muted-foreground">
                {progress.verificationStatus === "partialApproval"
                  ? "Next, each business owner verifies their identity."
                  : "Your business and owners are verified."}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : checking ? (
        <Card>
          <CardContent className="flex items-center gap-3 text-sm">
            <Loader2Icon className="size-5 animate-spin text-primary" />
            Checking your verification…
          </CardContent>
        </Card>
      ) : progress.businessInquiry ? (
        <PersonaInquiry
          key={progress.businessInquiry.inquiryId}
          inquiryId={progress.businessInquiry.inquiryId}
          sessionToken={progress.businessInquiry.sessionToken}
          onComplete={onInquiryComplete}
        />
      ) : (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Your verification is being reviewed. We&apos;ll update this page when it&apos;s done.
          </CardContent>
        </Card>
      )}
      {verified && (
        <Button size="lg" className="self-end" onClick={onContinue}>
          Continue
        </Button>
      )}
    </div>
  );
}
