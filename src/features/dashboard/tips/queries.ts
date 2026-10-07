import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Westwood-only, minimal tip ledger: all queries read from the slimmed
 * payments table (`payment_id, subtotal_cents, tip_cents, total_cents`).
 * With no timestamps on the row, "today" and "this week" collapse into the
 * same lifetime total; the UI still renders all three cards for continuity.
 */

export type TipSummary = {
  todayCents: number;
  weekCents: number;
  unpaidCents: number;
  lastPayout?: { atIso: string; cents: number };
};

export async function loadTipSummary(_: {
  shopId?: string;
  staffId?: string;
  timeZone?: string;
  now?: Date;
} = {}): Promise<TipSummary> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.from("payments").select("tip_cents");
  if (error) {
    console.error("[tips] accrual query failed", error);
    return { todayCents: 0, weekCents: 0, unpaidCents: 0 };
  }

  const totalTipsCents = (rows ?? []).reduce((sum, row) => sum + (row.tip_cents ?? 0), 0);

  // Cash-outs still net against the accrual (payouts table is untouched by this round).
  const { data: paidRows } = await supabase
    .from("payouts")
    .select("amount_cents, created_at")
    .in("status", ["pending", "completed"])
    .order("created_at", { ascending: false });
  const paidCents = (paidRows ?? []).reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  const latest = paidRows?.[0];
  return {
    todayCents: totalTipsCents,
    weekCents: totalTipsCents,
    unpaidCents: Math.max(0, totalTipsCents - paidCents),
    lastPayout: latest ? { atIso: latest.created_at, cents: latest.amount_cents } : undefined,
  };
}

export type SettledTip = {
  paymentId: string;
  orderTicket: string;
  tipCents: number;
  totalCents: number;
  settledAt: string;
};

export async function loadRecentTippedPayments({
  limit = 20,
}: { shopId?: string; staffId?: string; limit?: number } = {}): Promise<SettledTip[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payments")
    .select("payment_id, tip_cents, total_cents")
    .gt("tip_cents", 0)
    .order("payment_id", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[tips] recent query failed", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    paymentId: row.payment_id,
    orderTicket: row.payment_id,
    tipCents: row.tip_cents,
    totalCents: row.total_cents,
    // No timestamp on the row; the drawer renders this as an empty slot.
    settledAt: "",
  }));
}
