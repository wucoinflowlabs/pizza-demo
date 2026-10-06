import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type TipSummary = {
  /** Total tips earned so far today (shop's local calendar day). */
  todayCents: number;
  /** Total tips earned in the last 7 shop-days. */
  weekCents: number;
  /** Tips not yet cashed out — unpaid balance available for Cash Out. */
  unpaidCents: number;
  /** Most recent paid-out amount for this staff, if any. */
  lastPayout?: { atIso: string; cents: number };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function shopDay(timeZone: string, at: Date) {
  // en-CA renders as YYYY-MM-DD.
  return at.toLocaleDateString("en-CA", { timeZone });
}

/**
 * Rolls up tips earned (payments.tip_cents on orders handled by this staff)
 * against tips already paid out (payouts linked via payout_accounts.staff_id).
 * The unpaid balance is a simple accrual-minus-cashout; no per-payment flag.
 */
export async function loadTipSummary({
  shopId,
  staffId,
  timeZone,
  now = new Date(),
}: {
  shopId: string;
  staffId: string;
  timeZone: string;
  now?: Date;
}): Promise<TipSummary> {
  const supabase = getSupabaseAdmin();
  const today = shopDay(timeZone, now);
  const weekAgo = shopDay(timeZone, new Date(now.getTime() - WEEK_MS));

  // Only paid payments count — ignore pending/failed. Join to orders by server_id.
  const { data: tipRows, error: tipErr } = await supabase
    .from("payments")
    .select("tip_cents,created_at,orders!inner(server_id,business_date,shop_id)")
    .eq("status", "settled")
    .eq("orders.shop_id", shopId)
    .eq("orders.server_id", staffId)
    .gte("orders.business_date", weekAgo);
  if (tipErr) {
    console.error("[tips] accrual query failed", tipErr);
    return { todayCents: 0, weekCents: 0, unpaidCents: 0 };
  }

  // Supabase types the embedded order as an array when fk is non-unique.
  type Row = {
    tip_cents: number;
    orders: { business_date: string } | { business_date: string }[];
  };
  const businessDate = (row: Row) =>
    Array.isArray(row.orders) ? row.orders[0]?.business_date : row.orders.business_date;
  const rows = (tipRows ?? []) as unknown as Row[];
  const weekCents = rows.reduce((sum, row) => sum + (row.tip_cents ?? 0), 0);
  const todayCents = rows
    .filter((row) => businessDate(row) === today)
    .reduce((sum, row) => sum + (row.tip_cents ?? 0), 0);

  // Payouts settled for this staff via any of their payout_accounts.
  const { data: paidRows, error: paidErr } = await supabase
    .from("payouts")
    .select("amount_cents,created_at,status,payout_accounts!inner(staff_id,shop_id)")
    .eq("payout_accounts.shop_id", shopId)
    .eq("payout_accounts.staff_id", staffId)
    .in("status", ["pending", "completed"])
    .gte("created_at", new Date(now.getTime() - WEEK_MS).toISOString())
    .order("created_at", { ascending: false });
  if (paidErr) {
    console.error("[tips] payout query failed", paidErr);
    return { todayCents, weekCents, unpaidCents: weekCents };
  }

  const paidThisWeekCents = (paidRows ?? []).reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  const unpaidCents = Math.max(0, weekCents - paidThisWeekCents);
  const latest = paidRows?.[0];
  return {
    todayCents,
    weekCents,
    unpaidCents,
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

/** Recent tipped payments for this staff (most recent first), for the Tips page activity list. */
export async function loadRecentTippedPayments({
  shopId,
  staffId,
  limit = 20,
}: {
  shopId: string;
  staffId: string;
  limit?: number;
}): Promise<SettledTip[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payments")
    .select("id,amount_cents,tip_cents,created_at,orders!inner(ticket_number,server_id,shop_id)")
    .eq("status", "settled")
    .gt("tip_cents", 0)
    .eq("orders.shop_id", shopId)
    .eq("orders.server_id", staffId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[tips] recent query failed", error);
    return [];
  }
  type Row = {
    id: string;
    amount_cents: number;
    tip_cents: number;
    created_at: string;
    orders: { ticket_number: string } | { ticket_number: string }[];
  };
  const rows = (data ?? []) as unknown as Row[];
  const ticket = (row: Row) =>
    Array.isArray(row.orders) ? row.orders[0]?.ticket_number : row.orders.ticket_number;
  return rows.map((row) => ({
    paymentId: row.id,
    orderTicket: ticket(row) ?? "",
    tipCents: row.tip_cents,
    totalCents: row.amount_cents,
    settledAt: row.created_at,
  }));
}
