import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Shared demo password for every merchant login. */
export const DEMO_MERCHANT_PASSWORD = "11111";

export type MerchantLogin = {
  /** Adora's internal id. Primary key of merchant_logins. */
  id: string;
  email: string;
  /** Store name. Several locations of the same shop can share it. */
  name: string | null;
  /** Coinflow submerchant id. Null until Coinflow has created the account. */
  cfSubmerchantId: string | null;
};

function passwordsMatch(given: string, expected: string) {
  const actual = Buffer.from(given);
  const stored = Buffer.from(expected);
  if (actual.length !== stored.length) return false;
  return timingSafeEqual(actual, stored);
}

export class MerchantLoginEmailTakenError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "MerchantLoginEmailTakenError";
  }
}

export async function saveMerchantLogin({
  cfSubmerchantId,
  email,
  name,
}: {
  cfSubmerchantId: string;
  email: string;
  /** Omitted on later updates so an existing store name is left alone. */
  name?: string;
}) {
  const normalized = email.trim().toLowerCase();
  const storeName = name?.trim();
  // id is omitted so an existing Adora UUID is left alone and a new
  // row receives the column default.
  const { error } = await getSupabaseAdmin().from("merchant_logins").upsert(
    {
      email: normalized,
      cf_submerchant_id: cfSubmerchantId,
      password: DEMO_MERCHANT_PASSWORD,
      ...(storeName ? { name: storeName } : {}),
    },
    { onConflict: "email" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Writes the Coinflow id onto the login that already exists for a store.
 * A different account-owner email replaces the seeded address on that same row.
 */
export async function assignSubmerchantLogin({
  lookupEmail,
  email,
  cfSubmerchantId,
  name,
}: {
  /** The login to update. For a store, this is its generated address. */
  lookupEmail: string;
  email: string;
  cfSubmerchantId: string;
  /** Used only when no login exists yet. */
  name?: string;
}) {
  const current = lookupEmail.trim().toLowerCase();
  const next = email.trim().toLowerCase();
  const admin = getSupabaseAdmin();
  const { data: existing, error: findError } = await admin
    .from("merchant_logins")
    .select("id")
    .eq("email", current)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!existing) {
    await saveMerchantLogin({ email: next, cfSubmerchantId, name });
    return;
  }

  const { error } = await admin
    .from("merchant_logins")
    .update({ email: next, cf_submerchant_id: cfSubmerchantId })
    .eq("id", existing.id);
  if (error?.code === "23505") throw new MerchantLoginEmailTakenError();
  if (error) throw new Error(error.message);
}

/** Sets the Coinflow id on a login that is already signed in. Leaves name and email alone. */
export async function setLoginSubmerchantId(email: string, cfSubmerchantId: string) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await getSupabaseAdmin()
    .from("merchant_logins")
    .update({ cf_submerchant_id: cfSubmerchantId })
    .eq("email", normalized)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function getMerchantLogin(email: string): Promise<MerchantLogin | undefined> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await getSupabaseAdmin()
    .from("merchant_logins")
    .select("id, email, name, cf_submerchant_id")
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    cfSubmerchantId: data.cf_submerchant_id,
  };
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
    .select("id, email, name, cf_submerchant_id, password")
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !passwordsMatch(password, data.password)) return undefined;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    cfSubmerchantId: data.cf_submerchant_id,
  };
}
