"use client";

import { useState, useTransition, type RefObject } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { HandCoinsIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tipAdjustAndCaptureAction } from "../payment-actions";
import type { PaymentDetail } from "../payment-detail";

const TIP_PERCENTS = [15, 18, 20] as const;
const MAX_TIP_CENTS = 100_000;

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** Dollars typed by the merchant → cents, or undefined when it isn't a usable amount. Blank is no tip. */
function toCents(value: string) {
  if (value.trim() === "") return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(value.trim())) return undefined;
  return Math.round(Number(value) * 100);
}

export function TipAdjustDialog({
  detail,
  locationId,
  container,
  onAdjusted,
}: {
  detail: PaymentDetail;
  /** The franchise store the payment belongs to. Omitted for a single store. */
  locationId?: string;
  container: RefObject<HTMLElement | null>;
  onAdjusted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [percent, setPercent] = useState<number>();
  const [pending, startTransition] = useTransition();

  const authorizedCents = detail.subtotalCents;
  const tipCents = percent === undefined ? toCents(amount) : Math.round((authorizedCents * percent) / 100);
  const amountError =
    tipCents === undefined
      ? "Enter an amount like 5.00"
      : tipCents > MAX_TIP_CENTS
        ? `A tip can be at most ${money(MAX_TIP_CENTS, detail.currency)}`
        : undefined;
  const ready = tipCents !== undefined && !amountError;
  const captureCents = authorizedCents + (tipCents ?? 0);

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setAmount("");
      setPercent(undefined);
    }
  };

  const confirm = () =>
    startTransition(async () => {
      if (tipCents === undefined) return;
      const result = await tipAdjustAndCaptureAction({
        paymentId: detail.id,
        tipCents,
        currency: detail.currency,
        location: locationId,
      });
      if (!result.ok) {
        toast.error(result.error);
        // The tip is already on the authorization: reload the payment so a retry captures the new amount without re-adding it.
        if (result.stage === "capture") onAdjusted();
        return;
      }
      toast.success(
        `Captured ${money(result.capturedCents, detail.currency)}${
          tipCents > 0 ? ` (incl. ${money(tipCents, detail.currency)} tip)` : ""
        }. It can take a few minutes to show as settled.`,
      );
      setOpen(false);
      onAdjusted();
    });

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !pending && reset(next)}>
      <AlertDialog.Trigger
        title="Add a tip and capture this payment"
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground/80 ring-1 ring-foreground/10 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none"
      >
        <HandCoinsIcon className="size-4" />
        Tip Adjust
      </AlertDialog.Trigger>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Backdrop className="fixed inset-0 z-[60] bg-shop-ink/30 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-background p-5 text-sm shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div>
            <AlertDialog.Title className="font-heading text-lg font-semibold text-shop-ink">
              Adjust tip and capture
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-1 text-muted-foreground">
              The tip is added to the card authorization, then the payment is captured for the new total. This
              can&apos;t be undone.
            </AlertDialog.Description>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-medium">Tip</span>
            <div role="group" aria-label="Tip percentage" className="grid grid-cols-3 gap-2">
              {TIP_PERCENTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={pending}
                  aria-pressed={percent === option}
                  onClick={() => {
                    setAmount("");
                    setPercent((current) => (current === option ? undefined : option));
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 ring-1 transition-colors",
                    percent === option
                      ? "bg-shop-ink font-medium text-background ring-shop-ink"
                      : "text-muted-foreground ring-foreground/10 hover:text-foreground",
                  )}
                >
                  {option}%
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                autoFocus
                inputMode="decimal"
                value={percent === undefined ? amount : ((tipCents ?? 0) / 100).toFixed(2)}
                onChange={(event) => {
                  setPercent(undefined);
                  setAmount(event.target.value);
                }}
                placeholder="0.00"
                aria-label="Tip amount"
                aria-invalid={!!amountError}
                disabled={pending}
                className="pl-6"
              />
            </div>
            {amountError && <span className="text-xs text-destructive">{amountError}</span>}
          </div>

          <dl className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Authorized</dt>
              <dd className="tabular-nums">{money(authorizedCents, detail.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tip</dt>
              <dd className="tabular-nums">{ready ? money(tipCents, detail.currency) : "—"}</dd>
            </div>
            <div className="flex justify-between border-t border-foreground/10 pt-1.5 font-medium">
              <dt>Capture total</dt>
              <dd className="tabular-nums">{ready ? money(captureCents, detail.currency) : "—"}</dd>
            </div>
          </dl>

          <div className="flex justify-end gap-2">
            <AlertDialog.Close render={<Button type="button" variant="outline" disabled={pending} />}>
              Cancel
            </AlertDialog.Close>
            <Button type="button" onClick={confirm} disabled={!ready || pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" />}
              {tipCents ? `Add tip & capture ${money(captureCents, detail.currency)}` : `Capture ${money(captureCents, detail.currency)}`}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
