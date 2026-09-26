import "server-only";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "./signing";

const ACCOUNT_COOKIE = "za_account";
const OPERATOR_COOKIE = "za_operator";
const MERCHANT_COOKIE = "za_merchant";
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

export async function clearCurrentAccountId() {
  (await cookies()).delete(ACCOUNT_COOKIE);
}

export async function isOperator(): Promise<boolean> {
  const token = (await cookies()).get(OPERATOR_COOKIE)?.value;
  return verifyToken({ token, purpose: "operator" }) === "operator";
}

export async function startOperatorSession() {
  const token = signToken({
    purpose: "operator",
    subject: "operator",
    ttlSeconds: TWELVE_HOURS_SECONDS,
  });
  (await cookies()).set(OPERATOR_COOKIE, token, cookieOptions(TWELVE_HOURS_SECONDS));
}

export async function endOperatorSession() {
  (await cookies()).delete(OPERATOR_COOKIE);
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
  (await cookies()).set(MERCHANT_COOKIE, token, cookieOptions(TWELVE_HOURS_SECONDS));
}

export async function endMerchantSession() {
  (await cookies()).delete(MERCHANT_COOKIE);
}
