import type { CoinflowPayment } from "@/lib/payments/types";
import { toOrder, type OrderMethod } from "@/features/dashboard/orders";
import { PAYMENT_METHODS, type PaymentMethodKey } from "@/features/dashboard/payments-series";
import { dayIn } from "@/features/dashboard/withdraw-range";
import { formatBps, type ChargedRates, type FeeSchedule } from "./fee-schedule";

/** Payments whose funds reached the restaurant. Everything else is listed but not counted. */
const COUNTED_STATUSES = new Set(["SETTLED", "DEPOSITED"]);

/** Coinflow processing fees, in the order the statement lists them. Shared labels with the payment drawer. */
const PROCESSING_FEES = [
  { key: "creditCardFees", merchantKey: "merchantPaidCreditCardFees", label: "Card processing" },
  { key: "chargebackProtectionFees", merchantKey: "merchantPaidChargebackProtectionFees", label: "Chargeback protection" },
  { key: "gasFees", merchantKey: "merchantPaidGasFees", label: "Network gas" },
  { key: "fxFees", merchantKey: "merchantPaidFxFees", label: "FX" },
  { key: "networkFees", merchantKey: "merchantPaidNetworkFees", label: "Network" },
] as const;

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
  status: string;
  grossCents: number;
  /** Processing fees added on top for the diner. Shown for transparency; they don't touch the restaurant's money. */
  dinerFeesCents: number;
  /** Processing fees the restaurant absorbed. */
  processingCents: number;
  saasCents: number;
  royaltyCents: number;
  netCents: number;
};

/** A payment that didn't move money (failed, pending, refunded…). */
export type ExcludedLine = { id: string; createdAt: string; method: string; status: string; grossCents: number };

export type FeeLine = { label: string; basis: string; cents: number };

export type FeeGroup = {
  payee: "Coinflow" | "Adora" | "Franchisor";
  description: string;
  lines: FeeLine[];
  totalCents: number;
};

export type StatementTotals = {
  count: number;
  grossCents: number;
  dinerFeesCents: number;
  processingCents: number;
  saasCents: number;
  royaltyCents: number;
  hardwareCents: number;
  /** Everything deducted from gross. */
  deductionsCents: number;
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
  lines: StatementLine[];
  excluded: ExcludedLine[];
  totals: StatementTotals;
  fees: FeeGroup[];
  methods: { label: string; count: number; grossCents: number }[];
};

type Fields = Record<string, unknown>;

function cents(value: unknown) {
  const amount = (value as { cents?: unknown } | undefined)?.cents;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
}

function totalsOf(payment: CoinflowPayment) {
  return (payment.totals ?? {}) as Fields;
}

/** The SaaS and royalty rates stamped on the payment at checkout, if any. */
export function feeRatesOf(payment: CoinflowPayment): ChargedRates | undefined {
  const fees = ((payment as unknown as Fields).webhookInfo as Fields | undefined)?.fees as Fields | undefined;
  if (!fees || typeof fees.saasBps !== "number" || typeof fees.royaltyBps !== "number") return undefined;
  return { version: String(fees.version ?? ""), saasBps: fees.saasBps, royaltyBps: fees.royaltyBps };
}

