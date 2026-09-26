import "server-only";
import { LAMONICA_EMAIL, LAMONICA_PREFILL } from "@/features/dashboard/lamonica";
import { shopLogo } from "@/features/dashboard/shop-logo";
import type { MerchantLogin } from "@/lib/merchant-logins";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type MerchantHomeProfile = {
  name: string;
  place?: string;
  payConnected: boolean;
  logo?: string;
};

export async function getMerchantHomeProfile(login: MerchantLogin): Promise<MerchantHomeProfile> {
  const payConnected = Boolean(login.cfSubmerchantId);
  const shop = await loadShop(login.id);
  const named = login.name?.trim();
  if (shop) {
    return profile({
      name: named || shop.name,
      place: [shop.city, shop.region].filter(Boolean).join(", "),
      payConnected,
      email: login.email,
    });
  }

  if (named) {
    return profile({ name: named, payConnected, email: login.email });
  }

  if (login.email === LAMONICA_EMAIL && typeof LAMONICA_PREFILL.dba === "string") {
    return profile({
      name: LAMONICA_PREFILL.dba,
      place: "Los Angeles, CA",
      payConnected,
      email: login.email,
    });
  }

  return profile({ name: "Your restaurant", payConnected, email: login.email });
}

function profile({
  email,
  ...rest
}: Omit<MerchantHomeProfile, "logo"> & { email: string }): MerchantHomeProfile {
  return { ...rest, logo: shopLogo({ name: rest.name, email }) };
}

async function loadShop(id: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("shops")
    .select("name, city, region")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
