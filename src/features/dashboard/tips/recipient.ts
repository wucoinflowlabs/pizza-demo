import "server-only";
import { paymentsRequest } from "@/lib/payments/client";
import { PaymentsError } from "@/lib/payments/errors";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const DEFAULT_TIP_RECIPIENT_CF_USER_ID = "teststaff";

/** The Coinflow user id (e.g. "teststaff") in-person tips are cashed out to. */
export function tipRecipientCfUserId(): string {
  return (process.env.TIP_RECIPIENT_CF_USER_ID?.trim() || DEFAULT_TIP_RECIPIENT_CF_USER_ID);
}

export type TipRecipient = {
  staffId: string;
  cfUserId: string;
  name: string;
  /** When set, the staff's Venmo payout method, pulled from Coinflow. */
  venmo?: { token: string; display: string };
};

/**
 * Resolves the tip-recipient env var to a staff row for this shop, and pulls
 * the Venmo payout method straight from Coinflow (not Supabase). A
 * payout_accounts row is auto-provisioned the first time it's seen so cash-out
 * writes have a stable foreign key.
 */
export async function loadTipRecipient({
  shopId,
  submerchantId,
}: {
  shopId: string;
  submerchantId?: string;
}): Promise<TipRecipient | undefined> {
  const cfUserId = tipRecipientCfUserId();
  const supabase = getSupabaseAdmin();

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .select("id,name,cf_user_id")
    .eq("shop_id", shopId)
    .eq("cf_user_id", cfUserId)
    .maybeSingle();
  if (staffErr) {
    console.error("[tips] staff lookup failed", staffErr);
    return undefined;
  }
  if (!staff) return undefined;

  const venmo = submerchantId ? await loadCoinflowVenmo({ submerchantId, cfUserId }) : undefined;
  if (venmo) await ensurePayoutAccount({ shopId, staffId: staff.id, venmo });

  return {
    staffId: staff.id,
    cfUserId: staff.cf_user_id,
    name: staff.name,
    venmo: venmo ? { token: venmo.token, display: venmo.alias ?? "Venmo" } : undefined,
  };
}

/** The withdrawer's Venmo on this sub-merchant, or undefined if none is linked. */
async function loadCoinflowVenmo({
  submerchantId,
  cfUserId,
}: {
  submerchantId: string;
  cfUserId: string;
}): Promise<{ token: string; alias?: string } | undefined> {
  try {
    const result = await paymentsRequest<{ withdrawer?: { venmo?: { token?: string; alias?: string } } }>({
      method: "GET",
      path: "/withdraw",
      asSubmerchant: submerchantId,
      headers: { "x-coinflow-auth-user-id": cfUserId },
    });
    const venmo = result?.withdrawer?.venmo;
    if (!venmo?.token) return undefined;
    return { token: venmo.token, alias: venmo.alias };
  } catch (err) {
    if (err instanceof PaymentsError) {
      console.warn(`[tips] Coinflow withdrawer lookup for ${cfUserId}: ${err.message}`);
    } else {
      console.error("[tips] Coinflow withdrawer lookup failed", err);
    }
    return undefined;
  }
}

/** First-sight provisioning so `payouts.payout_account_id` always has a target. */
async function ensurePayoutAccount({
  shopId,
  staffId,
  venmo,
}: {
  shopId: string;
  staffId: string;
  venmo: { token: string; alias?: string };
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("payout_accounts")
    .select("id,cf_destination_id,display")
    .eq("shop_id", shopId)
    .eq("staff_id", staffId)
    .eq("rail", "venmo")
    .limit(1)
    .maybeSingle();

  const display = venmo.alias ?? "Venmo";
  if (!existing) {
    const { error } = await supabase.from("payout_accounts").insert({
      shop_id: shopId,
      staff_id: staffId,
      rail: "venmo",
      display,
      cf_destination_id: venmo.token,
    });
    if (error) console.error("[tips] payout_accounts seed failed", error);
    return;
  }
  if (existing.cf_destination_id !== venmo.token || existing.display !== display) {
    await supabase
      .from("payout_accounts")
      .update({ cf_destination_id: venmo.token, display })
      .eq("id", existing.id);
  }
}
