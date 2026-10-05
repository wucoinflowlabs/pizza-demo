import "server-only";
import { PaymentsError } from "@/lib/payments/errors";
import { listWithdrawers, listWithdraws } from "@/lib/payments/withdraws";
import { shopTimeZone } from "./load-payments-series";
import { rangeBounds, type WithdrawRange } from "./withdraw-range";
import { toWithdrawerRow, toWithdrawRow, type WithdrawerRow, type WithdrawRow } from "./withdrawals";

function failure(err: unknown, what: string) {
  console.error(`[dashboard] ${what} could not be loaded`, err);
  const message = err instanceof PaymentsError ? err.userMessage : `${what} couldn't be loaded right now.`;
  return { ok: false as const, message };
}

export type WithdrawersResult = { ok: true; withdrawers: WithdrawerRow[] } | { ok: false; message: string };

export async function loadWithdrawers({
  submerchantId,
  search,
}: {
  submerchantId: string;
  search?: string;
}): Promise<WithdrawersResult> {
  try {
    const rows = await listWithdrawers(submerchantId, { search });
    return { ok: true, withdrawers: (Array.isArray(rows) ? rows : []).map(toWithdrawerRow) };
  } catch (err) {
    return failure(err, "Withdrawers");
  }
}

export type WithdrawsResult = { ok: true; withdraws: WithdrawRow[]; now: string } | { ok: false; message: string };

export async function loadWithdraws({
  submerchantId,
  range,
  timeZone,
  search,
}: {
  submerchantId: string;
  range: WithdrawRange;
  timeZone: string;
  search?: string;
}): Promise<WithdrawsResult> {
  try {
    const rows = await listWithdraws(submerchantId, { ...rangeBounds(range, timeZone), search });
    return { ok: true, withdraws: rows.map(toWithdrawRow), now: new Date().toISOString() };
  } catch (err) {
    return failure(err, "Withdrawals");
  }
}

export { shopTimeZone };
