"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheckIcon,
  CheckIcon,
  CopyIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { signInAsCurrentAccount } from "@/features/dashboard/actions";

function MerchantId({ merchantId }: { merchantId: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <p className="flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-muted px-4 py-3 text-base">
      <span className="min-w-0">
        <span className="text-muted-foreground">Your Merchant ID: </span>
        <span className="font-mono text-lg font-medium break-all text-foreground">{merchantId}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="size-10 shrink-0 text-muted-foreground"
        aria-label={copied ? "Merchant ID copied" : "Copy merchant ID"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(merchantId);
            setCopied(true);
          } catch {
            // Clipboard access can be blocked; the ID stays visible to copy by hand.
          }
        }}
      >
        {copied ? <CheckIcon className="size-5 text-emerald-600" /> : <CopyIcon className="size-5" />}
      </Button>
    </p>
  );
}

export function ApprovedScreen({
  businessName,
  merchantId,
}: {
  businessName?: string;
  merchantId: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-3">
          <BadgeCheckIcon className="size-10 text-emerald-600" />
          <CardTitle className="font-heading text-2xl">You&apos;re approved!</CardTitle>
          <p className="text-muted-foreground">
            Our compliance team reviewed your application
            {businessName ? ` for ${businessName}` : ""} and approved it. You can start accepting
            payments with {brand.name}.
          </p>
          <MerchantId merchantId={merchantId} />
        </CardHeader>
      </Card>
      <div className="flex flex-wrap items-center gap-3 self-start">
        <form action={signInAsCurrentAccount}>
          <Button type="submit" size="lg">
            Sign in to merchant dashboard
          </Button>
        </form>
        <Button type="button" variant="outline" size="lg">
          Onboard another shop
        </Button>
      </div>
    </div>
  );
}
