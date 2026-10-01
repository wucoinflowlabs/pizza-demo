import "server-only";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { findSubmerchantIdByEmail } from "@/lib/payments/submerchants";
import { getCurrentMerchantEmail } from "@/lib/session";

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
