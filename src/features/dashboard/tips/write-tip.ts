import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Westwood-only, minimal payment ledger. One row per Coinflow payment, keyed
 * on `payment_id`. Idempotent via the primary key — a webhook arriving after
 * the browser's onSuccess write is a no-op.
 */
export async function recordCheckoutPayment({
  subtotalCents,
  tipCents,
  cfPaymentId,
}: {
  subtotalCents: number;
  tipCents: number;
  cfPaymentId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getSupabaseAdmin();
  const totalCents = subtotalCents + tipCents;

  const { error } = await supabase.from("payments").upsert(
    {
      payment_id: cfPaymentId,
      subtotal_cents: subtotalCents,
      tip_cents: tipCents,
      total_cents: totalCents,
    },
    { onConflict: "payment_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[tips] payment upsert failed", error.message ?? JSON.stringify(error));
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

/**
 * Adds `tipCents` to an existing payment's `tip_cents` and bumps the total.
 * Called after a successful Coinflow tip-adjust-and-capture.
 */
export async function addTipToCheckoutPayment({
  cfPaymentId,
  tipCents,
}: {
  cfPaymentId: string;
  tipCents: number;
}): Promise<void> {
  if (tipCents <= 0) return;
  const supabase = getSupabaseAdmin();
  const { data: row, error: readErr } = await supabase
    .from("payments")
    .select("tip_cents,subtotal_cents")
    .eq("payment_id", cfPaymentId)
    .maybeSingle();
  if (readErr) {
    console.error("[tips] tip adjust lookup failed", readErr);
    return;
  }
  if (!row) return;

  const nextTip = row.tip_cents + tipCents;
  const { error: updateErr } = await supabase
    .from("payments")
    .update({ tip_cents: nextTip, total_cents: row.subtotal_cents + nextTip })
    .eq("payment_id", cfPaymentId);
  if (updateErr) console.error("[tips] tip adjust update failed", updateErr);
}


/**
 * Mirrors every Coinflow payment the dashboard just loaded into Supabase.
 * Idempotent via the `payment_id` PK — rows already written (by onSuccess or
 * the Settled webhook) keep their existing tip values. Westwood-only; callers
 * should guard on the sub-merchant.
 */
export async function syncPaymentsFromCoinflow(
  rows: Array<{ paymentId?: string; subtotalCents?: number }>,
): Promise<void> {
  const payload = rows
    .filter((row) => row.paymentId && (row.subtotalCents ?? 0) > 0)
    .map((row) => ({
      payment_id: row.paymentId!,
      subtotal_cents: row.subtotalCents!,
      tip_cents: 0,
      total_cents: row.subtotalCents!,
    }));
  if (payload.length === 0) return;

  const { error } = await getSupabaseAdmin()
    .from("payments")
    .upsert(payload, { onConflict: "payment_id", ignoreDuplicates: true });
  if (error) console.error("[tips] payments sync failed:", error.message ?? JSON.stringify(error));
}
