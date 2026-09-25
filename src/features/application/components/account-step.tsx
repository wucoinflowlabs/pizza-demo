import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { brand } from "@/config/brand";
import type { SubmerchantProgress } from "@/lib/payments/verification";
import { StepHeader } from "./step-header";

export function AccountStep({
  progress,
  businessName,
  onContinue,
}: {
  progress: SubmerchantProgress;
  businessName?: string;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 1 · Account creation"
        title={`Welcome${businessName ? `, ${businessName}` : ""}`}
        description={`${brand.name} set up your account and filled in what we already know about your business. You'll verify your business and owners, then answer a few questions only you can answer.`}
      />
      <Card>
        <CardContent className="flex items-start gap-3">
          <CheckCircle2Icon className="mt-0.5 size-5 text-primary" />
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium">Account created</span>
            <span className="text-muted-foreground">
              {progress.accountEmail ? `${progress.accountEmail} · ` : ""}Account ID{" "}
              <span className="font-mono">{progress.merchantId}</span>
            </span>
          </div>
        </CardContent>
      </Card>
      <Button size="lg" className="self-end" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}
