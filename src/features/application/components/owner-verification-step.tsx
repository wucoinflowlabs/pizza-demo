"use client";

import { useState } from "react";
import { CheckCircle2Icon, CopyIcon, Loader2Icon, RefreshCwIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OwnerInquiry, SubmerchantProgress } from "@/lib/payments/verification";
import { PersonaInquiry } from "./persona-inquiry";
import { StepHeader } from "./step-header";

function OwnerCard({ owner, onVerify }: { owner: OwnerInquiry; onVerify: () => void }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserIcon className="size-4 text-muted-foreground" />
          {owner.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onVerify}>Verify ID</Button>
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(owner.link);
            toast.success(`Link copied. Send it to ${owner.name} to complete their ID check.`);
          }}
        >
          <CopyIcon data-icon="inline-start" />
          Copy link to send to {owner.name}
        </Button>
      </CardContent>
    </Card>
  );
}

export function OwnerVerificationStep({
  progress,
  checking,
  onInquiryComplete,
  onRefresh,
  onContinue,
}: {
  progress: SubmerchantProgress;
  checking: boolean;
  onInquiryComplete: () => void;
  onRefresh: () => void;
  onContinue: () => void;
}) {
  const [active, setActive] = useState<OwnerInquiry>();
  const approved = progress.verificationStatus === "approved";

  const header = (
    <StepHeader
      eyebrow="Step 3 · Business owner verification"
      title="Verify your business owners"
      description="The owners of your business will need to verify with their IDs."
    />
  );

  if (active)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <PersonaInquiry
          key={active.inquiryId}
          inquiryId={active.inquiryId}
          sessionToken={active.sessionToken}
          onComplete={() => {
            setActive(undefined);
            onInquiryComplete();
          }}
        />
        <Button variant="ghost" className="self-start" onClick={() => setActive(undefined)}>
          Back to owners
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      {header}
      {approved ? (
        <Card>
          <CardContent className="flex items-start gap-3 text-sm">
            <CheckCircle2Icon className="mt-0.5 size-5 text-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">All owners verified</span>
              <span className="text-muted-foreground">Your business verification is complete.</span>
            </div>
          </CardContent>
        </Card>
      ) : checking ? (
        <Card>
          <CardContent className="flex items-center gap-3 text-sm">
            <Loader2Icon className="size-5 animate-spin text-primary" />
            Checking verification status…
          </CardContent>
        </Card>
      ) : progress.ownerInquiries.length ? (
        <div className="flex flex-col gap-3">
          {progress.ownerInquiries.map((owner) => (
            <OwnerCard key={owner.inquiryId} owner={owner} onVerify={() => setActive(owner)} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
            Owner verifications are being prepared or reviewed. Check again in a moment.
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCwIcon data-icon="inline-start" />
              Check again
            </Button>
          </CardContent>
        </Card>
      )}
      {approved && (
        <Button size="lg" className="self-end" onClick={onContinue}>
          Continue
        </Button>
      )}
    </div>
  );
}
