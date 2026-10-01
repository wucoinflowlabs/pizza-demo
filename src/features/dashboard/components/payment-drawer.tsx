"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  CheckIcon,
  CircleAlertIcon,
  CreditCardIcon,
  GlobeIcon,
  LinkIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  NfcIcon,
  ReceiptIcon,
  ScrollTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShieldXIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import type { PaymentDetail } from "../payment-detail";
import { AppleLogo, CopyableId, MethodPill, StatusPill, cardBrand, humanize, methodLabel, useCopy } from "./payment-pills";
import { RefundDialog } from "./refund-dialog";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** "US" → 🇺🇸. Anything that isn't a two-letter code gets no flag. */
function flag(country?: string) {
  if (!country || !/^[A-Za-z]{2}$/.test(country)) return "";
  return String.fromCodePoint(...[...country.toUpperCase()].map((char) => 0x1f1a5 + char.charCodeAt(0)));
}

function Section({
  icon: Icon,
  tone = "muted",
  title,
  children,
}: {
  icon: LucideIcon;
  tone?: "muted" | "good" | "bad" | "warn";
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="flex gap-3 rounded-xl p-4 ring-1 ring-foreground/10">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          tone === "good" && "bg-emerald-50 text-emerald-600",
          tone === "bad" && "bg-red-50 text-red-600",
          tone === "warn" && "bg-amber-50 text-amber-600",
          tone === "muted" && "bg-muted text-foreground/60",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 self-center">
        <p className="font-medium text-foreground">{title}</p>
        {children && <div className="text-xs leading-relaxed text-muted-foreground">{children}</div>}
      </div>
    </section>
  );
}

function Tile({
  title,
  icon: Icon,
  aside,
  children,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl p-3.5 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-foreground">{title}</p>
        {aside ?? (Icon && <Icon className="size-4 shrink-0 text-foreground/70" />)}
      </div>
      {children && <div className="text-xs leading-relaxed break-words text-muted-foreground">{children}</div>}
    </div>
  );
}

