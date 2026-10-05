import "server-only";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { findSubmerchantIdByEmail } from "@/lib/payments/submerchants";
import { getCurrentMerchantEmail } from "@/lib/session";
import { getSessionFranchise, parseLocation } from "./franchise";

/**
 * The signed-in merchant and their Adora Pay account, resolved from the session
 * so the browser never chooses which account a payments call acts as.
 */
export async function getSessionSubmerchant() {
  const email = await getCurrentMerchantEmail();
  if (!email) return undefined;
  const login = await getMerchantLogin(email);
  if (!login) return undefined;
  const submerchantId = await findSubmerchantIdByEmail(login.email);
  return { login, submerchantId };
}

/**
 * The sub-merchant a single-payment call acts as. A franchise owner names the
 * location, which must be one of their own enrolled stores; a store login
 * always acts as itself.
 */
export async function resolvePaymentSubmerchant(locationId?: string | null): Promise<string | undefined> {
  const franchise = await getSessionFranchise();
  if (franchise) return parseLocation(locationId, franchise.locations)?.submerchantId;
  return (await getSessionSubmerchant())?.submerchantId;
}
