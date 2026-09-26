"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, Loader2Icon, RefreshCwIcon, SendIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StageState = "done" | "current" | "upcoming";

const STAGES: { label: string; sub: string; state: StageState }[] = [
  { label: "Submitted", sub: "Done", state: "done" },
  { label: "Under review", sub: "~3 business days", state: "current" },
  { label: "Approved & live", sub: "We'll email you", state: "upcoming" },
];

export function UnderReviewScreen({
  referenceId,
  onCheckStatus,
}: {
  referenceId: string;
  onCheckStatus: () => Promise<void>;
}) {
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date>();

  const check = async () => {
    setChecking(true);
    await onCheckStatus();
    setChecking(false);
    setCheckedAt(new Date());
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-3">
          <SendIcon className="size-8 text-primary" />
          <CardTitle className="font-heading text-2xl">Application submitted successfully!</CardTitle>
          <p className="text-muted-foreground">
            Our compliance team is reviewing your application. We may reach out if we need anything
            else.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ol className="grid gap-3 sm:grid-cols-3">
            {STAGES.map((stage) => (
              <li key={stage.label} className="flex items-center gap-2.5">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    stage.state === "done"
                      ? "bg-primary text-primary-foreground"
                      : stage.state === "current"
                        ? "border-2 border-primary text-primary"
                        : "border text-muted-foreground"
                  }`}
                >
                  {stage.state === "done" ? <CheckIcon className="size-3.5" /> : null}
                </span>
                <span className="flex flex-col text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{stage.sub}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Reference ID </span>
            <span className="font-mono">{referenceId}</span>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {checkedAt && !checking && (
          <span className="text-xs text-muted-foreground">
            Still under review · checked {checkedAt.toLocaleTimeString()}
          </span>
        )}
        <Button variant="outline" onClick={check} disabled={checking}>
          {checking ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" />
          )}
          Check status
        </Button>
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Sign in to merchant dashboard
        </Link>
      </div>
    </div>
  );
}
