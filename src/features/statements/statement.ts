import type { CoinflowPayment } from "@/lib/payments/types";
import { toOrder, type OrderMethod } from "@/features/dashboard/orders";
import { PAYMENT_METHODS } from "@/features/dashboard/payments-series";
import { dayIn } from "@/features/dashboard/withdraw-range";
import type { ChargedRates, FeeSchedule, StatementCharges } from "./fee-schedule";

/** Payments whose funds reached the restaurant. Everything else is left off the statement. */
const COUNTED_STATUSES = new Set(["SETTLED", "DEPOSITED"]);

export type StatementLocation = {
  id: string;
  label: string;
  city: string;
  state: string;
  submerchantId: string;
};

export type StatementFranchise = { id: string; name: string };

/** One counted payment and what was taken from it. */
export type StatementLine = {
  id: string;
  createdAt: string;
  method: string;
  grossCents: number;
  /** Adora's take rate, netted by Coinflow. */
  processingCents: number;
  /** The franchise owner's share. Statement only; Coinflow never sees it. */
  franchiseFeeCents: number;
  netCents: number;
};

export type StatementTotals = {
  count: number;
  grossCents: number;
  processingCents: number;
  franchiseFeeCents: number;
  /** Monthly SaaS fee, prorated to the day. */
  saasCents: number;
  /** Monthly per-device hardware fee, prorated to the day. */
  hardwareCents: number;
  netCents: number;
};

export type DailyStatement = {
  number: string;
  /** Business date, YYYY-MM-DD in `timeZone`. */
  day: string;
  timeZone: string;
  generatedAt: string;
  franchise: StatementFranchise;
  location: StatementLocation;
  schedule: FeeSchedule;
  charges: StatementCharges;
  lines: StatementLine[];
  totals: StatementTotals;
};

type Fields = Record<string, unknown>;

function cents(value: unknown) {
  const amount = (value as { cents?: unknown } | undefined)?.cents;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
}

function totalsOf(payment: CoinflowPayment) {
  return (payment.totals ?? {}) as Fields;
}

/** The SaaS and royalty rates stamped on the payment at checkout, if any. Older payments had no flat fee. */
export function feeRatesOf(payment: CoinflowPayment): ChargedRates | undefined {
  const fees = ((payment as unknown as Fields).webhookInfo as Fields | undefined)?.fees as Fields | undefined;
  if (!fees || typeof fees.saasBps !== "number" || typeof fees.royaltyBps !== "number") return undefined;
  return {
    version: String(fees.version ?? ""),
    saasBps: fees.saasBps,
    saasFixedCents: typeof fees.saasFixedCents === "number" ? fees.saasFixedCents : 0,
    royaltyBps: fees.royaltyBps,
  };
}

/**
 * The marketplace fee Coinflow took from this payment's subtotal for Adora
 * (SaaS + royalty). Read from whatever totals field Coinflow reports it in;
 * otherwise derived from the rates stamped at checkout, which are the same
 * `feePercentage` and `fixedFee` Coinflow applied. Payments from before fees were turned on
 * carry neither and owe nothing.
 */
export function marketplaceFeeCents(payment: CoinflowPayment) {
  const totals = totalsOf(payment);
  for (const [key, value] of Object.entries(totals)) {
    if (/marketplace|seller/i.test(key)) return cents(value);
  }
  const rates = feeRatesOf(payment);
  if (!rates) return 0;
  const subtotal = cents(totals.subtotal);
  return Math.round((subtotal * (rates.saasBps + rates.royaltyBps)) / 10_000) + rates.saasFixedCents;
}

function methodLabel(method: OrderMethod) {
  if (method.wallet === "apple-pay") return "Apple Pay";
  if (method.wallet === "google-pay") return "Google Pay";
  const label = PAYMENT_METHODS.find((option) => option.key === method.key)?.label ?? "Other";
  if (method.key === "card" && (method.brand || method.last4)) {
    return [method.brand, method.last4 && `•${method.last4}`].filter(Boolean).join(" ");
  }
  return label;
}

function daysInMonth(day: string) {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function statementNumber(franchiseId: string, locationId: string, day: string) {
  return `ADORA-${franchiseId}-${locationId}-${day.replaceAll("-", "")}`.toUpperCase();
}

/** One location's money movement for one business day: what came in, what was taken, and what's left. */
export function buildDailyStatement({
  payments,
  schedule,
  charges,
  franchise,
  location,
  day,
  timeZone,
  now = new Date(),
}: {
  payments: CoinflowPayment[];
  schedule: FeeSchedule;
  charges: StatementCharges;
  franchise: StatementFranchise;
  location: StatementLocation;
  day: string;
  timeZone: string;
  now?: Date;
}): DailyStatement {
  const lines = payments
    .filter((payment) => dayIn(timeZone, new Date(payment.createdAt)) === day)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .flatMap((payment): StatementLine[] => {
      const order = toOrder(payment);
      if (!COUNTED_STATUSES.has(order.status?.toUpperCase() ?? "")) return [];
      const grossCents = cents(totalsOf(payment).subtotal);
      const processingCents = marketplaceFeeCents(payment);
      const franchiseFeeCents = Math.round((grossCents * charges.franchiseFeeBps) / 10_000);
      return [
        {
          id: payment.paymentId,
          createdAt: payment.createdAt,
          method: methodLabel(order.method),
          grossCents,
          processingCents,
          franchiseFeeCents,
          netCents: grossCents - processingCents - franchiseFeeCents,
        },
      ];
    });

  const sum = (pick: (line: StatementLine) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const days = daysInMonth(day);
  const saasCents = Math.round(charges.saasMonthlyCents / days);
  const hardwareCents = Math.round((charges.hardwareMonthlyCentsPerDevice * charges.devicesPerLocation) / days);

  return {
    number: statementNumber(franchise.id, location.id, day),
    day,
    timeZone,
    generatedAt: now.toISOString(),
    franchise,
    location,
    schedule,
    charges,
    lines,
    totals: {
      count: lines.length,
      grossCents: sum((line) => line.grossCents),
      processingCents: sum((line) => line.processingCents),
      franchiseFeeCents: sum((line) => line.franchiseFeeCents),
      saasCents,
      hardwareCents,
      netCents: sum((line) => line.netCents) - saasCents - hardwareCents,
    },
  };
}

export type FranchiseSummary = {
  rows: { location: StatementLocation; totals: StatementTotals }[];
  totals: StatementTotals;
};

/** One row per location plus a franchise-wide total, for the cover page. */
export function buildFranchiseSummary(statements: DailyStatement[]): FranchiseSummary {
  const totals = statements.reduce<StatementTotals>(
    (sum, { totals: next }) => ({
      count: sum.count + next.count,
      grossCents: sum.grossCents + next.grossCents,
      processingCents: sum.processingCents + next.processingCents,
      franchiseFeeCents: sum.franchiseFeeCents + next.franchiseFeeCents,
      saasCents: sum.saasCents + next.saasCents,
      hardwareCents: sum.hardwareCents + next.hardwareCents,
      netCents: sum.netCents + next.netCents,
    }),
    { count: 0, grossCents: 0, processingCents: 0, franchiseFeeCents: 0, saasCents: 0, hardwareCents: 0, netCents: 0 },
  );
  return { rows: statements.map(({ location, totals }) => ({ location, totals })), totals };
}