function CardVisual({ detail }: { detail: PaymentDetail }) {
  const { method, card } = detail;
  const brand = method.brand ? cardBrand(method.brand) : "Card";
  const number = `${card?.bin ?? "••••••"} xx xxxx ${method.last4 ?? "••••"}`;
  return (
    <div
      className="relative flex aspect-[1.7] flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-lg"
      style={{
        background:
          "radial-gradient(120% 90% at 85% 0%, rgba(255,255,255,0.10), transparent 60%), repeating-radial-gradient(circle at 30% 120%, rgba(255,255,255,0.05) 0 1px, transparent 1px 14px), #0b0b10",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm">
          <span className="font-extrabold tracking-tight text-sky-300 italic">{brand}</span>
          {method.wallet && (
            <span className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs">
              {method.wallet === "apple-pay" && <AppleLogo />}
              {methodLabel(method)}
            </span>
          )}
        </span>
        <NfcIcon className="size-6 text-white/90" />
      </div>
      <p className="font-mono text-xl tracking-[0.2em] sm:text-2xl">{number}</p>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{card?.holder ?? "Cardholder"}</p>
          {card?.address && <p className="truncate text-xs text-white/70">{card.address}</p>}
        </div>
        {card?.expiry && <p className="font-mono text-sm">{card.expiry}</p>}
      </div>
    </div>
  );
}

function MethodTile({ detail }: { detail: PaymentDetail }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-5 ring-1 ring-foreground/10">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">Paid with</p>
        <p className="font-heading text-lg font-semibold text-shop-ink">{methodLabel(detail.method)}</p>
        {detail.methodNote && <p className="text-xs text-muted-foreground">{detail.methodNote}</p>}
      </div>
      <MethodPill method={detail.method} />
    </div>
  );
}

function protectionTone(decision?: string) {
  if (!decision) return { tone: "muted" as const, icon: ShieldIcon };
  if (/^approved$/i.test(decision)) return { tone: "good" as const, icon: ShieldCheckIcon };
  if (/rejected|overridden/i.test(decision)) return { tone: "bad" as const, icon: ShieldXIcon };
  if (/pending/i.test(decision)) return { tone: "warn" as const, icon: ShieldAlertIcon };
  return { tone: "muted" as const, icon: ShieldIcon };
}

function threeDsTone(status?: string) {
  if (!status) return { tone: "muted" as const, icon: ShieldIcon };
  if (/rejected|error/i.test(status)) return { tone: "bad" as const, icon: ShieldXIcon };
  if (/challenge|required/i.test(status)) return { tone: "warn" as const, icon: ShieldAlertIcon };
  return { tone: "good" as const, icon: ShieldCheckIcon };
}

function DetailBody({ detail, timeZone }: { detail: PaymentDetail; timeZone: string }) {
  const protection = protectionTone(detail.protection.decision);
  const threeDs = threeDsTone(detail.threeDs.status);
  const { decline, ip, device, customer, card } = detail;

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
      {detail.method.key === "card" ? <CardVisual detail={detail} /> : <MethodTile detail={detail} />}

      {decline && (
        <Section
          icon={CircleAlertIcon}
          tone="bad"
          title={
            <>
              Declined{decline.code && <span className="font-mono"> · {decline.code}</span>}
              {decline.title && <> · {decline.title}</>}
            </>
          }
        >
          {decline.summary ?? decline.message}
          {(decline.remediation ?? decline.action) && (
            <p className="mt-1 text-foreground/80">{decline.remediation ?? decline.action}</p>
          )}
        </Section>
      )}

      <Section
        icon={protection.icon}
        tone={protection.tone}
        title={`Chargeback protection: ${detail.protection.decision ? humanize(detail.protection.decision) : "None"}`}
      >
        {detail.protection.description}
      </Section>

      <Section icon={threeDs.icon} tone={threeDs.tone} title={detail.threeDs.detail} />

      {ip && (
        <Section icon={GlobeIcon} tone={ip.flags.length ? "warn" : "muted"} title={`IP location: ${ip.address}`}>
          {[ip.place, ip.isp].filter(Boolean).join(", ") || "Location unavailable"}
          {ip.flags.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {ip.flags.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 ring-1 ring-amber-600/20 ring-inset"
                >
                  <TriangleAlertIcon className="size-3" />
                  {label}
                </span>
              ))}
            </span>
          )}
        </Section>
      )}

      <h3 className="mt-4 font-heading font-semibold text-shop-ink">Extra payment details</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          title={
            <>
              {customer.name ?? "Customer"} {flag(customer.country)}
            </>
          }
          icon={UserRoundIcon}
        >
          {customer.address && <p>{customer.address}</p>}
          {customer.id && (
            <p className="mt-0.5">
              <CopyableId value={customer.id} label="customer ID" />
            </p>
          )}
        </Tile>
        {customer.email && (
          <Tile title="Email" icon={MailIcon}>
            <p className="break-all">{customer.email}</p>
          </Tile>
        )}
        {device?.browser && (
          <Tile title={device.browser} icon={GlobeIcon}>
            {device.browserDetail}
          </Tile>
        )}
        {(device?.device || device?.os) && (
          <Tile title={device.device ? humanize(device.device) : "Device"} icon={MonitorSmartphoneIcon}>
            {device.os}
          </Tile>
        )}
        {card?.issuer && (
          <Tile title={card.issuer.segment ? humanize(card.issuer.segment) : "Card issuer"} icon={CreditCardIcon}>
            {[card.issuer.bank, card.issuer.country && `${card.issuer.country} ${flag(card.issuer.country)}`]
              .filter(Boolean)
              .join(" · ")}
            {(card.issuer.type || card.issuer.product) && (
              <p>{[card.issuer.type && humanize(card.issuer.type), card.issuer.product].filter(Boolean).join(" · ")}</p>
            )}
          </Tile>
        )}
        {detail.avs && (
          <Tile title="AVS response" aside={<CodeChip>{detail.avs.code}</CodeChip>}>
            {detail.avs.description}
          </Tile>
        )}
        {detail.cvv && (
          <Tile title="CVV response" aside={<CodeChip>{detail.cvv.code}</CodeChip>}>
            {detail.cvv.description}
          </Tile>
        )}
        {detail.statementDescriptor && (
          <Tile title="Statement descriptor" aside={<CodeChip>{detail.statementDescriptor}</CodeChip>}>
            What the customer sees on their bank statement, if their bank supports custom descriptors.
          </Tile>
        )}
        <Tile title="Amount" icon={ReceiptIcon}>
          <AmountBreakdown detail={detail} timeZone={timeZone} />
        </Tile>
      </div>
    </div>
  );
}

function CodeChip({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-foreground ring-1 ring-foreground/10">
      {children}
    </span>
  );
}

