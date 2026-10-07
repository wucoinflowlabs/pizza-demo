"use client";

import { useState, useTransition, type RefObject } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Loader2Icon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RefundReason } from "@/lib/payments/types";
import { refundPaymentAction } from "../payment-actions";
import type { PaymentDetail } from "../payment-detail";

const REASONS: { value: RefundReason; label: string }[] = [
  { value: "userCancellation", label: "Customer cancelled" },
  { value: "failedFulfillment", label: "Order couldn't be fulfilled" },
  { value: "buyerFraud", label: "Fraudulent purchase" },
  { value: "other", label: "Other" },
];

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** Dollars typed by the merchant → cents, or undefined when it isn't a usable amount. */
function toCents(value: string) {
  if (!/^\d+(\.\d{0,2})?$/.test(value.trim())) return undefined;
  const cents = Math.round(Number(value) * 100);
  return cents > 0 ? cents : undefined;
}

export function RefundDialog({
  detail,
  locationId,
  container,
  onRefunded,
}: {
  detail: PaymentDetail;
  /** The franchise store the payment belongs to. Omitted for a single store. */
  locationId?: string;
  container: RefObject<HTMLElement | null>;
  onRefunded: () => void;
}) {
  const remaining = detail.subtotalCents - detail.refundedCents;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<RefundReason>("userCancellation");
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();

  const partialCents = mode === "partial" ? toCents(amount) : undefined;
  const amountError =
    mode === "partial" && amount.trim() !== ""
      ? partialCents === undefined
        ? "Enter an amount like 12.50"
        : partialCents > remaining
          ? `At most ${money(remaining, detail.currency)} can be refunded`
          : undefined
      : undefined;
  const ready = mode === "full" || (partialCents !== undefined && !amountError);
  // A partial refund of the whole remaining amount is sent as a full refund.
  const sendCents = mode === "partial" && partialCents !== remaining ? partialCents : undefined;

  const confirm = () =>
    startTransition(async () => {
      const result = await refundPaymentAction({
        paymentId: detail.id,
        reason,
        partialCents: sendCents,
        location: locationId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Refund of ${money(sendCents ?? remaining, detail.currency)} sent. It can take a few minutes to show here.`,
      );
      setOpen(false);
      onRefunded();
    });

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMode("full");
      setAmount("");
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !pending && reset(next)}>
      <AlertDialog.Trigger
        disabled={!detail.refundable}
        title={detail.refundable ? "Refund this payment" : "Only settled payments with a balance left can be refunded"}
        aria-label="Refund this payment"
        className="rounded-md p-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
      >
        <RotateCcwIcon className="size-4" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Backdrop className="fixed inset-0 z-[60] bg-shop-ink/30 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-background p-5 text-sm shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div>
            <AlertDialog.Title className="font-heading text-lg font-semibold text-shop-ink">
              Refund this payment?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-1 text-muted-foreground">
              The customer gets the money back on their original payment method. This can&apos;t be undone.
            </AlertDialog.Description>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Reason</span>
            <Select
              items={REASONS}
              value={reason}
              onValueChange={(next) => next && setReason(next as RefundReason)}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="font-medium">Amount</span>
            <div role="group" aria-label="Refund amount" className="inline-flex w-fit rounded-lg bg-muted p-1 ring-1 ring-foreground/5">
              {(["full", "partial"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={pending}
                  aria-pressed={mode === option}
                  onClick={() => setMode(option)}
                  className={cn(
                    "rounded-md px-4 py-1.5 capitalize transition-colors",
                    mode === option
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            {mode === "partial" && (
              <>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    autoFocus
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    aria-label="Partial refund amount"
                    aria-invalid={!!amountError}
                    disabled={pending}
                    className="pl-6"
                  />
                </div>
                <span className={cn("text-xs", amountError ? "text-destructive" : "text-muted-foreground")}>
                  {amountError ?? `Up to ${money(remaining, detail.currency)}`}
                </span>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <AlertDialog.Close render={<Button type="button" variant="outline" disabled={pending} />}>
              Cancel
            </AlertDialog.Close>
            <Button type="button" onClick={confirm} disabled={!ready || pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" />}
              Refund {money(sendCents ?? remaining, detail.currency)}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
