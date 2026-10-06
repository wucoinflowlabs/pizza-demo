"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Loader2Icon, SendIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quoteRealPayoutAction, sendRealPayoutAction } from "../real-payout-actions";
import { money } from "./withdrawal-pills";

type Cents = { cents?: number };
type Quote = {
  venmo?: {
    fee?: Cents;
    finalSettlement?: Cents;
    expectedDeliveryDate?: string;
    accountIneligible?: boolean;
  };
  merchantFees?: Cents;
  totalMerchantDebit?: Cents;
};

const QUOTE_DEBOUNCE_MS = 500;

function parseCents(value: string) {
  const trimmed = value.trim();
  if (!/^\d*(\.\d{0,2})?$/.test(trimmed) || trimmed === "" || trimmed === ".") return undefined;
  const cents = Math.round(Number(trimmed) * 100);
  return cents > 0 ? cents : undefined;
}

type QuotedFor = { cents: number; quote: Quote };

export function SendPayoutDialog({
  open,
  onOpenChange,
  container,
  method,
  sandboxUserId,
  maxCents,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: RefObject<HTMLElement | null>;
  method: { title: string; subtitle: string };
  sandboxUserId: string;
  maxCents: number;
  onSent: () => void;
}) {
  const [amountInput, setAmountInput] = useState("");
  const [quoted, setQuoted] = useState<QuotedFor | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const cents = parseCents(amountInput);
  const overCap = cents !== undefined && cents > maxCents;
  const amountError =
    amountInput && cents === undefined
      ? "Enter a dollar amount like 1.00"
      : overCap
        ? `At most $${(maxCents / 100).toFixed(2)} per demo payout`
        : undefined;

  useEffect(() => {
    if (!open) return;
    setAmountInput("");
    setQuoted(null);
    setQuoting(false);
    setSending(false);
    setError(undefined);
    setIdempotencyKey(crypto.randomUUID());
  }, [open]);

  useEffect(() => {
    if (!open || cents === undefined || overCap) {
      setQuoted(null);
      setQuoting(false);
      return;
    }
    setQuoting(true);
    const handle = setTimeout(async () => {
      const result = await quoteRealPayoutAction({ sandboxUserId, cents });
      if (result.ok) {
        setQuoted({ cents, quote: result.quote });
        setError(undefined);
      } else {
        setError(result.error);
      }
      setQuoting(false);
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [cents, open, overCap, sandboxUserId]);

  const send = useCallback(async () => {
    if (cents === undefined || overCap) return;
    setSending(true);
    setError(undefined);
    const result = await sendRealPayoutAction({ sandboxUserId, cents, idempotencyKey });
    setSending(false);
    if (result.ok) {
      toast.success(`Sent ${money(cents)} to ${method.title}. Real Venmo payout queued.`);
      onSent();
      onOpenChange(false);
      return;
    }
    setError(result.error);
  }, [cents, idempotencyKey, method.title, onOpenChange, onSent, overCap, sandboxUserId]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/30 data-open:animate-in data-open:fade-in-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl bg-background p-6 text-sm shadow-2xl ring-1 ring-foreground/10 outline-none">
          <Dialog.Title className="font-heading text-lg font-semibold text-shop-ink">Send payout</Dialog.Title>
          <Dialog.Description className="text-muted-foreground">
            Sending to <span className="font-medium text-foreground">{method.title}</span> — {method.subtitle}.
          </Dialog.Description>
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-600/20">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              This fires a <strong>real</strong> Venmo payout from the production Coinflow account. Capped at
              {` $${(maxCents / 100).toFixed(2)}`} per send.
            </span>
          </div>
          <label className="flex flex-col gap-1.5 font-medium">
            Amount
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">$</span>
              <Input
                autoFocus
                inputMode="decimal"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder="0.00"
                aria-invalid={amountError ? true : undefined}
                className="pl-7"
              />
            </div>
            {amountError && <span className="text-xs text-destructive">{amountError}</span>}
          </label>
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 px-3 py-2.5 text-xs">
            {quoting && !quoted ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2Icon className="size-3.5 animate-spin" />
                Calculating fees…
              </span>
            ) : quoted ? (
              <>
                <QuoteLine label="Customer receives" value={money(quoted.quote.venmo?.finalSettlement?.cents ?? quoted.cents)} />
                <QuoteLine label="Customer fees" value={money(quoted.quote.venmo?.fee?.cents ?? 0)} />
                <QuoteLine label="Merchant fees" value={money(quoted.quote.merchantFees?.cents ?? 0)} />
                <div className="my-0.5 border-t border-foreground/10" />
                <QuoteLine label="Debited from your wallet" value={money(quoted.quote.totalMerchantDebit?.cents ?? quoted.cents)} emphasis />
                {quoted.quote.venmo?.expectedDeliveryDate && (
                  <p className="pt-0.5 text-[11px] text-muted-foreground">
                    Expected {quoted.quote.venmo.expectedDeliveryDate}
                  </p>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Enter an amount to see fees.</span>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className={cn("flex justify-end gap-2")}>
            <Dialog.Close render={<Button type="button" variant="outline" disabled={sending} />}>Cancel</Dialog.Close>
            <Button
              type="button"
              onClick={send}
              disabled={cents === undefined || overCap || sending || quoting}
              className="bg-shop-ink text-background hover:bg-shop-ink/90"
            >
              {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              Send {cents !== undefined && !overCap ? money(cents) : "payout"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function QuoteLine({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", emphasis ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>{value}</span>
    </div>
  );
}
