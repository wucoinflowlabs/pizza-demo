"use server";

import { z } from "zod";
import { PaymentsError } from "@/lib/payments/errors";
import { refundPayment } from "@/lib/payments/payments";
import { resolvePaymentSubmerchant } from "./session-submerchant";

const RefundInput = z.object({
  paymentId: z.string().min(1),
  reason: z.enum(["userCancellation", "failedFulfillment", "buyerFraud", "other"]),
  partialCents: z.number().int().positive().optional(),
  /** A franchise owner's store id. Ignored for a single-store login. */
  location: z.string().optional(),
});

/** The provider's own explanation when it's a readable sentence, otherwise a generic message. */
function refundErrorMessage(err: unknown) {
  if (!(err instanceof PaymentsError)) return "The refund couldn't be sent. Please try again.";
  const detail = err.message.replace(/^\d{3}:\s*/, "").trim();
  return detail && detail.length <= 200 && !detail.startsWith("{") ? detail : err.userMessage;
}

export async function refundPaymentAction(
  input: z.input<typeof RefundInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = RefundInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the refund amount and reason." };

  const { paymentId, reason, partialCents, location } = parsed.data;
  const submerchantId = await resolvePaymentSubmerchant(location);
  if (!submerchantId) return { ok: false, error: "Your session has ended. Sign in again." };

  try {
    await refundPayment(submerchantId, paymentId, { reason, partialCents });
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] refund failed", err);
    return { ok: false, error: refundErrorMessage(err) };
  }
}
