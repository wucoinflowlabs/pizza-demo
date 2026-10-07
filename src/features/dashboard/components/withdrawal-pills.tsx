"use client";

import {
  BadgeCheckIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CoinsIcon,
  CopyIcon,
  CreditCardIcon,
  DollarSignIcon,
  EuroIcon,
  LandmarkIcon,
  LoaderIcon,
  PoundSterlingIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  WalletIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import type { VerificationStatus, WithdrawSpeed } from "@/lib/payments/types";
import { CopyableId, Pill, humanize, shortId, useCopy } from "./payment-pills";

const RETURN_LABELS: Record<string, string> = {
  pending_return: "Returning…",
  return_in_progress: "Returning…",
  return_submitted: "Returning…",
  return_completed: "Returned",
};

export function WithdrawStatusPill({ status, returnStatus }: { status?: string; returnStatus?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const suffix = returnStatus && RETURN_LABELS[returnStatus] ? ` (${RETURN_LABELS[returnStatus]})` : "";
  const label = `${humanize(status)}${suffix}`;
  if (status === "completed") return <Pill tone="green" icon={CircleCheckIcon}>{label}</Pill>;
  if (status === "failed") return <Pill tone="red" icon={CircleXIcon}>{label}</Pill>;
  if (status === "in_review") return <Pill tone="amber" icon={TriangleAlertIcon}>{label}</Pill>;
  return <Pill tone="amber" icon={LoaderIcon}>{label}</Pill>;
}

function VenmoMark() {
  return <span className="text-[13px] leading-none font-black text-[#008CFF] italic">V</span>;
}

function PaypalMark() {
  return <span className="text-[13px] leading-none font-black text-[#003087] italic">P</span>;
}

const SPEEDS: Record<WithdrawSpeed, { label: string; tone: Parameters<typeof Pill>[0]["tone"]; icon?: LucideIcon }> = {
  asap: { label: "RTP", tone: "indigo", icon: ZapIcon },
  same_day: { label: "Same day", tone: "amber", icon: LandmarkIcon },
  standard: { label: "Standard", tone: "gray", icon: LandmarkIcon },
  card: { label: "Card", tone: "sky", icon: CreditCardIcon },
  venmo: { label: "Venmo", tone: "sky" },
  paypal: { label: "PayPal", tone: "indigo" },
  pix: { label: "PIX", tone: "lime", icon: LandmarkIcon },
  iban: { label: "IBAN", tone: "gray", icon: LandmarkIcon },
  wire: { label: "Wire", tone: "green", icon: LandmarkIcon },
  swift: { label: "SWIFT", tone: "gray", icon: LandmarkIcon },
  eft: { label: "EFT", tone: "gray", icon: LandmarkIcon },
  interac: { label: "Interac", tone: "amber", icon: LandmarkIcon },
  crypto: { label: "Crypto", tone: "gray", icon: CoinsIcon },
};

export function speedLabel(speed?: string) {
  if (!speed) return "Unknown";
  return SPEEDS[speed as WithdrawSpeed]?.label ?? humanize(speed);
}

export function SpeedPill({ speed }: { speed?: string }) {
  if (!speed) return <span className="text-muted-foreground">—</span>;
  const known = SPEEDS[speed as WithdrawSpeed];
  if (!known) return <Pill tone="gray">{humanize(speed)}</Pill>;
  if (speed === "venmo" || speed === "paypal") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-600/20 ring-inset">
        {speed === "venmo" ? <VenmoMark /> : <PaypalMark />}
        {known.label}
      </span>
    );
  }
  return <Pill tone={known.tone} icon={known.icon}>{known.label}</Pill>;
}

export function BlockedPill({ blocked, override, reason }: { blocked: boolean; override?: boolean; reason?: string }) {
  if (blocked)
    return (
      <span title={reason}>
        <Pill tone="red" icon={CircleXIcon}>Blocked</Pill>
      </span>
    );
  if (override) return <Pill tone="indigo" icon={ShieldCheckIcon}>Never blocked</Pill>;
  return <Pill tone="green" icon={CircleCheckIcon}>Functional</Pill>;
}

