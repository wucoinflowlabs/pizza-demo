import { NextResponse, type NextRequest } from "next/server";
import { toPaymentDetail } from "@/features/dashboard/payment-detail";
import { resolvePaymentSubmerchant } from "@/features/dashboard/session-submerchant";
import { PaymentsError } from "@/lib/payments/errors";
import { getMerchantPayment } from "@/lib/payments/payments";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/payments/[paymentId]">) {
  const submerchantId = await resolvePaymentSubmerchant(request.nextUrl.searchParams.get("location"));
  if (!submerchantId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { paymentId } = await ctx.params;
  try {
    const payment = await getMerchantPayment(submerchantId, paymentId);
    if (!payment?.paymentId)
      return NextResponse.json({ error: "This payment couldn't be found." }, { status: 404 });
    return NextResponse.json(toPaymentDetail(payment));
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "NOT_FOUND")
      return NextResponse.json({ error: "This payment couldn't be found." }, { status: 404 });
    console.error("[dashboard] payment could not be loaded", err);
    return NextResponse.json({ error: "This payment couldn't be loaded right now." }, { status: 502 });
  }
}
