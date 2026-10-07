import "server-only";
import { LAMONICA_MERCHANT_ID } from "@/features/lamonica/menu";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { recordCheckoutPayment } from "./write-tip";

/**
 * Coinflow "Settled" webhook payload, in the shape we actually consume. The
 * provider includes a lot more; we type only what the Lamonica flow needs.
 */
type SettledPayload = {
  id?: string;
  merchantId?: string;
  paymentMethod?: string;
  subtotal?: { cents?: number; currency?: string };
  total?: { cents?: number; currency?: string };
  webhookInfo?: {
    orderId?: string;
    tipCents?: number;
    subtotalCents?: number;
  };
};

/**
 * Writes a settled Coinflow payment into Supabase so the Tips page sees it.
 * Scoped to Lamonica only — ignores every other sub-merchant for now.
 * Idempotent via `payments.cf_payment_id` unique constraint.
 */
export async function recordSettledWebhook(data: SettledPayload): Promise<void> {
  if (data.merchantId !== LAMONICA_MERCHANT_ID) return;
  if (!data.id) {
    console.warn("[webhooks] Settled event missing payment id; skipped");
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("id")
    .eq("cf_submerchant_id", data.merchantId)
    .maybeSingle();
  if (error) {
    console.error("[webhooks] shop lookup failed", error.message ?? JSON.stringify(error));
    return;
  }
  if (!shop) {
    console.warn(`[webhooks] no shops row for ${data.merchantId}; skipping payment ledger write`);
    return;
  }

  // Prefer the signed values from webhookInfo (set at checkout) over the top-
  // level totals when both are present. The browser can't fabricate webhookInfo
  // — Coinflow echoes it from the signed JWT.
  const info = data.webhookInfo ?? {};
  const subtotalCents = info.subtotalCents ?? data.subtotal?.cents ?? 0;
  const tipCents = info.tipCents ?? 0;
  // Fall back to the Coinflow payment id when the demo-side orderId wasn't set.
  const orderTicket = info.orderId ?? data.id;

  const result = await recordCheckoutPayment({
    subtotalCents,
    tipCents,
    cfPaymentId: data.id,
  });
  if (!result.ok) {
    console.error("[webhooks] settled ledger write failed:", result.reason);
  }
}
