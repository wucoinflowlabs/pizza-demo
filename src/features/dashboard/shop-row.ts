import "server-only";
import { ADORA_CUSTOMERS } from "@/features/operator/adora-customers";
import { ADORA_STORES } from "@/features/operator/adora-stores";
import { storeAccountId } from "@/features/operator/store-account";
import type { MerchantLogin } from "@/lib/merchant-logins";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_TIMEZONE = "America/Los_Angeles";

/**
 * Makes sure a shops row exists for this login so KYB/tips/etc. have somewhere
 * to persist. Idempotent. Called from the enrollment flow and from the first
 * dashboard load so an operator-created merchant also gets its row.
 */
export async function ensureShopRow({
  login,
  merchantId,
  name,
}: {
  login: MerchantLogin;
  merchantId: string;
  name?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("shops")
    .select("id")
    .eq("id", login.id)
    .maybeSingle();
  if (existing) return;

  const location = locationFor(merchantId);
  const { error } = await supabase.from("shops").insert({
    id: login.id,
    cf_submerchant_id: merchantId,
    name: name ?? login.name ?? "Shop",
    timezone: DEFAULT_TIMEZONE,
    city: location?.city ?? "",
    region: location?.state ?? "",
  });
  if (error) console.error(`[shops] seed failed for ${login.id} / ${merchantId}:`, error.message ?? JSON.stringify(error));
}

/** When the Coinflow merchantId matches an Adora store, use its real address. */
export function locationFor(merchantId: string): { city: string; state: string } | undefined {
  for (const store of ADORA_STORES) {
    if (storeAccountId(store.customerId, store.id) === merchantId) return { city: store.city, state: store.state };
  }
  for (const customer of ADORA_CUSTOMERS) {
    if (merchantId.startsWith(`adora-${customer.id}-`)) return { city: customer.location.city, state: customer.location.state };
  }
  return undefined;
}
