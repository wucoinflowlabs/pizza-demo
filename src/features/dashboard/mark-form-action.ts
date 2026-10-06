"use server";

import { getMerchantLogin, getMerchantLoginBySubmerchantId } from "@/lib/merchant-logins";
import { getCurrentMerchantEmail } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Freezes the merchant's onboarding form submission time in Supabase so the
 * operator progress bar doesn't drift when Coinflow bumps `merchant.updatedAt`
 * on later writes (KYB updates, Submit application, etc.). Idempotent.
 *
 * Pass a `merchantId` for callers that don't have a session cookie (the /apply
 * invite flow); otherwise resolves from the current merchant session.
 */
export async function markFormSubmittedAction(merchantId?: string): Promise<void> {
  const login = merchantId
    ? await getMerchantLoginBySubmerchantId(merchantId)
    : await loginFromSession();
  if (!login) return;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("shops")
    .update({ form_submitted_at: new Date().toISOString() })
    .eq("id", login.id)
    .is("form_submitted_at", null);
  if (error) console.error("[form-submit] mark failed:", error.message ?? JSON.stringify(error));
}

async function loginFromSession() {
  const email = await getCurrentMerchantEmail();
  if (!email) return undefined;
  return getMerchantLogin(email);
}
