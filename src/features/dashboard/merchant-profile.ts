import "server-only";
import { LAMONICA_EMAIL, LAMONICA_PREFILL } from "@/features/dashboard/lamonica";
import { isAdoraPayEnrolled } from "@/features/dashboard/pay-status";
import { shopLogo } from "@/features/dashboard/shop-logo";
import type { MerchantLogin } from "@/lib/merchant-logins";
import { findSubmerchantIdByEmail } from "@/lib/payments/submerchants";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type MerchantHomeProfile = {
  name: string;
  place?: string;
  payConnected: boolean;
  logo?: string;
};

export async function getMerchantHomeProfile(login: MerchantLogin): Promise<MerchantHomeProfile> {
  const payConnected = await enrollmentComplete(login);
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

/** True only when this login's Coinflow application is submitted and unblocked. */
async function enrollmentComplete(login: MerchantLogin): Promise<boolean> {
  try {
    const merchantId = login.cfSubmerchantId ?? (await findSubmerchantIdByEmail(login.email));
    if (!merchantId) return false;
    return isAdoraPayEnrolled(await getSubmerchantProgress(merchantId));
  } catch (err) {
    console.error("[dashboard] could not read Adora Pay enrollment", err);
    return false;
  }
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