function AmountBreakdown({ detail, timeZone }: { detail: PaymentDetail; timeZone: string }) {
  const rows: [string, number][] = [
    ["Subtotal", detail.subtotalCents],
    ...detail.fees.map((fee): [string, number] => [fee.label, fee.cents]),
  ];
  return (
    <dl className="flex flex-col gap-0.5">
      {rows.map(([label, cents]) => (
        <div key={label} className="flex justify-between gap-2">
          <dt>{label}</dt>
          <dd className="tabular-nums">{money(cents, detail.currency)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-2 font-medium text-foreground">
        <dt>Total</dt>
        <dd className="tabular-nums">{money(detail.totalCents, detail.currency)}</dd>
      </div>
      {detail.refundedCents > 0 && (
        <div className="flex justify-between gap-2 text-red-700">
          <dt>
            Refunded
            {detail.refundedAt &&
              ` ${new Date(detail.refundedAt).toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric" })}`}
          </dt>
          <dd className="tabular-nums">−{money(detail.refundedCents, detail.currency)}</dd>
        </div>
      )}
    </dl>
  );
}

function LoadingBody() {
  return (
    <div className="flex flex-col gap-4 px-5">
      <Skeleton className="aspect-[1.7] rounded-2xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}

function without<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

const ICON_BUTTON =
  "rounded-md p-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30";

export function PaymentDrawer({
  paymentId,
  timeZone,
  container,
  onClose,
  onCustomer,
  onRefunded,
}: {
  paymentId: string | null;
  timeZone: string;
  container: RefObject<HTMLElement | null>;
  onClose: () => void;
  onCustomer: (customer: string) => void;
  onRefunded: () => void;
}) {
  const [details, setDetails] = useState<Record<string, PaymentDetail>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { copied, copy } = useCopy();

  const detail = paymentId ? details[paymentId] : undefined;
  const error = paymentId ? errors[paymentId] : undefined;
  const needsFetch = !!paymentId && !detail && !error;

  useEffect(() => {
    if (!paymentId || !needsFetch) return;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (response.ok) setDetails((current) => ({ ...current, [paymentId]: body as PaymentDetail }));
        else setErrors((current) => ({ ...current, [paymentId]: body.error ?? "This payment couldn't be loaded." }));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[payments] detail failed", err);
        setErrors((current) => ({ ...current, [paymentId]: "This payment couldn't be loaded." }));
      }
    })();
    return () => controller.abort();
  }, [paymentId, needsFetch]);

  const forget = (id: string) => {
    setDetails((current) => without(current, id));
    setErrors((current) => without(current, id));
  };

  const createdAt = detail ? new Date(detail.createdAt) : undefined;

  return (
    <>
      <Dialog.Root
        open={paymentId !== null}
        onOpenChange={(open) => !open && onClose()}
        modal={false}
        // Clicking another row switches payments instead of closing the drawer.
        disablePointerDismissal
      >
        <Dialog.Portal container={container}>
          <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto bg-background text-sm shadow-2xl ring-1 ring-foreground/10 outline-none sm:max-w-[34rem] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
            <header className="sticky top-0 z-10 flex flex-col gap-1 bg-background/95 px-5 pt-5 pb-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <Dialog.Title className="flex flex-wrap items-center gap-3 font-heading text-3xl font-semibold text-shop-ink">
                  {detail ? money(detail.subtotalCents, detail.currency) : <Skeleton className="h-9 w-36" />}
                  {detail && <StatusPill status={detail.status} />}
                </Dialog.Title>
                <Dialog.Close aria-label="Close" className={cn(ICON_BUTTON, "ring-1 ring-foreground/10")}>
                  <XIcon className="size-4" />
                </Dialog.Close>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
                  {paymentId && <CopyableId value={paymentId} label="payment ID" full />}
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
                <div className="flex shrink-0 items-center gap-1">
                  {detail && (
                    <RefundDialog
                      detail={detail}
                      container={container}
                      onRefunded={() => {
                        forget(detail.id);
                        onRefunded();
                      }}
                    />
                  )}
                  <button
                    type="button"
                    disabled={!detail?.customer.id}
                    onClick={() => detail?.customer.id && onCustomer(detail.customer.id)}
                    aria-label="Show this customer's payments"
                    title="Show this customer's payments"
                    className={ICON_BUTTON}
                  >
                    <UserRoundIcon className="size-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(globalThis.location.href)}
                    aria-label="Copy link to this payment"
                    title="Copy link to this payment"
                    className={ICON_BUTTON}
                  >
                    {copied ? <CheckIcon className="size-4 text-emerald-600" /> : <LinkIcon className="size-4" />}
                  </button>
                </div>
              </div>
            </header>
            {detail ? (
              <DetailBody detail={detail} timeZone={timeZone} />
            ) : error ? (
              <div className="flex flex-col items-center gap-3 px-5 py-16 text-center text-muted-foreground">
                <ScrollTextIcon className="size-6" />
                {error}
                <Button type="button" variant="outline" size="sm" onClick={() => paymentId && forget(paymentId)}>
                  Try again
                </Button>
              </div>
            ) : (
              <LoadingBody />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <Toaster theme="light" position="bottom-right" />
    </>
  );
}

