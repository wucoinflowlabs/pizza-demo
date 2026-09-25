import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  PAYMENTS_API_BASE_URL: z
    .url()
    .default("https://api-sandbox.coinflow.cash/api")
    .transform((url) => url.replace(/\/+$/, "")),
  PAYMENTS_API_KEY: z.string().min(1, "PAYMENTS_API_KEY is not set"),
});

let cached: z.infer<typeof EnvSchema> | undefined;

export function getPaymentsEnv() {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse({
    PAYMENTS_API_BASE_URL: process.env.PAYMENTS_API_BASE_URL || undefined,
    PAYMENTS_API_KEY: process.env.PAYMENTS_API_KEY,
  });
  if (!parsed.success)
    throw new Error(
      `Invalid payments configuration (check .env.local): ${z.prettifyError(parsed.error)}`,
    );

  cached = parsed.data;
  return cached;
}
