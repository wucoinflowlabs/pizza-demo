"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CoinsIcon,
  CopyIcon,
  CreditCardIcon,
  LandmarkIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShieldXIcon,
  Undo2Icon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import type { OrderMethod } from "../orders";
import { PAYMENT_METHODS } from "../payments-series";

export function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

/** "SETTLED" → "Settled", "PENDING_REVIEW" → "Pending review". */
export function humanize(value: string) {
  const words = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function cardBrand(brand: string) {
  return brand.length <= 4 ? brand.toUpperCase() : humanize(brand);
}

export function methodLabel(method: OrderMethod) {
  if (method.wallet === "apple-pay") return "Apple Pay";
  if (method.wallet === "google-pay") return "Google Pay";
  if (method.key === "card") return method.brand ? cardBrand(method.brand) : "Card";
  return PAYMENT_METHODS.find((item) => item.key === method.key)?.label ?? "Other";
}

type Tone = "green" | "amber" | "red" | "gray" | "indigo" | "lime" | "sky";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  gray: "bg-white text-foreground/80 ring-foreground/10",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  lime: "bg-lime-50 text-lime-800 ring-lime-600/25",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export function Pill({ tone, icon: Icon, children }: { tone: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}

export function AppleLogo() {
  return (
    <svg viewBox="0 0 384 512" aria-hidden className="size-3.5 shrink-0 fill-current">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export function MethodPill({ method }: { method: OrderMethod }) {
  if (method.wallet === "apple-pay") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset", TONES.gray)}>
        <AppleLogo />
        Apple Pay
      </span>
    );
  }
  if (method.wallet === "google-pay") return <Pill tone="gray" icon={WalletIcon}>Google Pay</Pill>;
  if (method.key === "card") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset">
        {method.brand ? (
          <span className="font-extrabold tracking-tight text-blue-900 italic">{cardBrand(method.brand)}</span>
        ) : (
          <CreditCardIcon className="size-3.5" />
        )}
        {method.last4 ?? (method.brand ? null : "Card")}
      </span>
    );
  }
  const icon = method.key === "ach" ? LandmarkIcon : method.key === "crypto" ? CoinsIcon : WalletIcon;
  return <Pill tone="gray" icon={icon}>{methodLabel(method)}</Pill>;
}

export function StatusPill({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const label = humanize(status);
  if (/settled|complete|success|captured|paid/i.test(status))
    return <Pill tone="green" icon={CircleCheckIcon}>{label}</Pill>;
  if (/fail|declin|reject|error|chargeback|fraud/i.test(status))
    return <Pill tone="red" icon={CircleXIcon}>{label}</Pill>;
  if (/refund|cancel|void|expire|revers/i.test(status))
    return <Pill tone="gray" icon={Undo2Icon}>{label}</Pill>;
  return <Pill tone="amber" icon={ClockIcon}>{label}</Pill>;
}

export function ProtectionPill({ decision }: { decision?: string }) {
  if (!decision) return <span className="text-muted-foreground">—</span>;
  const label = humanize(decision);
  if (/approv|accept|protect|pass/i.test(decision))
    return <Pill tone="indigo" icon={ShieldCheckIcon}>{label}</Pill>;
  if (/reject|declin|den|fail/i.test(decision))
    return <Pill tone="red" icon={ShieldXIcon}>{label}</Pill>;
  return <Pill tone="gray" icon={ShieldIcon}>{label}</Pill>;
}

export function ThreeDsPill({ result }: { result?: string }) {
  if (!result) return <Pill tone="gray" icon={ShieldIcon}>N/A</Pill>;
  const label = humanize(result);
  if (/challeng/i.test(result)) return <Pill tone="lime" icon={ActivityIcon}>{label}</Pill>;
  if (/fail|reject|declin/i.test(result)) return <Pill tone="red" icon={ShieldXIcon}>{label}</Pill>;
  if (/frictionless|success|authenticat|pass|approv/i.test(result))
    return <Pill tone="sky" icon={ShieldCheckIcon}>{label}</Pill>;
  return <Pill tone="gray" icon={ShieldIcon}>{label}</Pill>;
}

export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      // Clipboard access can be blocked; the full value is still in the cell's title.
    }
  };
  return { copied, copy };
}

export function CopyableId({ value, label, full }: { value?: string; label: string; full?: boolean }) {
  const { copied, copy } = useCopy();
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span title={value} className={cn("tabular-nums", full && "break-all")}>
        {full ? value : shortId(value)}
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          copy(value);
        }}
        aria-label={`Copy ${label}`}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none"
      >
        {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
      </button>
    </span>
  );
}
