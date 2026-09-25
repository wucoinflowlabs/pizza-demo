"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { setupSettlement, type SettlementSetupState } from "../actions";

const PAYOUT_COPY: Record<
  SettlementSetupState,
  { icon: typeof CheckCircle2Icon; title: string; body: string; canRetry?: boolean }
> = {
  configured: {
    icon: CheckCircle2Icon,
    title: "Payouts are set up",
    body: `Your earnings settle through ${brand.name} automatically. There's nothing else to configure.`,
  },
  pending_approval: {
    icon: ClockIcon,
    title: "Payouts finish setting up after activation",
    body: `We'll connect your payouts through ${brand.name} as soon as your account is activated.`,
    canRetry: true,
  },
  conflict: {
    icon: TriangleAlertIcon,
    title: "Payouts need a quick review",
    body: `Your account already has a different payout destination. Contact ${brand.supportEmail} to change it.`,
  },
  unavailable: {
    icon: TriangleAlertIcon,
    title: "Payouts aren't available yet",
    body: `${brand.name} hasn't finished setting up payouts. We'll email you when it's ready.`,
  },
  error: {
    icon: TriangleAlertIcon,
    title: "We couldn't set up payouts",
    body: "Something went wrong. Please try again in a moment.",
    canRetry: true,
  },
};

// Approval can land a little after submission, so keep retrying for about a minute.
const RETRY_INTERVAL_MS = 5000;
const MAX_AUTOMATIC_ATTEMPTS = 12;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function PayoutSetupCard() {
  const [state, setState] = useState<SettlementSetupState>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let attempt = 1; attempt <= MAX_AUTOMATIC_ATTEMPTS && !cancelled; attempt++) {
        const result = await setupSettlement();
        const lastAttempt = attempt === MAX_AUTOMATIC_ATTEMPTS;
        if (cancelled) return;
        if (result.state !== "pending_approval" || lastAttempt) {
          setState(result.state);
          return;
        }
        await sleep(RETRY_INTERVAL_MS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = async () => {
    setState(undefined);
    setState((await setupSettlement()).state);
  };

  if (!state)
    return (
      <Card>
        <CardContent className="flex items-center gap-3 text-sm">
          <Loader2Icon className="size-5 animate-spin text-primary" />
          Setting up your payouts…
        </CardContent>
      </Card>
    );

  const { icon: Icon, title, body, canRetry } = PAYOUT_COPY[state];
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex flex-1 flex-col gap-0.5 text-sm">
          <span className="font-medium">{title}</span>
          <span className="text-muted-foreground">{body}</span>
        </div>
        {canRetry && (
          <Button variant="ghost" size="sm" onClick={retry}>
            <RefreshCwIcon data-icon="inline-start" />
            Check again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const NEXT_STEPS = [
  "Connect your ordering page or point of sale to start taking payments.",
  "Earnings settle automatically — track them from your dashboard.",
];

export function ApprovedScreen({ businessName }: { businessName?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-3">
          <BadgeCheckIcon className="size-10 text-primary" />
          <CardTitle className="font-heading text-2xl">You&apos;re approved!</CardTitle>
          <p className="text-muted-foreground">
            Our compliance team reviewed your application
            {businessName ? ` for ${businessName}` : ""} and approved it. You can start accepting
            payments with {brand.name}.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">What&apos;s next</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            {NEXT_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <PayoutSetupCard />
    </div>
  );
}
