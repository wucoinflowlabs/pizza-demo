import "server-only";
import { paymentsRequest } from "./client";
import type { CoinflowPayment } from "./types";

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
