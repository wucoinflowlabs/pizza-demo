import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_TIME_ZONE } from "@/features/dashboard/load-payments-series";
import { resolvePaymentSubmerchant } from "@/features/dashboard/session-submerchant";
import { loadRecentTippedPayments, loadTipSummary } from "@/features/dashboard/tips/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/tips/[cfUserId]">) {
  const submerchantId = await resolvePaymentSubmerchant(request.nextUrl.searchParams.get("location"));
  if (!submerchantId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  // shop_id is Supabase-side; resolve from cf_submerchant_id so this works for
  // both single-shop logins and franchise owners with a picked location.
  const { data: shop } = await supabase
    .from("shops")
    .select("id,timezone")
    .eq("cf_submerchant_id", submerchantId)
    .maybeSingle();
  if (!shop) {
    return NextResponse.json({
      staff: undefined,
      summary: { todayCents: 0, weekCents: 0, unpaidCents: 0 },
      recent: [],
      timeZone: DEFAULT_TIME_ZONE,
    });
  }

  const { cfUserId } = await ctx.params;
  const { data: staff } = await supabase
    .from("staff")
    .select("id,name,cf_user_id")
    .eq("shop_id", shop.id)
    .eq("cf_user_id", cfUserId)
    .maybeSingle();
  if (!staff) {
    return NextResponse.json({
      staff: undefined,
      summary: { todayCents: 0, weekCents: 0, unpaidCents: 0 },
      recent: [],
      timeZone: shop.timezone ?? DEFAULT_TIME_ZONE,
    });
  }

  const { data: venmo } = await supabase
    .from("payout_accounts")
    .select("display,cf_destination_id")
    .eq("shop_id", shop.id)
    .eq("staff_id", staff.id)
    .eq("rail", "venmo")
    .maybeSingle();

  const timeZone = shop.timezone ?? DEFAULT_TIME_ZONE;
  const [summary, recent] = await Promise.all([
    loadTipSummary({ shopId: shop.id, staffId: staff.id, timeZone }),
    loadRecentTippedPayments({ shopId: shop.id, staffId: staff.id }),
  ]);

  return NextResponse.json({
    staff: {
      id: staff.id,
      name: staff.name,
      cfUserId: staff.cf_user_id,
      venmo: venmo?.cf_destination_id ? { token: venmo.cf_destination_id, display: venmo.display ?? "Venmo" } : undefined,
    },
    summary,
    recent,
    timeZone,
  });
}
