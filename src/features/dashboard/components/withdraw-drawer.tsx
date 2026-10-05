"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CircleAlertIcon, ScrollTextIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WithdrawDetail } from "../withdrawals";
import { CopyableId } from "./payment-pills";
import { CopyText, SpeedPill, WithdrawStatusPill, money } from "./withdrawal-pills";

const ICON_BUTTON =
  "rounded-md p-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none";

function KvRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-foreground">{children}</span>
    </div>
  );
}

function phone(value: string) {
  const digits = value.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value;
}

function FeeGroup({
  label,
  total,
  lines,
  currency,
}: {
  label: string;
  total: number;
  lines: [string, number][];
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-3">
      <div className="flex justify-between font-medium text-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{money(total, currency)}</span>
      </div>
      {lines.map(([name, cents]) => (
        <div key={name} className="flex justify-between pl-4 text-xs text-muted-foreground">
          <span>{name}</span>
          <span className="tabular-nums">{money(cents, currency)}</span>
        </div>
      ))}
    </div>
  );
}

function DetailBody({ detail, timeZone }: { detail: WithdrawDetail; timeZone: string }) {
  const { fees, currency, recipient } = detail;
  const arrival = detail.expectedDeliveryDate ? new Date(detail.expectedDeliveryDate) : undefined;
  const paidBy = (fee: { user: number; merchant: number }): [string, number][] => [
    ["Paid by user", fee.user],
    ["Paid by merchant", fee.merchant],
  ];

  return (
    <div className="flex flex-col gap-6 px-5 pb-8">
      <section className="flex flex-col gap-2">
        <h3 className="px-1 font-heading font-semibold text-shop-ink">Withdrawal details</h3>
        <div className="flex flex-col divide-y divide-foreground/5 overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
          <div className="flex items-center gap-2 px-4 py-3">
            <SpeedPill speed={detail.speed} />
            <span className="font-medium text-foreground">Withdrawal details</span>
          </div>
          <KvRow label="Status">
            <WithdrawStatusPill status={detail.status} returnStatus={detail.returnStatus} />
          </KvRow>
          {recipient?.email && (
            <KvRow label="Recipient email">
              <CopyText value={recipient.email} label="recipient email" />
            </KvRow>
          )}
          {recipient?.phoneNumber && (
            <KvRow label="Recipient phone">
              <CopyText value={phone(recipient.phoneNumber)} label="recipient phone" />
            </KvRow>
          )}
          {recipient?.card && (
            <KvRow label="Card">
              {[recipient.card.type, recipient.card.last4 && `····${recipient.card.last4}`, recipient.card.bankName]
                .filter(Boolean)
                .join(" · ") || "—"}
            </KvRow>
          )}
          <KvRow label={detail.isUser ? "User ID" : "Wallet"}>
            <CopyableId value={detail.wallet} label="withdrawer ID" />
          </KvRow>
          {detail.blockchain && detail.blockchain !== "user" && (
            <KvRow label="Chain">{detail.blockchain.charAt(0).toUpperCase() + detail.blockchain.slice(1)}</KvRow>
          )}
          <KvRow label="Transaction">
            <CopyableId value={detail.transaction} label="transaction" />
          </KvRow>
          <KvRow label="Expected delivery (shop time)">
            {arrival && !Number.isNaN(arrival.getTime())
              ? arrival.toLocaleString("en-US", {
                  timeZone,
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "—"}
          </KvRow>
          {detail.exchangeRate !== 1 && <KvRow label="Exchange rate">1 USD = {detail.exchangeRate} {currency}</KvRow>}
        </div>
      </section>

      {detail.failureReason && (
        <section className="flex gap-3 rounded-xl bg-red-50/60 p-4 ring-1 ring-red-600/15">
          <CircleAlertIcon className="size-4 shrink-0 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Failure reason</p>
            <p className="text-xs text-red-700">{detail.failureReason}</p>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="px-1 font-heading font-semibold text-shop-ink">Fee breakdown</h3>
        <div className="flex flex-col divide-y divide-foreground/5 rounded-xl bg-white px-4 ring-1 ring-foreground/10">
          <FeeGroup
            label="Withdrawal amount"
            total={detail.amountCents}
            lines={[["Withdraw amount", detail.amountCents]]}
            currency={currency}
          />
          <FeeGroup
            label="Processing fees"
            total={fees.processing.user + fees.processing.merchant}
            lines={paidBy(fees.processing)}
            currency={currency}
          />
          <FeeGroup label="Gas fees" total={fees.gas.user + fees.gas.merchant} lines={paidBy(fees.gas)} currency={currency} />
          <FeeGroup label="FX fees" total={fees.fx.user + fees.fx.merchant} lines={paidBy(fees.fx)} currency={currency} />
          {fees.commission > 0 && (
            <FeeGroup
              label="Merchant commission"
              total={fees.commission}
              lines={[["Paid by user", fees.commission]]}
              currency={currency}
            />
          )}
          <FeeGroup
            label="Settlement amount"
            total={detail.settlementCents}
            lines={[["Received by user", detail.settlementCents]]}
            currency={currency}
          />
        </div>
      </section>
    </div>
  );
}

function LoadingBody() {
  return (
    <div className="flex flex-col gap-4 px-5">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function without<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

export function WithdrawDrawer({
  transferId,
  timeZone,
  container,
  onClose,
}: {
  transferId: string | null;
  timeZone: string;
  container: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<Record<string, WithdrawDetail>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detail = transferId ? details[transferId] : undefined;
  const error = transferId ? errors[transferId] : undefined;
  const needsFetch = !!transferId && !detail && !error;

  useEffect(() => {
    if (!transferId || !needsFetch) return;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/withdraws/${encodeURIComponent(transferId)}`, { signal: controller.signal });
        const body = await response.json();
        if (response.ok) setDetails((current) => ({ ...current, [transferId]: body as WithdrawDetail }));
        else setErrors((current) => ({ ...current, [transferId]: body.error ?? "This withdrawal couldn't be loaded." }));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[withdraws] detail failed", err);
        setErrors((current) => ({ ...current, [transferId]: "This withdrawal couldn't be loaded." }));
      }
    })();
    return () => controller.abort();
  }, [transferId, needsFetch]);

  const createdAt = detail ? new Date(detail.createdAt) : undefined;

  return (
    <Dialog.Root
      open={transferId !== null}
      onOpenChange={(open) => !open && onClose()}
      modal={false}
      disablePointerDismissal
    >
      <Dialog.Portal container={container}>
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto bg-background/95 text-sm shadow-2xl ring-1 ring-foreground/10 backdrop-blur-xl outline-none sm:max-w-[32rem] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
          <header className="sticky top-0 z-10 flex flex-col gap-1 bg-background/95 px-5 pt-5 pb-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="flex flex-wrap items-center gap-3 font-heading text-3xl font-semibold text-shop-ink">
                {detail ? money(detail.amountCents, detail.currency) : <Skeleton className="h-9 w-36" />}
                {detail && <WithdrawStatusPill status={detail.status} returnStatus={detail.returnStatus} />}
              </Dialog.Title>
              <Dialog.Close aria-label="Close" className={cn(ICON_BUTTON, "ring-1 ring-foreground/10")}>
                <XIcon className="size-4" />
              </Dialog.Close>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
              {transferId && <CopyableId value={transferId} label="transfer ID" full />}
              {createdAt && !Number.isNaN(createdAt.getTime()) && (
                <time dateTime={detail!.createdAt}>
                  {createdAt.toLocaleString("en-US", {
                    timeZone,
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                </time>
              )}
            </div>
          </header>
          {detail ? (
            <DetailBody detail={detail} timeZone={timeZone} />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center text-muted-foreground">
              <ScrollTextIcon className="size-6" />
              {error}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => transferId && setErrors((current) => without(current, transferId))}
              >
                Try again
              </Button>
            </div>
          ) : (
            <LoadingBody />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
