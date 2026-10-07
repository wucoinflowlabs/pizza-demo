import "server-only";
import { getWithdrawerProfile } from "@/lib/payments/withdraws";
import type { CoinflowCustomerData } from "@/lib/payments/types";
import type { PayoutMethodChip, WithdrawerRow } from "./withdrawals";

const live = <T extends { isDeleted?: boolean }>(items: (T | undefined)[]) =>
  items.filter((item): item is T => !!item && !item.isDeleted);

/**
 * Display names for withdrawers Coinflow has no `kycName` for. The newest
 * Lamonica's Westwood withdrawer is that case; the tips drawer reads this name.
 */
const DEMO_NAMES_BY_EMAIL: Record<string, string> = {
  "chris+lamonica-westwood@coinflowlabs.app": "Chris Fashek",
};

/** Picks the staff's linked payout methods out of their customer profile. */
function payoutMethodsFrom(data: CoinflowCustomerData): PayoutMethodChip[] {
  const purses = data.purses ?? [];
  const chips: PayoutMethodChip[] = [];
  const venmo = live(purses.map((purse) => purse.venmo))[0];
  if (venmo) chips.push({ kind: "venmo", label: venmo.alias || "Venmo" });
  const paypal = live(purses.map((purse) => purse.paypal))[0];
  if (paypal) chips.push({ kind: "paypal", label: paypal.alias || "PayPal" });
  const bank = live(purses.flatMap((purse) => purse.accounts ?? []))[0];
  if (bank) chips.push({ kind: "bank", label: `Bank ····${bank.last4 ?? bank.token.slice(-4)}` });
  const card = live(purses.flatMap((purse) => purse.cards ?? []))[0];
  if (card) chips.push({ kind: "card", label: `Card ····${card.last4 ?? card.token.slice(-4)}` });
  const iban = live(purses.flatMap((purse) => purse.ibans ?? []))[0];
  if (iban) chips.push({ kind: "iban", label: `IBAN ····${iban.last4 ?? iban.token.slice(-4)}` });
  const pix = live(purses.flatMap((purse) => purse.pixes ?? []))[0];
  if (pix) chips.push({ kind: "pix", label: `PIX ····${pix.token.slice(-4)}` });
  const interac = live(purses.map((purse) => purse.interac))[0];
  if (interac) chips.push({ kind: "interac", label: interac.alias || "Interac" });
  return chips;
}

/**
 * Fetches each row's profile in parallel to pick up `kycName` and the linked
 * payout methods. Falls through on errors so one bad row doesn't blank the list.
 */
export async function withNames(submerchantId: string, rows: WithdrawerRow[]): Promise<WithdrawerRow[]> {
  const profiles = await Promise.all(
    rows.map(async (row) => {
      try {
        return await getWithdrawerProfile(submerchantId, row.id);
      } catch {
        return undefined;
      }
    }),
  );
  return rows.map((row, index) => {
    const profile = profiles[index];
    return {
      ...row,
      name: profile?.kycName?.trim() || (row.email ? DEMO_NAMES_BY_EMAIL[row.email] : undefined) || row.name,
      payoutMethods: profile ? payoutMethodsFrom(profile) : row.payoutMethods,
    };
  });
}
