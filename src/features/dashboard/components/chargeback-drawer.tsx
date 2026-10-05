"use client";

import { useState, useTransition, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { InfoIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import type { Chargeback } from "../chargebacks";
import { acceptChargebackAction } from "../payment-actions";
import { ChargebackStatusPill, CopyableId } from "./payment-pills";

const PAYMENTS_PATH = "/dashboard/adora-pay/payments";

const ICON_BUTTON =
  "rounded-md p-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none";

const ACTION =
  "flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40";
const SECONDARY_ACTION = cn(ACTION, "bg-muted text-foreground hover:bg-foreground/10");
const PRIMARY_ACTION = cn(ACTION, "bg-shop-fill text-shop-on-fill hover:bg-shop-fill/90");

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** "10-05-26 09:53" in the shop's time zone. */
function shortDateTime(value: string | undefined, timeZone: string) {
  const at = value ? new Date(value) : undefined;
  if (!at || Number.isNaN(at.getTime())) return undefined;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.month}-${parts.day}-${parts.year} ${parts.hour}:${parts.minute}`;
}

/** "Oct 19, 2026 9:53 AM" in the shop's time zone. */
function longDateTime(value: string | undefined, timeZone: string) {
  const at = value ? new Date(value) : undefined;
  if (!at || Number.isNaN(at.getTime())) return undefined;
  return at
    .toLocaleString("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(" at ", " ");
}

/** A payments-page link for this chargeback's store. */
function paymentsHref(params: Record<string, string>, locationId?: string) {
  const query = new URLSearchParams(params);
  if (locationId) query.set("location", locationId);
  return `${PAYMENTS_PATH}?${query.toString()}`;
}

/** The dispute screen; a franchise owner's link names the store that owns the chargeback. */
function respondHref(paymentId: string, locationId?: string) {
  const query = locationId ? `?${new URLSearchParams({ location: locationId }).toString()}` : "";
  return `/dashboard/adora-pay/chargebacks/${encodeURIComponent(paymentId)}/respond${query}`;
}

function Row({ label, children }: { label: string; children?: ReactNode }) {
  // `value && <…>` hands over false or "" when there's nothing to show.
  const empty = children === undefined || children === null || children === false || children === "";
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-all text-foreground">
        {empty ? <span className="text-muted-foreground">—</span> : children}
      </dd>
    </div>
  );
}

function AcceptDialog({
  chargeback,
  container,
  onAccepted,
}: {
  chargeback: Chargeback;
  container: RefObject<HTMLElement | null>;
  onAccepted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const acceptable = chargeback.status === "Needs Response";

  const confirm = () =>
    startTransition(async () => {
      const result = await acceptChargebackAction({
        paymentId: chargeback.id,
        location: chargeback.location?.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Chargeback accepted. It can take a few minutes to update here.");
      setOpen(false);
      onAccepted();
    });

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialog.Trigger
        disabled={!acceptable}
        title={acceptable ? undefined : "Only chargebacks that still need a response can be accepted"}
        className={SECONDARY_ACTION}
      >
        Accept chargeback
      </AlertDialog.Trigger>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Backdrop className="fixed inset-0 z-[60] bg-shop-ink/30 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-background p-5 text-sm shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div>
            <AlertDialog.Title className="font-heading text-lg font-semibold text-shop-ink">
              Accept this chargeback?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-1 text-muted-foreground">
              You won&apos;t contest the dispute. The cardholder keeps{" "}
              {money(chargeback.totalCents, chargeback.currency)}
              {chargeback.feeCents ? ` and the ${money(chargeback.feeCents, chargeback.currency)} fee applies` : ""}.
              This can&apos;t be undone.
            </AlertDialog.Description>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close render={<Button type="button" variant="outline" disabled={pending} />}>
              Cancel
            </AlertDialog.Close>
            <Button type="button" variant="destructive" onClick={confirm} disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" />}
              Accept chargeback
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function ChargebackDrawer({
  chargeback,
  timeZone,
  container,
  onClose,
  onChanged,
}: {
  chargeback: Chargeback | undefined;
  timeZone: string;
  container: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** After an action that changes the chargeback, so the table can reload. */
  onChanged: () => void;
}) {
  const locationId = chargeback?.location?.id;

  return (
    <>
      <Dialog.Root
        open={chargeback !== undefined}
        onOpenChange={(open) => !open && onClose()}
        modal={false}
        // Clicking another row switches chargebacks instead of closing the drawer.
        disablePointerDismissal
      >
        <Dialog.Portal container={container}>
          <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto bg-background text-sm shadow-2xl ring-1 ring-foreground/10 outline-none sm:max-w-[32rem] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
            {chargeback && (
              <>
                <header className="sticky top-0 z-10 flex flex-col gap-1 border-b border-foreground/10 bg-background/95 px-5 pt-5 pb-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <Dialog.Title className="flex flex-wrap items-center gap-3 font-heading text-3xl font-semibold text-shop-ink">
                      {money(chargeback.totalCents, chargeback.currency)}
                      <ChargebackStatusPill status={chargeback.status} />
                    </Dialog.Title>
                    <Dialog.Close aria-label="Close" className={cn(ICON_BUTTON, "ring-1 ring-foreground/10")}>
                      <XIcon className="size-4" />
                    </Dialog.Close>
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
                    <CopyableId value={chargeback.id} label="payment ID" full />
                    <time dateTime={chargeback.loadedAt}>{shortDateTime(chargeback.loadedAt, timeZone)}</time>
                  </div>
                </header>

                <div className="flex flex-col gap-6 px-5 py-5">
                  <section className="flex flex-col gap-3">
                    <h3 className="font-medium text-shop-ink">Chargeback details</h3>
                    <div className="rounded-xl ring-1 ring-foreground/10">
                      <p className="border-b border-foreground/10 px-4 py-3 font-medium">Details</p>
                      <dl className="divide-y divide-foreground/5">
                        <Row label="Chargeback ID">{chargeback.chargebackId}</Row>
                        <Row label="ARN">{chargeback.arn}</Row>
                        {chargeback.location && (
                          <Row label="Location">
                            {chargeback.location.label}
                            {chargeback.location.city && `, ${chargeback.location.city}`}
                          </Row>
                        )}
                        <Row label="Loaded on">{shortDateTime(chargeback.loadedAt, timeZone)}</Row>
                        <Row label="Updated at">{shortDateTime(chargeback.updatedAt, timeZone)}</Row>
                        <Row label="Refunded status">{chargeback.refunded ? "Refunded" : "Not refunded"}</Row>
                        <Row label="Transaction date">{shortDateTime(chargeback.transactionAt, timeZone)}</Row>
                        <Row label="Customer">
                          {chargeback.customer && <CopyableId value={chargeback.customer} label="customer ID" />}
                        </Row>
                        <Row label="Reason code">
                          {chargeback.reasonCode && (
                            <span className="inline-flex items-center gap-1.5" title={chargeback.reasonDescription}>
                              {chargeback.reasonCode}
                              {chargeback.reasonDescription && (
                                <InfoIcon className="size-3.5 text-muted-foreground" aria-label={chargeback.reasonDescription} />
                              )}
                            </span>
                          )}
                        </Row>
                        <Row label="Chargeback fee">
                          {chargeback.feeCents !== undefined && money(chargeback.feeCents, chargeback.currency)}
                        </Row>
                        <Row label="Respond by">{longDateTime(chargeback.respondBy, timeZone)}</Row>
                      </dl>
                    </div>
                  </section>

                  <section className="flex flex-col gap-3">
                    <h3 className="font-medium text-shop-ink">Actions</h3>
                    <div className="flex flex-col gap-2.5">
                      <Link href={paymentsHref({ payment: chargeback.id }, locationId)} className={SECONDARY_ACTION}>
                        View payment
                      </Link>
                      {chargeback.customer ? (
                        <Link
                          href={paymentsHref({ customer: chargeback.customer }, locationId)}
                          className={SECONDARY_ACTION}
                        >
                          View customer
                        </Link>
                      ) : (
                        <span aria-disabled className={SECONDARY_ACTION}>
                          View customer
                        </span>
                      )}
                      <AcceptDialog chargeback={chargeback} container={container} onAccepted={onChanged} />
                      {chargeback.status === "Needs Response" ? (
                        <Link href={respondHref(chargeback.id, locationId)} className={PRIMARY_ACTION}>
                          Respond to chargeback
                        </Link>
                      ) : (
                        <span
                          aria-disabled
                          title="Only chargebacks that still need a response can be disputed"
                          className={PRIMARY_ACTION}
                        >
                          Respond to chargeback
                        </span>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <Toaster theme="light" position="bottom-right" />
    </>
  );
}
