"use server";

import { z } from "zod";
import { PaymentsError } from "@/lib/payments/errors";
import { randomUUID } from "node:crypto";
import {
  quoteRealPayout,
  realPayoutStatus,
  sendRealPayout,
  sendSandboxMirrorPayout,
  type ProdPayoutQuote,
  type RealPayoutStatus,
} from "@/lib/payments/real-payout";
import { getSessionSubmerchant } from "./session-submerchant";

/** The sandbox withdrawer whose Send click is allowed to trigger the real payout. */
const PayoutInput = z.object({
  /** The sandbox row's wallet / user id. Must match the configured trigger id. */
  sandboxUserId: z.string().min(1),
  cents: z.number().int().positive(),
  idempotencyKey: z.string().uuid().optional(),
});

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

type Guard = { data: z.infer<typeof PayoutInput> } | { error: string };

async function guard(input: z.input<typeof PayoutInput>): Promise<Guard> {
  const status = realPayoutStatus();
  if (!status.enabled) return { error: "Production payouts are not configured." };
  const session = await getSessionSubmerchant();
  if (!session?.submerchantId) return { error: "Your session has ended. Sign in again." };
  const parsed = PayoutInput.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid amount." };
  if (parsed.data.sandboxUserId !== status.userId)
    return { error: "This staff record isn't wired for real payouts." };
  return { data: parsed.data };
}

export async function realPayoutStatusAction(): Promise<RealPayoutStatus> {
  return realPayoutStatus();
}

export async function quoteRealPayoutAction(
  input: z.input<typeof PayoutInput>,
): Promise<Result<{ quote: ProdPayoutQuote }>> {
  const guarded = await guard(input);
  if ("error" in guarded) return { ok: false, error: guarded.error };
  try {
    const quote = await quoteRealPayout({ cents: guarded.data.cents });
    return { ok: true, quote };
  } catch (err) {
    console.error("[real-payout] quote failed", err);
    return { ok: false, error: err instanceof PaymentsError ? err.userMessage : "Couldn't quote this payout." };
  }
}

export async function sendRealPayoutAction(
  input: z.input<typeof PayoutInput>,
): Promise<Result<{ signature?: string }>> {
  const guarded = await guard(input);
  if ("error" in guarded) return { ok: false, error: guarded.error };
  const session = await getSessionSubmerchant();
  const submerchantId = session?.submerchantId;
  const { cents, idempotencyKey = randomUUID() } = guarded.data;

  // Fires in parallel with prod. We don't wait on it, and its failure never
  // blocks the real payout. Succeeds once the current sub-merchant has an MPC
  // wallet + CFUSD balance; before that, this logs a 400 and moves on. The
  // record then shows up in the sandbox Withdraws tab for the demo mirror.
  const mirror = submerchantId
    ? sendSandboxMirrorPayout({ submerchantId, cents, idempotencyKey }).catch((err) => {
        console.warn(`[real-payout] sandbox mirror failed on ${submerchantId}`, err instanceof PaymentsError ? err.message : err);
        return null;
      })
    : Promise.resolve(null);

  try {
    const [prodResult] = await Promise.all([
      sendRealPayout({ cents, idempotencyKey }),
      mirror,
    ]);
    return { ok: true, signature: prodResult.signature };
  } catch (err) {
    console.error("[real-payout] send failed", err);
    return { ok: false, error: err instanceof PaymentsError ? err.userMessage : "Couldn't send this payout." };
  }
}
