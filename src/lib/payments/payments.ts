import "server-only";
import { paymentsRequest } from "./client";
import type { CoinflowPayment, CoinflowPaymentDetail, RefundQuote, RefundReason } from "./types";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/** The provider returns a bare array; the wrapped shapes are accepted in case that changes. */
function rowsOf(body: unknown): CoinflowPayment[] {
  if (Array.isArray(body)) return body;
  const wrapped = body as { payments?: unknown; data?: unknown } | undefined;
  const rows = wrapped?.payments ?? wrapped?.data;
  return Array.isArray(rows) ? rows : [];
}

/** Every payment on a sub-merchant created in [since, until], oldest first. */
export async function listMerchantPayments(
  submerchantId: string,
  { since, until, status }: { since: number; until: number; status?: string },
): Promise<CoinflowPayment[]> {
  const payments: CoinflowPayment[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      since: String(since),
      until: String(until),
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: "createdAt",
      sortDirection: "1",
    });
    if (status) params.set("status", status);
    const body = await paymentsRequest<unknown>({
      method: "GET",
      path: `/merchant/payments?${params.toString()}`,
      asSubmerchant: submerchantId,
    });
    const rows = rowsOf(body);
    payments.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return payments;
}

/** One payment with its enhanced details (device, 3DS, AVS, IP location, decline reason). */
export function getMerchantPayment(submerchantId: string, paymentId: string) {
  return paymentsRequest<CoinflowPaymentDetail>({
    method: "GET",
    path: `/merchant/payments/${encodeURIComponent(paymentId)}`,
    asSubmerchant: submerchantId,
  });
}

/** What a refund would cost, without queuing it. Omit `partialCents` for a full refund. */
export function quoteRefund(submerchantId: string, paymentId: string, partialCents?: number) {
  const query = partialCents === undefined ? "" : `?partialAmount=${partialCents}`;
  return paymentsRequest<RefundQuote>({
    method: "GET",
    path: `/merchant/payments/${encodeURIComponent(paymentId)}/refund-quote${query}`,
    asSubmerchant: submerchantId,
  });
}

export function refundPayment(
  submerchantId: string,
  paymentId: string,
  { reason, partialCents }: { reason: RefundReason; partialCents?: number },
) {
  return paymentsRequest<unknown>({
    method: "PUT",
    path: `/merchant/payments/${encodeURIComponent(paymentId)}/refund`,
    body: {
      refundReason: reason,
      ...(partialCents === undefined ? {} : { partialAmount: { cents: partialCents } }),
    },
    asSubmerchant: submerchantId,
  });
}