export function verificationLabel(status?: VerificationStatus) {
  if (!status) return "Not found";
  if (status === "approved") return "Approved";
  if (status === "partial-approval") return "Partial approval";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

export function VerificationPill({ status, reasons = [] }: { status?: VerificationStatus; reasons?: string[] }) {
  const label = verificationLabel(status);
  if (status === "approved") return <Pill tone="green" icon={BadgeCheckIcon}>{label}</Pill>;
  if (status === "partial-approval") return <Pill tone="sky" icon={BadgeCheckIcon}>{label}</Pill>;
  if (status === "rejected")
    return (
      <span title={reasons.length ? reasons.join("\n") : undefined}>
        <Pill tone="red" icon={CircleXIcon}>{label}</Pill>
      </span>
    );
  if (status) return <Pill tone="amber" icon={LoaderIcon}>{label}</Pill>;
  return <Pill tone="gray" icon={ClockIcon}>{label}</Pill>;
}

const CURRENCY_ICONS: Record<string, { icon: LucideIcon; tone: Parameters<typeof Pill>[0]["tone"] }> = {
  USD: { icon: DollarSignIcon, tone: "lime" },
  EUR: { icon: EuroIcon, tone: "indigo" },
  GBP: { icon: PoundSterlingIcon, tone: "red" },
};

export function CurrencyChip({ currency }: { currency: string }) {
  const known = CURRENCY_ICONS[currency];
  return <Pill tone={known?.tone ?? "gray"} icon={known?.icon}>{currency}</Pill>;
}

/** A withdrawer's id: a user id or wallet, as a rounded chip that copies on click. */
export function WithdrawerId({ value, isUser }: { value?: string; isUser: boolean }) {
  const { copied, copy } = useCopy();
  if (!value) return <span className="text-muted-foreground">—</span>;
  const Icon = isUser ? UserRoundIcon : WalletIcon;
  return (
    <button
      type="button"
      title={value}
      onClick={(event) => {
        event.stopPropagation();
        copy(value);
      }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] font-medium ring-1 ring-foreground/10 ring-inset transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none"
    >
      <Icon className="size-3.5 shrink-0 fill-current text-foreground/60" />
      <span className="truncate tabular-nums">{shortId(value)}</span>
      {copied && <CheckIcon className="size-3 text-emerald-600" />}
    </button>
  );
}

export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** Coinflow's `inq_…ChKB` style: first and last four characters. */
export function shortKey(value: string) {
  return value.length < 9 ? value : `${value.slice(0, 4)}…${value.slice(-4)}`;
}

/** Full text with a copy button, truncated to its column. */
export function CopyText({
  value,
  label,
  mono,
  copyValue,
}: {
  value?: string;
  label: string;
  mono?: boolean;
  /** Overrides what gets copied. Useful when the shown value is a shortened form. */
  copyValue?: string;
}) {
  const { copied, copy } = useCopy();
  if (!value) return <span className="text-muted-foreground">—</span>;
  const target = copyValue ?? value;
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
      <span title={target} className={cn("truncate", mono && "font-mono text-xs")}>
        {value}
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          copy(target);
        }}
        aria-label={`Copy ${label}`}
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none"
      >
        {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
      </button>
    </span>
  );
}

/** `MM-DD-YY HH:mm`, the dashboard's compact local timestamp. */
export function compactDate(iso: string | undefined, timeZone: string) {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.month}-${parts.day}-${parts.year} ${parts.hour}:${parts.minute}`;
}


/** Compact pills for the staff table's "Payout methods" column. */
export function PayoutMethodChips({ methods }: { methods: { kind: string; label: string }[] }) {
  if (methods.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {methods.map((method) => (
        <PayoutMethodChip key={method.kind + method.label} kind={method.kind} label={method.label} />
      ))}
    </span>
  );
}

function PayoutMethodChip({ kind, label }: { kind: string; label: string }) {
  if (kind === "venmo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-600/20 ring-inset">
        <span className="text-[11px] leading-none font-black text-[#008CFF] italic">V</span>
        {label}
      </span>
    );
  }
  if (kind === "paypal") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-600/20 ring-inset">
        <span className="text-[11px] leading-none font-black text-[#003087] italic">P</span>
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-foreground/10 ring-inset">
      {label}
    </span>
  );
}
