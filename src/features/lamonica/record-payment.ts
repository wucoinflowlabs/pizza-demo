"use server";

import { z } from "zod";
import { recordCheckoutPayment } from "@/features/dashboard/tips/write-tip";

const Input = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  subtotalCents: z.number().int().nonnegative(),
  tipCents: z.number().int().nonnegative(),
});

/** Writes the completed online order into Supabase. Its tip stays off teststaff's balance. */
export async function recordLamonicaPaymentAction(
  raw: z.input<typeof Input>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid payment payload." };

  const result = await recordCheckoutPayment({
    subtotalCents: parsed.data.subtotalCents,
    tipCents: parsed.data.tipCents,
    cfPaymentId: parsed.data.paymentId,
  });
  if (!result.ok) return { ok: false, error: result.reason };
  return { ok: true };
}
