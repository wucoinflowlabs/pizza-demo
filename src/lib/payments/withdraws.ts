import "server-only";
import { paymentsRequest } from "./client";
import type {
  CoinflowCustomerData,
  CoinflowWithdraw,
  CoinflowWithdrawer,
  WithdrawEnhancedInfo,
  WithdrawerAuditLog,
} from "./types";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/**
 * A sub-merchant's withdrawers, newest first. The provider returns at most 100
 * users and 100 businesses and ignores paging, so this is a single call.
 * `search` is an exact match on email, wallet or verification reference.
 */
export function listWithdrawers(submerchantId: string, { search, blocked }: { search?: string; blocked?: boolean } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (blocked !== undefined) params.set("blocked", String(blocked));
  const query = params.size ? `?${params.toString()}` : "";
  return paymentsRequest<CoinflowWithdrawer[]>({
    method: "GET",
    path: `/merchant/withdrawers${query}`,
    asSubmerchant: submerchantId,
  });
}

export function getWithdrawerProfile(submerchantId: string, withdrawerId: string) {
  return paymentsRequest<CoinflowCustomerData>({
    method: "GET",
    path: `/merchant/withdrawer/${encodeURIComponent(withdrawerId)}/profile`,
    asSubmerchant: submerchantId,
  });
}

export function getWithdrawerAuditLogs(submerchantId: string, withdrawerId: string) {
  return paymentsRequest<WithdrawerAuditLog[]>({
    method: "GET",
    path: `/merchant/withdrawer/${encodeURIComponent(withdrawerId)}/audit-logs`,
    asSubmerchant: submerchantId,
  });
}

/**
 * Every withdrawal on a sub-merchant in [since, until] (epoch ms), newest first.
 * When `search` is set the provider ignores the date range.
 */
export async function listWithdraws(
  submerchantId: string,
  { since, until, search }: { since: number; until: number; search?: string },
): Promise<CoinflowWithdraw[]> {
  const withdraws: CoinflowWithdraw[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      since: String(since),
      until: String(until),
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: "createdAt",
      sortDirection: "-1",
    });
    if (search) params.set("search", search);
    const rows = await paymentsRequest<CoinflowWithdraw[]>({
      method: "GET",
      path: `/merchant/withdraws?${params.toString()}`,
      asSubmerchant: submerchantId,
    });
    if (!Array.isArray(rows)) break;
    withdraws.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return withdraws;
}

/** Looked up within the exact sub-merchant, not its children. */
export async function getWithdraw(submerchantId: string, transferId: string) {
  const { withdrawal } = await paymentsRequest<{ withdrawal?: CoinflowWithdraw }>({
    method: "GET",
    path: `/merchant/withdraws/${encodeURIComponent(transferId)}`,
    asSubmerchant: submerchantId,
  });
  return withdrawal;
}

export function getWithdrawEnhancedInfo(submerchantId: string, transferId: string) {
  return paymentsRequest<WithdrawEnhancedInfo | undefined>({
    method: "GET",
    path: `/merchant/withdraws/${encodeURIComponent(transferId)}/enhanced`,
    asSubmerchant: submerchantId,
  });
}

export function setWithdrawerAvailability(
  submerchantId: string,
  withdrawerId: string,
  { status, reason }: { status: "Functional" | "Blocked"; reason: string },
) {
  return paymentsRequest<unknown>({
    method: "PUT",
    path: `/merchant/block-withdrawer/${encodeURIComponent(withdrawerId)}`,
    body: { status, reason },
    asSubmerchant: submerchantId,
  });
}

/** The sub-merchant's balance available to pay out, in cents. */
export async function getPayoutBalance(submerchantId: string) {
  const body = await paymentsRequest<{ balance?: { cents?: number } }>({
    method: "GET",
    path: "/merchant/withdraws/payout/balance",
    asSubmerchant: submerchantId,
  });
  return body?.balance?.cents ?? 0;
}
