import "server-only";
import { getWithdrawerProfile } from "@/lib/payments/withdraws";
import type { WithdrawerRow } from "./withdrawals";

/** Fetches each row's profile in parallel to pick up `kycName`. Falls through on errors. */
export async function withNames(submerchantId: string, rows: WithdrawerRow[]): Promise<WithdrawerRow[]> {
  const names = await Promise.all(
    rows.map(async (row) => {
      try {
        const profile = await getWithdrawerProfile(submerchantId, row.id);
        return profile?.kycName?.trim() || undefined;
      } catch {
        // The list has to still render even when one profile fetch fails.
        return undefined;
      }
    }),
  );
  return rows.map((row, index) => ({ ...row, name: names[index] }));
}
