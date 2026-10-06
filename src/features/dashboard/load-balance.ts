import "server-only";
import { cache } from "react";
import { getPayoutBalance } from "@/lib/payments/withdraws";
import { enrolledLocations, getSessionFranchise } from "./franchise";
import { getSessionSubmerchant } from "./session-submerchant";

export type AccountBalance = {
  cents: number;
  /** How many accounts were added together: one, or a franchise's enrolled locations. */
  accounts: number;
  /** Accounts whose balance couldn't be loaded, so `cents` leaves them out. */
  missing: number;
};

/**
 * The signed-in account's payout balance, straight from Coinflow. A franchise
 * owner sees every enrolled location's balance added together. Undefined when
 * there's no enrolled account, or no balance could be loaded at all. Cached per
 * request because the sidebar renders twice (desktop and mobile).
 */
export const loadAccountBalance = cache(async (): Promise<AccountBalance | undefined> => {
  const franchise = await getSessionFranchise();
  const submerchantIds = franchise
    ? enrolledLocations(franchise.locations).map((location) => location.submerchantId)
    : [(await getSessionSubmerchant())?.submerchantId].filter((id): id is string => !!id);
  if (submerchantIds.length === 0) return undefined;

  const results = await Promise.allSettled(submerchantIds.map(getPayoutBalance));
  let cents = 0;
  let missing = 0;
  for (const result of results) {
    if (result.status === "fulfilled") cents += result.value;
    else {
      missing++;
      console.error("[dashboard] loading payout balance failed", result.reason);
    }
  }
  return missing === results.length ? undefined : { cents, accounts: results.length, missing };
});
