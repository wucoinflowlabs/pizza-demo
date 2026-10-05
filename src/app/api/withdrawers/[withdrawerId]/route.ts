import { NextResponse, type NextRequest } from "next/server";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { toWithdrawerProfile } from "@/features/dashboard/withdrawals";
import { PaymentsError } from "@/lib/payments/errors";
import { getWithdrawerAuditLogs, getWithdrawerProfile } from "@/lib/payments/withdraws";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/withdrawers/[withdrawerId]">) {
  const session = await getSessionSubmerchant();
  if (!session?.submerchantId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { withdrawerId } = await ctx.params;
  try {
    const [profile, auditLogs] = await Promise.all([
      getWithdrawerProfile(session.submerchantId, withdrawerId),
      // The audit log is secondary; the drawer still opens without it.
      getWithdrawerAuditLogs(session.submerchantId, withdrawerId).catch((err) => {
        console.error("[dashboard] withdrawer audit log could not be loaded", err);
        return [];
      }),
    ]);
    return NextResponse.json(toWithdrawerProfile(profile ?? {}, Array.isArray(auditLogs) ? auditLogs : []));
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "NOT_FOUND")
      return NextResponse.json({ error: "This withdrawer couldn't be found." }, { status: 404 });
    console.error("[dashboard] withdrawer could not be loaded", err);
    return NextResponse.json({ error: "This withdrawer couldn't be loaded right now." }, { status: 502 });
  }
}
