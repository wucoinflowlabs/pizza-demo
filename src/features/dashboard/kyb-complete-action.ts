"use server";

import { getMerchantLogin } from "@/lib/merchant-logins";
import { getCurrentMerchantEmail } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureShopRow } from "./shop-row";

/**
 * Marks the current shop's KYB as complete. Called from the dashboard the
 * moment the merchant finishes the Persona flow (or clicks Continue past a
 * sandbox-preapproved case). Keyed on the merchant_logins/shops shared id so
 * it works even before Coinflow's sub-merchant list has caught up.
 */
export async function markKybCompletedAction(): Promise<{ ok: boolean; reason?: string }> {
  const email = await getCurrentMerchantEmail();
  if (!email) {
    console.warn("[kyb] mark skipped: no session cookie");
    return { ok: false, reason: "no session" };
  }
  const login = await getMerchantLogin(email);
  if (!login) {
    console.warn(`[kyb] mark skipped: no merchant_logins row for ${email}`);
    return { ok: false, reason: `no merchant login for ${email}` };
  }
  console.log(`[kyb] mark attempt: login=${login.id} email=${email}`);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .update({ kyb_completed_at: new Date().toISOString() })
    .eq("id", login.id)
    .is("kyb_completed_at", null)
    .select("id,kyb_completed_at");
  if (error) {
    console.error("[kyb] mark failed:", error.message ?? JSON.stringify(error));
    return { ok: false, reason: error.message };
  }
  if (!data || data.length === 0) {
    // Either kyb_completed_at was already set (idempotent no-op) or there's
    // no shops row for this login — second case is a real seeding gap.
    const { data: existing } = await supabase.from("shops").select("id,kyb_completed_at").eq("id", login.id).maybeSingle();
    if (!existing) {
      // Shops row was never seeded (merchant onboarded before this check landed,
      // or operator-created merchant that never ran startAdoraPayOnboarding).
      // Create it now, then retry the mark so the first KYB click still ticks.
      if (login.cfSubmerchantId) {
        console.log(`[kyb] seeding missing shops row for login ${login.id} / ${login.cfSubmerchantId}`);
        await ensureShopRow({ login, merchantId: login.cfSubmerchantId });
        const retry = await supabase
          .from("shops")
          .update({ kyb_completed_at: new Date().toISOString() })
          .eq("id", login.id)
          .is("kyb_completed_at", null)
          .select("id,kyb_completed_at");
        if (retry.data?.length) {
          console.log(`[kyb] marked complete for ${login.id} (${retry.data[0].kyb_completed_at}) after seeding`);
          return { ok: true };
        }
      }
      console.warn(
        `[kyb] still no shops row after seed attempt for login ${login.id} (${email}).`,
      );
      return { ok: false, reason: "no shops row" };
    }
    console.log(`[kyb] already marked complete for ${login.id} at ${existing.kyb_completed_at}`);
    return { ok: true };
  }
  console.log(`[kyb] marked complete for ${login.id} (${data[0].kyb_completed_at})`);
  return { ok: true };
}
