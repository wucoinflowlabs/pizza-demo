"use server";

import { z } from "zod";
import { chargedRates, feeScheduleFor, marketplaceFeePercent, type ChargedRates } from "@/features/statements/fee-schedule";
import { createCheckoutJwt } from "@/lib/payments/checkout";
import { PaymentsError } from "@/lib/payments/errors";
import { LAMONICA_MERCHANT_ID, orderTotals } from "./menu";

/** The Adora customer whose fee schedule Lamonica's sales are charged under. */
const LAMONICA_CUSTOMER_ID = "lamonica";
const MAX_TOTAL_CENTS = 100_000;

const Input = z.object({
  lines: z.array(z.object({ id: z.string().min(1).max(64), qty: z.number().int().min(1).max(50) })).min(1).max(50),
  tipCents: z.number().int().min(0).max(100_000).optional(),
});

/**
 * Signs the order's amount and Adora's marketplace fee (SaaS + royalty) so
 * Coinflow nets them out of the payment before Lamonica settles. The total is
 * recomputed from the menu here; the browser only says what's in the cart.
 */
export async function createLamonicaCheckoutToken(
  input: z.input<typeof Input>,
): Promise<{ jwtToken: string; fees: ChargedRates } | { error: string }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "We couldn't start checkout. Please try again." };

  const { totalCents: linesTotal } = orderTotals(parsed.data.lines);
  const tipCents = parsed.data.tipCents ?? 0;
  const totalCents = linesTotal + tipCents;
  if (totalCents < 50 || totalCents > MAX_TOTAL_CENTS) {
    return { error: "We couldn't start checkout. Please try again." };
  }

  const schedule = feeScheduleFor(LAMONICA_CUSTOMER_ID);
  const fees = chargedRates(schedule);
  try {
    const jwtToken = await createCheckoutJwt(LAMONICA_MERCHANT_ID, {
      subtotal: { cents: totalCents, currency: "USD" },
      feePercentage: marketplaceFeePercent(schedule),
      webhookInfo: { fees, tipCents },
    });
    return { jwtToken, fees };
  } catch (err) {
    console.error("[lamonica] checkout token failed", err);
    if (err instanceof PaymentsError) return { error: err.userMessage };
    return { error: "Checkout is unavailable right now. Please try again." };
  }
}
