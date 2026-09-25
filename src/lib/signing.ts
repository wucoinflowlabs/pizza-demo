import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const value = process.env.APP_SECRET;
  if (!value || value.length < 16)
    throw new Error("APP_SECRET must be set (16+ chars) in .env.local");
  return value;
}

function hmac(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** `<base64url(json)>.<hmac>` with an expiry, e.g. for invite links and cookies. */
export function signToken({
  purpose,
  subject,
  ttlSeconds,
}: {
  purpose: string;
  subject: string;
  ttlSeconds: number;
}): string {
  const payload = Buffer.from(
    JSON.stringify({
      p: purpose,
      s: subject,
      e: Math.floor(Date.now() / 1000) + ttlSeconds,
    }),
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifyToken({
  token,
  purpose,
}: {
  token: string | undefined;
  purpose: string;
}): string | undefined {
  if (!token) return undefined;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return undefined;

  const expected = Buffer.from(hmac(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return undefined;

  try {
    const { p, s, e } = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as { p: string; s: string; e: number };
    if (p !== purpose || e < Date.now() / 1000) return undefined;
    return s;
  } catch {
    return undefined;
  }
}
