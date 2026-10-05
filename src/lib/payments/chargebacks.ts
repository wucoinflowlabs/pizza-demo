import "server-only";
import { paymentsRequest } from "./client";
import type { CoinflowChargeback, CoinflowChargebackDetail } from "./types";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/** The provider returns a bare array; the wrapped shapes are accepted in case that changes. */
function rowsOf(body: unknown): CoinflowChargeback[] {
  if (Array.isArray(body)) return body;
  const wrapped = body as { chargebacks?: unknown; data?: unknown } | undefined;
  const rows = wrapped?.chargebacks ?? wrapped?.data;
  return Array.isArray(rows) ? rows : [];
}

/** Every chargeback on a sub-merchant created in [since, until], oldest first. */
export async function listChargebacks(
  submerchantId: string,
  { since, until }: { since: number; until: number },
): Promise<CoinflowChargeback[]> {
  const chargebacks: CoinflowChargeback[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      since: String(since),
      until: String(until),
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: "createdAt",
      sortDirection: "1",
    });
    const body = await paymentsRequest<unknown>({
      method: "GET",
      path: `/merchant/chargebacks?${params.toString()}`,
      asSubmerchant: submerchantId,
    });
    const rows = rowsOf(body);
    chargebacks.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return chargebacks;
}

/** One chargeback with its payment, by the disputed payment's id. */
export function getChargeback(submerchantId: string, paymentId: string) {
  return paymentsRequest<CoinflowChargebackDetail>({
    method: "GET",
    path: `/merchant/chargebacks/${encodeURIComponent(paymentId)}`,
    asSubmerchant: submerchantId,
  });
}

/** The merchant's saved, unsubmitted response (HTML), or an empty string. */
export async function getChargebackDraft(submerchantId: string, paymentId: string) {
  const draft = await paymentsRequest<unknown>({
    method: "GET",
    path: `/merchant/chargebacks/${encodeURIComponent(paymentId)}/draft`,
    asSubmerchant: submerchantId,
  });
  return typeof draft === "string" ? draft : "";
}

export function saveChargebackDraft(submerchantId: string, paymentId: string, draft: string) {
  return paymentsRequest<unknown>({
    method: "PUT",
    path: `/merchant/chargebacks/${encodeURIComponent(paymentId)}/draft`,
    body: { draft },
    asSubmerchant: submerchantId,
  });
}

/**
 * Submits evidence: either a written response (HTML) or an uploaded file's key.
 * Coinflow marks the chargeback responded straight away, then sends the
 * evidence to the processor in the background.
 */
export function respondToChargeback(
  submerchantId: string,
  paymentId: string,
  evidence: { response: string } | { fileKey: string },
) {
  return paymentsRequest<unknown>({
    method: "POST",
    path: `/merchant/chargebacks/${encodeURIComponent(paymentId)}/respond`,
    body: evidence,
    asSubmerchant: submerchantId,
  });
}

/** Concedes a chargeback: the disputed amount and fee stay with the cardholder's bank. */
export function acceptChargeback(submerchantId: string, paymentId: string) {
  return paymentsRequest<unknown>({
    method: "POST",
    path: `/merchant/chargebacks/${encodeURIComponent(paymentId)}/accept`,
    asSubmerchant: submerchantId,
  });
}

/** The states a sandbox chargeback can be moved to. */
export type SimulatedChargebackStatus = "CHARGEBACK" | "CHARGEBACK_WON" | "CHARGEBACK_LOST";

/**
 * Sandbox only: `CHARGEBACK` opens a test chargeback on a payment, as if the
 * cardholder disputed it; `CHARGEBACK_WON` / `CHARGEBACK_LOST` decide one.
 */
export function simulateChargeback(
  submerchantId: string,
  paymentId: string,
  status: SimulatedChargebackStatus = "CHARGEBACK",
) {
  return paymentsRequest<unknown>({
    method: "PUT",
    path: `/merchant/chargebacks/simulate/${encodeURIComponent(paymentId)}/${status}`,
    asSubmerchant: submerchantId,
  });
}
