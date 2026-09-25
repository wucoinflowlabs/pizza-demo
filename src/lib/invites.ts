import "server-only";
import { headers } from "next/headers";
import { signToken, verifyToken } from "./signing";

const INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function createInviteUrl(accountId: string): Promise<string> {
  const token = signToken({
    purpose: "invite",
    subject: accountId,
    ttlSeconds: INVITE_TTL_SECONDS,
  });
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}/invite/${token}`;
}

export function readInviteToken(token: string): string | undefined {
  return verifyToken({ token, purpose: "invite" });
}
