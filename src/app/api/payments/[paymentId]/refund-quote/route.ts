import { NextResponse, type NextRequest } from "next/server";
import { resolvePaymentSubmerchant } from "@/features/dashboard/session-submerchant";
import { quoteRefund } from "@/lib/payments/payments";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/payments/[paymentId]/refund-quote">) {
  const submerchantId = await resolvePaymentSubmerchant(request.nextUrl.searchParams.get("location"));
  if (!submerchantId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { paymentId } = await ctx.params;
  const partial = request.nextUrl.searchParams.get("partialAmount");
  const partialCents = partial === null ? undefined : Number(partial);
  if (partialCents !== undefined && !(Number.isInteger(partialCents) && partialCents > 0))
    return NextResponse.json({ error: "Enter an amount greater than zero." }, { status: 400 });

  try {
    const quote = await quoteRefund(submerchantId, paymentId, partialCents);
    return NextResponse.json({
      subtotalCents: quote.subtotal?.cents ?? 0,
      feeCents: quote.processorFees?.cents ?? 0,
      totalCents: quote.total?.cents ?? 0,
    });
  } catch (err) {
    console.error("[dashboard] refund quote failed", err);
    return NextResponse.json({ error: "A refund quote isn't available right now." }, { status: 502 });
  }
}