/**
 * The marketplace fee Coinflow took from this payment's subtotal for Adora
 * (SaaS + royalty). Read from whatever totals field Coinflow reports it in;
 * otherwise derived from the rates stamped at checkout, which is the same
 * `feePercentage` Coinflow applied. Payments from before fees were turned on
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
  return Math.round((subtotal * (rates.saasBps + rates.royaltyBps)) / 10_000);
}

/** Splits the combined marketplace fee by the rates it was charged at, so the parts always add back up. */
function splitMarketplaceFee(feeCents: number, rates: Pick<ChargedRates, "saasBps" | "royaltyBps">) {
  const combined = rates.saasBps + rates.royaltyBps;
  const saasCents = combined === 0 ? 0 : Math.round((feeCents * rates.saasBps) / combined);
  return { saasCents, royaltyCents: feeCents - saasCents };
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

function methodGroup(method: OrderMethod): string {
  if (method.wallet === "apple-pay") return "Apple Pay";
  if (method.wallet === "google-pay") return "Google Pay";
  return PAYMENT_METHODS.find((option) => option.key === (method.key as PaymentMethodKey))?.label ?? "Other";
}

export function statementNumber(franchiseId: string, locationId: string, day: string) {
  return `ADORA-${franchiseId}-${locationId}-${day.replaceAll("-", "")}`.toUpperCase();
}

/** One location's money movement for one business day: what came in, what was taken, and what's left. */
export function buildDailyStatement({
  payments,
  schedule,
  franchise,
  location,
  day,
  timeZone,
  now = new Date(),
}: {
  payments: CoinflowPayment[];
  schedule: FeeSchedule;
  franchise: StatementFranchise;
  location: StatementLocation;
  day: string;
  timeZone: string;
  now?: Date;
}): DailyStatement {
  const lines: StatementLine[] = [];
  const excluded: ExcludedLine[] = [];
  const processingByLabel = new Map<string, number>();
  const methods = new Map<string, { count: number; grossCents: number }>();

  const onDay = payments
    .filter((payment) => dayIn(timeZone, new Date(payment.createdAt)) === day)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  for (const payment of onDay) {
    const order = toOrder(payment);
    const totals = totalsOf(payment);
    const status = order.status?.toUpperCase() ?? "UNKNOWN";
    const grossCents = cents(totals.subtotal);
    const method = methodLabel(order.method);

    if (!COUNTED_STATUSES.has(status)) {
      excluded.push({ id: payment.paymentId, createdAt: payment.createdAt, method, status, grossCents });
      continue;
    }

    let dinerFeesCents = 0;
    let processingCents = 0;
    for (const fee of PROCESSING_FEES) {
      const merchantPaid = cents(totals[fee.merchantKey]);
      dinerFeesCents += cents(totals[fee.key]);
      processingCents += merchantPaid;
      if (merchantPaid) processingByLabel.set(fee.label, (processingByLabel.get(fee.label) ?? 0) + merchantPaid);
    }

    const { saasCents, royaltyCents } = splitMarketplaceFee(
      marketplaceFeeCents(payment),
      feeRatesOf(payment) ?? schedule,
    );

    lines.push({
      id: payment.paymentId,
      createdAt: payment.createdAt,
      method,
      status,
      grossCents,
      dinerFeesCents,
      processingCents,
      saasCents,
      royaltyCents,
      netCents: grossCents - processingCents - saasCents - royaltyCents,
    });

    const group = methodGroup(order.method);
    const mix = methods.get(group) ?? { count: 0, grossCents: 0 };
    methods.set(group, { count: mix.count + 1, grossCents: mix.grossCents + grossCents });
  }

  const sum = (pick: (line: StatementLine) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const grossCents = sum((line) => line.grossCents);
  const processingCents = sum((line) => line.processingCents);
  const saasCents = sum((line) => line.saasCents);
  const royaltyCents = sum((line) => line.royaltyCents);
  const hardwareCents = schedule.hardwareDailyCents;
  const deductionsCents = processingCents + saasCents + royaltyCents + hardwareCents;

  const totals: StatementTotals = {
    count: lines.length,
    grossCents,
    dinerFeesCents: sum((line) => line.dinerFeesCents),
    processingCents,
    saasCents,
    royaltyCents,
    hardwareCents,
    deductionsCents,
    netCents: grossCents - deductionsCents,
  };

  const fees: FeeGroup[] = [
    {
      payee: "Coinflow",
      description:
        totals.dinerFeesCents > 0
          ? "Payment processing. Fees the diner paid at checkout are passed through and not deducted."
          : "Payment processing.",
      lines: [...processingByLabel].map(([label, amount]) => ({ label, basis: "Absorbed by restaurant", cents: amount })),
      totalCents: processingCents,
    },
    {
      payee: "Adora",
      description: "Software and hardware program. SaaS is netted by Coinflow on each payment.",
      lines: [
        { label: "Adora SaaS fee", basis: `${formatBps(schedule.saasBps)} of gross sales`, cents: saasCents },
        { label: "Hardware program", basis: "Flat daily, per location", cents: hardwareCents },
      ],
      totalCents: saasCents + hardwareCents,
    },
    {
      payee: "Franchisor",
      description: `Royalty to ${franchise.name}, netted by Coinflow on each payment and remitted by Adora.`,
      lines: [{ label: "Franchise royalty", basis: `${formatBps(schedule.royaltyBps)} of gross sales`, cents: royaltyCents }],
      totalCents: royaltyCents,
    },
  ];

  return {
    number: statementNumber(franchise.id, location.id, day),
    day,
    timeZone,
    generatedAt: now.toISOString(),
    franchise,
    location,
    schedule,
    lines,
    excluded,
    totals,
    fees,
    methods: [...methods].map(([label, mix]) => ({ label, ...mix })).sort((a, b) => b.grossCents - a.grossCents),
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
      dinerFeesCents: sum.dinerFeesCents + next.dinerFeesCents,
      processingCents: sum.processingCents + next.processingCents,
      saasCents: sum.saasCents + next.saasCents,
      royaltyCents: sum.royaltyCents + next.royaltyCents,
      hardwareCents: sum.hardwareCents + next.hardwareCents,
      deductionsCents: sum.deductionsCents + next.deductionsCents,
      netCents: sum.netCents + next.netCents,
    }),
    {
      count: 0,
      grossCents: 0,
      dinerFeesCents: 0,
      processingCents: 0,
      saasCents: 0,
      royaltyCents: 0,
      hardwareCents: 0,
      deductionsCents: 0,
      netCents: 0,
    },
  );
  return { rows: statements.map(({ location, totals }) => ({ location, totals })), totals };
}
