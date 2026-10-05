import type { CoinflowChargeback } from "@/lib/payments/types";
import { toOrder, type OrderLocation, type OrderMethod } from "./orders";

export const CHARGEBACK_STATUSES = [
  "Needs Response",
  "Under Review",
  "Accepted",
  "Chargeback Won",
  "Chargeback Lost",
] as const;

export type ChargebackStatus = (typeof CHARGEBACK_STATUSES)[number];

/** One chargeback, flattened to what the Chargebacks table shows. */
export type Chargeback = {
  /** The disputed payment's id. */
  id: string;
  chargebackId?: string;
  loadedAt: string;
  updatedAt?: string;
  arn?: string;
  customer?: string;
  method: OrderMethod;
  totalCents: number;
  feeCents?: number;
  currency: string;
  status: ChargebackStatus;
  protection?: string;
  threeDs?: string;
  reasonCode?: string;
  reasonDescription?: string;
  respondBy?: string;
  /** When the disputed payment was made. */
  transactionAt?: string;
  refunded: boolean;
  /** Set on a franchise owner's view, where chargebacks come from several stores. */
  location?: OrderLocation;
};

function statusOf(chargeback: CoinflowChargeback, paymentStatus?: string): ChargebackStatus {
  const status = paymentStatus?.toUpperCase();
  if (status === "CHARGEBACK_WON") return "Chargeback Won";
  if (status === "CHARGEBACK_LOST" || chargeback.decidedLostAt) return "Chargeback Lost";
  if (chargeback.accepted) return "Accepted";
  if (chargeback.responded) return "Under Review";
  return "Needs Response";
}

/** Flattens a provider chargeback (`GET /merchant/chargebacks`) for the table. */
export function toChargeback(chargeback: CoinflowChargeback): Chargeback {
  const payment = typeof chargeback.payment === "object" ? chargeback.payment : undefined;
  const order = payment ? toOrder(payment) : undefined;
  const total = chargeback.disputedAmount ?? payment?.totals?.total ?? payment?.totals?.subtotal;
  const threeDs = chargeback.secureDs?.authenticationStatus ?? order?.threeDs;

  return {
    id: payment?.paymentId ?? (typeof chargeback.payment === "string" ? chargeback.payment : chargeback._id),
    chargebackId: chargeback.chargebackId,
    loadedAt: chargeback.loadedOn ?? chargeback.createdAt,
    updatedAt: chargeback.updatedAt,
    arn: chargeback.arn || undefined,
    customer: chargeback.customer || order?.customer,
    method: order?.method ?? { key: "card" },
    totalCents: total?.cents ?? 0,
    feeCents: chargeback.chargebackFeeCents,
    currency: total?.currency ?? "USD",
    status: statusOf(chargeback, order?.status),
    protection: order?.protection,
    threeDs: threeDs === "NotApplicable" ? undefined : threeDs,
    reasonCode: chargeback.reasonCode || undefined,
    reasonDescription: chargeback.reasonDescription || undefined,
    respondBy: chargeback.respondByDate,
    transactionAt: payment?.createdAt,
    refunded: !!chargeback.refund || (payment?.refundInfo?.amount?.cents ?? 0) > 0,
  };
}
