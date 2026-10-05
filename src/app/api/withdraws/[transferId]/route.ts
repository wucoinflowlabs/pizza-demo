import { NextResponse, type NextRequest } from "next/server";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { ENHANCED_SPEEDS, toWithdrawDetail } from "@/features/dashboard/withdrawals";
import { PaymentsError } from "@/lib/payments/errors";
import { getWithdraw, getWithdrawEnhancedInfo } from "@/lib/payments/withdraws";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/withdraws/[transferId]">) {
  const session = await getSessionSubmerchant();
  if (!session?.submerchantId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { submerchantId } = session;

  const { transferId } = await ctx.params;
  try {
    const withdraw = await getWithdraw(submerchantId, transferId);
    if (!withdraw?.transferId)
      return NextResponse.json({ error: "This withdrawal couldn't be found." }, { status: 404 });
    const enhanced = ENHANCED_SPEEDS.has(withdraw.speed ?? "")
      ? await getWithdrawEnhancedInfo(submerchantId, withdraw.transferId).catch((err) => {
          console.error("[dashboard] withdrawal recipient could not be loaded", err);
          return undefined;
        })
      : undefined;
    return NextResponse.json(toWithdrawDetail(withdraw, enhanced));
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "NOT_FOUND")
      return NextResponse.json({ error: "This withdrawal couldn't be found." }, { status: 404 });
    console.error("[dashboard] withdrawal could not be loaded", err);
    return NextResponse.json({ error: "This withdrawal couldn't be loaded right now." }, { status: 502 });
  }
}
