import type { CoinflowPayment } from "@/lib/payments/types";

/** Display order. Also the order series are drawn and listed in the legend. */
export const PAYMENT_METHODS = [
  { key: "card", label: "Card", info: ["cardInfo"] },
  { key: "ach", label: "Bank (ACH)", info: ["bankTransferInfo"] },
  { key: "crypto", label: "Crypto", info: ["cryptoInfo"] },
  { key: "cashapp", label: "CashApp", info: ["cashAppInfo"] },
  { key: "paypal", label: "PayPal", info: ["paypalInfo"] },
  { key: "venmo", label: "Venmo", info: ["venmoInfo"] },
  { key: "other", label: "Other", info: ["pixInfo", "ibanInfo", "wireInfo"] },
] as const satisfies readonly {
  key: string;
  label: string;
  info: readonly (keyof CoinflowPayment)[];
}[];

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]["key"];

export type PaymentsDay = {
  /** YYYY-MM-DD in the shop's time zone. */
  date: string;
  cents: Partial<Record<PaymentMethodKey, number>>;
  counts: Partial<Record<PaymentMethodKey, number>>;
};

export type PaymentsSeries = {
  from: string;
  to: string;
  /** Methods with at least one payment in range, in display order. */
  methods: PaymentMethodKey[];
  days: PaymentsDay[];
  totalCents: number;
  totalCount: number;
};

/** Which method a payment used, that method's details, and its status. */
export function methodOf(payment: CoinflowPayment): {
  key: PaymentMethodKey;
  info?: Record<string, unknown>;
  status?: string;
} {
  for (const method of PAYMENT_METHODS) {
    for (const field of method.info) {
      const info = payment[field];
      if (info && typeof info === "object") {
        return { key: method.key, info, status: info.status };
      }
    }
  }
  return { key: "other" };
}

function dateIn(timeZone: string, at: Date) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/**
 * Settled payments per method per day, for the `days` days ending today in
 * `timeZone`. Every day is present, so quiet days plot as zero.
 */
export function buildPaymentsSeries(
  payments: CoinflowPayment[],
  { days, timeZone, now = new Date() }: { days: number; timeZone: string; now?: Date },
): PaymentsSeries {
  const to = dateIn(timeZone, now);
  const from = addDays(to, -(days - 1));
  const byDate = new Map<string, PaymentsDay>();
  for (let offset = 0; offset < days; offset++) {
    const date = addDays(from, offset);
    byDate.set(date, { date, cents: {}, counts: {} });
  }

  const seen = new Set<PaymentMethodKey>();
  let totalCents = 0;
  let totalCount = 0;
  for (const payment of payments) {
    const { key, status } = methodOf(payment);
    // The request already filters by status; this guards against rows it lets through.
    if (status && status !== "SETTLED") continue;
    const created = new Date(payment.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const day = byDate.get(dateIn(timeZone, created));
    if (!day) continue;

    const cents = payment.totals?.subtotal?.cents ?? 0;
    day.cents[key] = (day.cents[key] ?? 0) + cents;
    day.counts[key] = (day.counts[key] ?? 0) + 1;
    seen.add(key);
    totalCents += cents;
    totalCount += 1;
  }

  return {
    from,
    to,
    methods: PAYMENT_METHODS.map((method) => method.key).filter((key) => seen.has(key)),
    days: [...byDate.values()],
    totalCents,
    totalCount,
  };
}
