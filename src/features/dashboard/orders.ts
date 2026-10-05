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
  /** Set on a franchise owner's view, where payments come from several stores. */
  location?: OrderLocation;
};

export type OrderLocation = { id: string; label: string; city?: string };

type Fields = Record<string, unknown>;

/** The first non-empty string among `keys` on `source`. */
function text(source: Fields | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

const WALLETS: Record<string, OrderMethod["wallet"]> = {
  applePay: "apple-pay",
  googlePay: "google-pay",
};

/** Flattens a provider payment (`GET /merchant/payments`) for the table. */
export function toOrder(payment: CoinflowPayment): Order {
  const fields = payment as unknown as Fields;
  const { key, info, status } = methodOf(payment);
  const customer = fields.customer as Fields | undefined;
  const processed3DS = text(info, "processed3DS");

  return {
    id: payment.paymentId,
    createdAt: payment.createdAt,
    method: {
      key,
      wallet: key === "card" ? WALLETS[text(info, "mobileWallet") ?? ""] : undefined,
      brand: text(info, "cardType"),
      last4: text(info, "last4"),
    },
    subtotalCents: payment.totals?.subtotal?.cents ?? 0,
    customer: text(customer, "customerId", "email") ?? text(fields, "wallet"),
    status,
    // A settled card's authCode is an approval number; only a decline code is worth showing.
    code: status?.toUpperCase() === "FAILED" ? text(info, "authCode", "reasonCode") : undefined,
    protection: text(fields, "chargebackProtectionDecision"),
    threeDs: processed3DS === "NotApplicable" ? undefined : processed3DS,
  };
}
