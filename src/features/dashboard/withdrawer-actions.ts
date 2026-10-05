"use server";

import { z } from "zod";
import { PaymentsError } from "@/lib/payments/errors";
import { setWithdrawerAvailability } from "@/lib/payments/withdraws";
import { getSessionSubmerchant } from "./session-submerchant";

const AvailabilityInput = z.object({
  withdrawerId: z.string().min(1),
  status: z.enum(["Functional", "Blocked"]),
  reason: z.string().trim().min(1).max(500),
});

export async function setWithdrawerAvailabilityAction(
  input: z.input<typeof AvailabilityInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = AvailabilityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a reason for this change." };

  const session = await getSessionSubmerchant();
  if (!session?.submerchantId) return { ok: false, error: "Your session has ended. Sign in again." };

  const { withdrawerId, status, reason } = parsed.data;
  try {
    await setWithdrawerAvailability(session.submerchantId, withdrawerId, { status, reason });
    return { ok: true };
  } catch (err) {
    console.error("[dashboard] withdrawer block status update failed", err);
    return {
      ok: false,
      error: err instanceof PaymentsError ? err.userMessage : "The change couldn't be saved. Please try again.",
    };
  }
}
