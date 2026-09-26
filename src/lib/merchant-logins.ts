import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Shared demo password for every merchant login. */
export const DEMO_MERCHANT_PASSWORD = "11111";

export type MerchantLogin = {
  email: string;
  merchantId: string;
};

function passwordsMatch(given: string, expected: string) {
  const actual = Buffer.from(given);
  const stored = Buffer.from(expected);
  if (actual.length !== stored.length) return false;
  return timingSafeEqual(actual, stored);
}

export async function saveMerchantLogin({
  merchantId,
  email,
}: {
  merchantId: string;
  email: string;
}) {
  const normalized = email.trim().toLowerCase();
  const { error } = await getSupabaseAdmin().from("merchant_logins").upsert(
    {
      email: normalized,
      merchant_id: merchantId,
      password: DEMO_MERCHANT_PASSWORD,
    },
    { onConflict: "email" },
  );
  if (error) throw new Error(error.message);
}

export async function getMerchantLogin(email: string): Promise<MerchantLogin | undefined> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await getSupabaseAdmin()
    .from("merchant_logins")
    .select("email, merchant_id")
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return { email: data.email, merchantId: data.merchant_id };
}

export async function verifyMerchantPassword({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<MerchantLogin | undefined> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await getSupabaseAdmin()
    .from("merchant_logins")
    .select("email, merchant_id, password")
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !passwordsMatch(password, data.password)) return undefined;
  return { email: data.email, merchantId: data.merchant_id };
}
