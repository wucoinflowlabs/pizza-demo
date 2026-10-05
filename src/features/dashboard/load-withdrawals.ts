import "server-only";
import { PaymentsError } from "@/lib/payments/errors";
import { listWithdrawers, listWithdraws } from "@/lib/payments/withdraws";
import { withNames } from "./load-withdrawer-names";
import { shopTimeZone } from "./load-payments-series";
import type { OrderLocation } from "./orders";
import { rangeBounds, type WithdrawRange } from "./withdraw-range";
import { toWithdrawerRow, toWithdrawRow, type WithdrawerRow, type WithdrawRow } from "./withdrawals";

/** One sub-merchant to read withdrawers/withdrawals from. A franchise has one per store. */
export type WithdrawalsSource = { submerchantId: string; location?: OrderLocation };

function failure(err: unknown, what: string) {
  console.error(`[dashboard] ${what} could not be loaded`, err);
  const message = err instanceof PaymentsError ? err.userMessage : `${what} couldn't be loaded right now.`;
  return { ok: false as const, message };
}

/** Fans a per-source read out in parallel, so one store failing leaves the rest. */
async function fanOut<T>(
  sources: WithdrawalsSource[],
  what: string,
  read: (source: WithdrawalsSource) => Promise<T[]>,
) {
  const results = await Promise.allSettled(sources.map(read));
  const failures = results.flatMap((result, index) => (result.status === "rejected" ? [index] : []));
  if (sources.length > 0 && failures.length === sources.length) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
  for (const index of failures) {
    console.error(
      `[dashboard] ${what} for ${sources[index].submerchantId} could not be loaded`,
      (results[index] as PromiseRejectedResult).reason,
    );
  }
  const rows = results.flatMap((result, index) =>
    result.status === "fulfilled" ? result.value.map((row) => ({ row, index })) : [],
  );
  const failedLocations = failures.map(
    (index) => sources[index].location?.label ?? sources[index].submerchantId,
  );
  return { rows, failedLocations };
}

export type WithdrawersResult =
  | { ok: true; withdrawers: WithdrawerRow[]; failedLocations: string[] }
  | { ok: false; message: string };

export async function loadWithdrawers({
  sources,
  search,
}: {
  sources: WithdrawalsSource[];
  search?: string;
}): Promise<WithdrawersResult> {
  try {
    const { rows, failedLocations } = await fanOut(sources, "withdrawers", async (source) => {
      const rows = await listWithdrawers(source.submerchantId, { search });
      const flattened = (Array.isArray(rows) ? rows : []).map(toWithdrawerRow);
      // Names come from each withdrawer's profile; keep the sub-merchant scope.
      const named = await withNames(source.submerchantId, flattened);
      return named.map((row) => ({ ...row, location: source.location }));
    });
    const withdrawers = rows.map(({ row }) => row);
    return { ok: true, withdrawers, failedLocations };
  } catch (err) {
    return failure(err, "Withdrawers");
  }
}

export type WithdrawsResult =
  | { ok: true; withdraws: WithdrawRow[]; now: string; failedLocations: string[] }
  | { ok: false; message: string };

export async function loadWithdraws({
  sources,
  range,
  timeZone,
  search,
}: {
  sources: WithdrawalsSource[];
  range: WithdrawRange;
  timeZone: string;
  search?: string;
}): Promise<WithdrawsResult> {
  try {
    const bounds = rangeBounds(range, timeZone);
    const { rows, failedLocations } = await fanOut(sources, "withdrawals", async (source) =>
      (await listWithdraws(source.submerchantId, { ...bounds, search }))
        .map(toWithdrawRow)
        .map((row) => ({ ...row, location: source.location })),
    );
    const withdraws = rows
      .map(({ row }) => row)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return { ok: true, withdraws, now: new Date().toISOString(), failedLocations };
  } catch (err) {
    return failure(err, "Withdrawals");
  }
}

export { shopTimeZone };
