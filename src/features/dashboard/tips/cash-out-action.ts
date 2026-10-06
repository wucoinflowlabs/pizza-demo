"use server";

import { randomUUID } from "node:crypto";
import { PaymentsError } from "@/lib/payments/errors";
import { sendSandboxMirrorPayout } from "@/lib/payments/real-payout";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { shopTimeZone } from "../load-payments-series";
import { getSessionSubmerchant } from "../session-submerchant";
import { loadTipSummary } from "./queries";
import { loadTipRecipient } from "./recipient";

type Result = { ok: true; cents: number } | { ok: false; error: string };

/**
 * Pays the recipient's unpaid tip balance via the sandbox delegated Venmo
 * payout. Sandbox-only — does NOT touch the production merchant. Writes a
 * `payouts` row with the sandbox cf_transfer_id so the balance resets to zero.
 */
export async function cashOutTipsAction(): Promise<Result> {
  const session = await getSessionSubmerchant();
  if (!session) return { ok: false, error: "Sign in again." };
  const { login, submerchantId } = session;
  if (!submerchantId) return { ok: false, error: "Enroll in Adora Pay first." };

  const recipient = await loadTipRecipient({ shopId: login.id, submerchantId });
  if (!recipient) return { ok: false, error: "No tip recipient configured." };
  if (!recipient.venmo?.token) return { ok: false, error: `${recipient.name} has no Venmo payout method linked.` };

  const timeZone = await shopTimeZone(login.id).catch(() => "America/Los_Angeles");
  const summary = await loadTipSummary({ shopId: login.id, staffId: recipient.staffId, timeZone });
  if (summary.unpaidCents <= 0) return { ok: false, error: "No unpaid tips to cash out." };

  const idempotencyKey = randomUUID();
  try {
    const result = await sendSandboxMirrorPayout({
      submerchantId,
      cents: summary.unpaidCents,
      idempotencyKey,
    });
    const supabase = getSupabaseAdmin();
    const { data: account } = await supabase
      .from("payout_accounts")
      .select("id")
      .eq("shop_id", login.id)
      .eq("staff_id", recipient.staffId)
      .eq("rail", "venmo")
      .limit(1)
      .maybeSingle();
    if (account) {
      // Record the payout so the next summary subtracts it from the accrued total.
      await supabase.from("payouts").insert({
        shop_id: login.id,
        payout_account_id: account.id,
        rail: "venmo",
        amount_cents: summary.unpaidCents,
        status: "pending",
        cf_transfer_id: result.signature ?? idempotencyKey,
      });
    }
    return { ok: true, cents: summary.unpaidCents };
  } catch (err) {
    console.error("[tips] cash out failed", err);
    return { ok: false, error: err instanceof PaymentsError ? err.userMessage : "Couldn't cash out tips." };
  }
}
