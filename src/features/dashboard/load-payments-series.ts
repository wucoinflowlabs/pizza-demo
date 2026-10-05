import "server-only";
import { PaymentsError } from "@/lib/payments/errors";
import { listMerchantPayments } from "@/lib/payments/payments";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildPaymentsSeries, type PaymentsSeries } from "./payments-series";

const DAYS = 7;
export const DEFAULT_TIME_ZONE = "America/Los_Angeles";
const DAY_MS = 24 * 60 * 60 * 1000;

export type PaymentsSeriesResult =
  | { ok: true; series: PaymentsSeries }
  | { ok: false; message: string };

export async function shopTimeZone(loginId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("shops")
    .select("timezone")
    .eq("id", loginId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.timezone || DEFAULT_TIME_ZONE;
}

/**
 * The last week of settled payments, bucketed by day in the shop's time zone.
 * A franchise owner passes every store's sub-merchant; each is its own request.
 */
export async function loadPaymentsSeries({
  submerchantIds,
  loginId,
}: {
  submerchantIds: string[];
  /** The shop whose time zone days are bucketed in. Omitted for a franchise. */
  loginId?: string;
}): Promise<PaymentsSeriesResult> {
  try {
    const now = new Date();
    const timeZone = loginId ? await shopTimeZone(loginId) : DEFAULT_TIME_ZONE;
    // One extra day covers any time zone offset; buildPaymentsSeries drops rows outside the range.
    const range = { since: now.getTime() - (DAYS + 1) * DAY_MS, until: now.getTime(), status: "SETTLED" };
    const payments = (
      await Promise.all(submerchantIds.map((submerchantId) => listMerchantPayments(submerchantId, range)))
    ).flat();
    return { ok: true, series: buildPaymentsSeries(payments, { days: DAYS, timeZone, now }) };
  } catch (err) {
    console.error("[dashboard] payments could not be loaded", err);
    const message =
      err instanceof PaymentsError ? err.userMessage : "Payments couldn't be loaded right now.";
    return { ok: false, message };
  }
}
