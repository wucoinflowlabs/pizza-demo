import "server-only";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "./signing";

const ACCOUNT_COOKIE = "za_account";
const MERCHANT_COOKIE = "za_merchant";
const FRANCHISE_COOKIE = "za_franchise";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
const TWELVE_HOURS_SECONDS = 60 * 60 * 12;

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/** The sub-merchant this browser is acting as. Shared by every business-facing flow. */
export async function getCurrentAccountId(): Promise<string | undefined> {
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  return verifyToken({ token, purpose: "account" });
}

export async function setCurrentAccountId(accountId: string) {
  const token = signToken({
    purpose: "account",
    subject: accountId,
    ttlSeconds: THIRTY_DAYS_SECONDS,
  });
  (await cookies()).set(ACCOUNT_COOKIE, token, cookieOptions(THIRTY_DAYS_SECONDS));
}

/** The merchant dashboard login. Separate from the invite-link account cookie. */
export async function getCurrentMerchantEmail(): Promise<string | undefined> {
  const token = (await cookies()).get(MERCHANT_COOKIE)?.value;
  return verifyToken({ token, purpose: "merchant" });
}

export async function startMerchantSession(email: string) {
  const token = signToken({
    purpose: "merchant",
    subject: email,
    ttlSeconds: TWELVE_HOURS_SECONDS,
  });
  const jar = await cookies();
  jar.delete(FRANCHISE_COOKIE);
  jar.set(MERCHANT_COOKIE, token, cookieOptions(TWELVE_HOURS_SECONDS));
}

/** Ends the dashboard session, whether it was one store or a franchise owner. */
export async function endMerchantSession() {
  const jar = await cookies();
  jar.delete(MERCHANT_COOKIE);
  jar.delete(FRANCHISE_COOKIE);
}

/** The franchise (Adora customer id) a franchise owner signed in as. Replaces a store login. */
export async function getCurrentFranchiseId(): Promise<string | undefined> {
  const token = (await cookies()).get(FRANCHISE_COOKIE)?.value;
  return verifyToken({ token, purpose: "franchise" });
}

export async function startFranchiseSession(customerId: string) {
  const token = signToken({
    purpose: "franchise",
    subject: customerId,
    ttlSeconds: TWELVE_HOURS_SECONDS,
  });
  const jar = await cookies();
  jar.delete(MERCHANT_COOKIE);
  jar.set(FRANCHISE_COOKIE, token, cookieOptions(TWELVE_HOURS_SECONDS));
}
