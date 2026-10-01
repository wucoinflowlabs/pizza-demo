import "server-only";
import { PaymentsError } from "@/lib/payments/errors";
import { listMerchantPayments } from "@/lib/payments/payments";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildPaymentsSeries, type PaymentsSeries } from "./payments-series";

const DAYS = 7;
const DEFAULT_TIME_ZONE = "America/Los_Angeles";
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

/** The last week of settled payments, bucketed by day in the shop's time zone. */
export async function loadPaymentsSeries({
  submerchantId,
  loginId,
}: {
  submerchantId: string;
  loginId: string;
}): Promise<PaymentsSeriesResult> {
  try {
    const now = new Date();
    const timeZone = await shopTimeZone(loginId);
    // One extra day covers any time zone offset; buildPaymentsSeries drops rows outside the range.
    const payments = await listMerchantPayments(submerchantId, {
      since: now.getTime() - (DAYS + 1) * DAY_MS,
      until: now.getTime(),
      status: "SETTLED",
    });
    return { ok: true, series: buildPaymentsSeries(payments, { days: DAYS, timeZone, now }) };
  } catch (err) {
    console.error("[dashboard] payments could not be loaded", err);
    const message =
      err instanceof PaymentsError ? err.userMessage : "Payments couldn't be loaded right now.";
    return { ok: false, message };
  }
}
