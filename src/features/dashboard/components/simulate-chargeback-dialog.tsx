"use client";

import { useState, useTransition, type RefObject } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Loader2Icon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { simulateChargebackAction } from "../payment-actions";
import type { PaymentDetail } from "../payment-detail";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** Sandbox only: opens a test chargeback on a settled card payment. */
export function SimulateChargebackDialog({
  detail,
  locationId,
  container,
  onSimulated,
}: {
  detail: PaymentDetail;
  /** The franchise store the payment belongs to. Omitted for a single store. */
  locationId?: string;
  container: RefObject<HTMLElement | null>;
  onSimulated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await simulateChargebackAction({ paymentId: detail.id, location: locationId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Chargeback opened. It can take a few minutes to show under Chargebacks.");
      setOpen(false);
      onSimulated();
    });

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialog.Trigger
        disabled={!detail.chargebackable}
        title={
          detail.chargebackable
            ? "Simulate a chargeback (sandbox)"
            : "Only settled card payments can be charged back"
        }
        aria-label="Simulate a chargeback"
        className="rounded-md p-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
      >
        <ShieldAlertIcon className="size-4" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Backdrop className="fixed inset-0 z-[60] bg-shop-ink/30 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-background p-5 text-sm shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div>
            <AlertDialog.Title className="font-heading text-lg font-semibold text-shop-ink">
              Simulate a chargeback?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-1 text-muted-foreground">
              Opens a test chargeback for {money(detail.totalCents, detail.currency)} on this payment, as if
              the cardholder disputed it with their bank. Sandbox only.
            </AlertDialog.Description>
          </div>

          <div className="flex justify-end gap-2">
            <AlertDialog.Close render={<Button type="button" variant="outline" disabled={pending} />}>
              Cancel
            </AlertDialog.Close>
            <Button type="button" variant="destructive" onClick={confirm} disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" />}
              Open chargeback
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
