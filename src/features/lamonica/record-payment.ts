"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { LAMONICA_MERCHANT_ID } from "./menu";
import { recordCheckoutPayment } from "@/features/dashboard/tips/write-tip";

const Input = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  subtotalCents: z.number().int().nonnegative(),
  tipCents: z.number().int().nonnegative(),
  totalCents: z.number().int().positive(),
  paymentMethod: z.string().default("card"),
});

/** Writes the completed order + payment into Supabase so the Tips ledger sees it. */
export async function recordLamonicaPaymentAction(
  raw: z.input<typeof Input>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid payment payload." };

  const supabase = getSupabaseAdmin();
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("cf_submerchant_id", LAMONICA_MERCHANT_ID)
    .maybeSingle();
  if (!shop?.id) return { ok: false, error: `No shops row for ${LAMONICA_MERCHANT_ID}` };

  const result = await recordCheckoutPayment({
    shopId: shop.id,
    orderTicket: parsed.data.orderId,
    subtotalCents: parsed.data.subtotalCents,
    tipCents: parsed.data.tipCents,
    totalCents: parsed.data.totalCents,
    paymentMethod: parsed.data.paymentMethod,
    cfPaymentId: parsed.data.paymentId,
  });
  if (!result.ok) return { ok: false, error: result.reason };
  return { ok: true };
}
