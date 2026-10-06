"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SendIcon, UserRoundIcon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { cashOutTipsAction } from "../tips/cash-out-action";
import type { SettledTip } from "../tips/queries";
import type { TipRecipient } from "../tips/recipient";
import { LocationPicker, type LocationOption } from "./table-controls";
import { compactDate, money } from "./withdrawal-pills";

type TipsSummary = {
  todayCents: number;
  weekCents: number;
  unpaidCents: number;
  lastPayout?: { atIso: string; cents: number };
};

export function TipsLedger({
  recipient,
  summary,
  recent,
  timeZone,
  locations,
  location,
  emptyState,
}: {
  recipient?: TipRecipient;
  summary?: TipsSummary;
  recent?: SettledTip[];
  timeZone: string;
  locations?: LocationOption[];
  location?: string;
  emptyState?: { title: string; body: ReactNode };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const cashOut = () =>
    startTransition(async () => {
      const result = await cashOutTipsAction({ locationId: location });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Cashed out ${money(result.cents)} to ${recipient?.venmo?.display ?? "Venmo"}`);
      setSent(true);
      router.refresh();
    });

  const canCashOut = (summary?.unpaidCents ?? 0) > 0 && Boolean(recipient?.venmo?.token);
  const noVenmo = !recipient?.venmo?.token;
  const picker = locations ? <LocationPicker locations={locations} value={location} /> : null;

  if (emptyState || !recipient || !summary || !recent) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-semibold text-shop-ink">Tips</h1>
          {picker}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <WalletIcon className="size-6" />
            <p className="font-medium text-foreground">{emptyState?.title ?? "Tips aren’t set up"}</p>
            <p>{emptyState?.body ?? "Pick a shop above to see its tip ledger."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold text-shop-ink">Tips</h1>
            <p className="text-sm text-muted-foreground">
              Every tip at checkout accrues to <span className="font-medium text-foreground">{recipient.name}</span>
              {recipient.venmo ? <> and settles to {recipient.venmo.display}.</> : ". No Venmo method linked yet."}
            </p>
          </div>
          {picker}
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground/70">
                <UserRoundIcon className="size-5 fill-current" />
              </span>
              <div>
                <CardTitle className="text-lg">{recipient.name}</CardTitle>
                <CardDescription>
                  {recipient.venmo ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[11px] leading-none font-black text-[#008CFF] italic">V</span>
                      {recipient.venmo.display}
                    </span>
                  ) : (
                    "No Venmo linked"
                  )}
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              disabled={!canCashOut || pending || sent}
              onClick={cashOut}
              className="bg-shop-ink text-background hover:bg-shop-ink/90"
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              {sent ? "Sent" : canCashOut ? `Cash out ${money(summary.unpaidCents)}` : noVenmo ? "No Venmo" : "No tips to cash out"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Today" cents={summary.todayCents} />
              <Stat label="This week" cents={summary.weekCents} />
              <Stat label="Unpaid balance" cents={summary.unpaidCents} emphasis />
            </div>
            {summary.lastPayout && (
              <p className="mt-4 text-xs text-muted-foreground">
                Last cash out: {money(summary.lastPayout.cents)} on {compactDate(summary.lastPayout.atIso, timeZone)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-shop-ink">Recent tipped orders</CardTitle>
            <CardDescription>Settled payments with a tip, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <WalletIcon className="size-5" />
                No tips yet. Tips show up here as soon as customers tip at checkout.
              </div>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {recent.map((tip) => (
                  <li key={tip.paymentId} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">Ticket #{tip.orderTicket}</p>
                      <p className="text-xs text-muted-foreground">
                        Paid {money(tip.totalCents)} · {compactDate(tip.settledAt, timeZone)}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums text-emerald-700">+{money(tip.tipCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster theme="light" position="bottom-right" />
    </>
  );
}

function Stat({ label, cents, emphasis }: { label: string; cents: number; emphasis?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl px-4 py-3 ring-1 ring-foreground/10 ${emphasis ? "bg-shop-ink/5" : "bg-muted/40"}`}>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`font-heading text-2xl font-semibold ${emphasis ? "text-shop-ink" : "text-foreground"}`}>
        {money(cents)}
      </span>
    </div>
  );
}
