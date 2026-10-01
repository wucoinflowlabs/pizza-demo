import type { CoinflowPayment } from "@/lib/payments/types";
import { methodOf, type PaymentMethodKey } from "./payments-series";

export const ORDER_WINDOWS = [
  { key: "24h", label: "24h", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
] as const;

export type OrderWindow = (typeof ORDER_WINDOWS)[number]["key"];

export const DEFAULT_ORDER_WINDOW: OrderWindow = "30d";

export function parseOrderWindow(value: unknown): OrderWindow {
  return ORDER_WINDOWS.find((option) => option.key === value)?.key ?? DEFAULT_ORDER_WINDOW;
}

export type OrderMethod = {
  key: PaymentMethodKey;
  /** Set when a card payment came through a device wallet. */
  wallet?: "apple-pay" | "google-pay";
  /** Card network as the provider sends it, e.g. "VISA". */
  brand?: string;
  last4?: string;
};

/** One payment, flattened to what the Orders table shows. */
export type Order = {
  id: string;
  createdAt: string;
  method: OrderMethod;
  subtotalCents: number;
  customer?: string;
  status?: string;
  code?: string;
  protection?: string;
  threeDs?: string;
};

type Fields = Record<string, unknown>;

function asFields(value: unknown): Fields | undefined {
  return value && typeof value === "object" ? (value as Fields) : undefined;
}

/** The first non-empty string (or number) among `keys` on `source`. */
function text(source: Fields | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function walletOf(payment: Fields, info: Fields | undefined): OrderMethod["wallet"] {
  if (payment.applePayInfo) return "apple-pay";
  if (payment.googlePayInfo) return "google-pay";
  const hint = text(info, "walletType", "tokenType", "paymentMethod", "wallet", "type") ?? "";
  if (/apple/i.test(hint)) return "apple-pay";
  if (/google/i.test(hint)) return "google-pay";
  return undefined;
}

function customerOf(payment: Fields) {
  const customer = payment.customer;
  if (typeof customer === "string" && customer.trim()) return customer.trim();
  return (
    text(asFields(customer), "customerId", "id", "_id", "wallet", "email") ??
    text(payment, "customerId", "wallet", "userId")
  );
}

function threeDsOf(payment: Fields, info: Fields | undefined) {
  for (const source of [info, payment]) {
    const raw = source?.threeDs ?? source?.threeDsInfo ?? source?.threeDSecure ?? source?.threeDsResult;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    const details = asFields(raw);
    if (details) {
      if (details.challenged === true || details.challenge === true) return "Challenge";
      const status = text(details, "status", "flow", "result", "type");
      if (status) return status;
    }
    if (source?.threeDsChallenge === true) return "Challenge";
  }
  return undefined;
}

/**
 * Flattens a provider payment for the table. The provider only documents a
 * few of these fields, so each one checks the names it has been seen under
 * and is left empty when none are present.
 */
export function toOrder(payment: CoinflowPayment): Order {
  const fields = payment as unknown as Fields;
  const { key, info, status } = methodOf(payment);
  const protection = asFields(fields.chargebackProtection);

  return {
    id: payment.paymentId,
    createdAt: payment.createdAt,
    method: {
      key,
      wallet: key === "card" ? walletOf(fields, info) : undefined,
      brand: text(info, "cardType", "brand", "network", "scheme"),
      last4: text(info, "last4", "lastFour", "last4Digits"),
    },
    subtotalCents: payment.totals?.subtotal?.cents ?? 0,
    customer: customerOf(fields),
    status: status ?? text(fields, "status"),
    code: text(info, "declineCode", "responseCode", "errorCode", "code") ?? text(fields, "declineCode"),
    protection:
      text(fields, "chargebackProtectionDecision") ??
      text(protection, "decision", "status") ??
      text(info, "chargebackProtectionDecision"),
    threeDs: threeDsOf(fields, info),
  };
}
