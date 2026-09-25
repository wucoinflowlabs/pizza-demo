import "server-only";
import { PaymentsError } from "./payments/errors";
import {
  getSettlementAddresses,
  setSubmerchantSettlementAddress,
  type SettlementAddresses,
} from "./payments/settlement";

export type SettlementSetupState =
  | "configured"
  | "pending_approval"
  | "conflict"
  | "unavailable"
  | "error";

type ChainOutcome = Exclude<SettlementSetupState, "unavailable">;

// Worst outcome wins, so one failing chain isn't hidden behind another that succeeded.
const SEVERITY: ChainOutcome[] = ["error", "conflict", "pending_approval", "configured"];

async function settleChain({
  submerchantId,
  blockchain,
  address,
  current,
}: {
  submerchantId: string;
  blockchain: string;
  address: string;
  current?: string;
}): Promise<ChainOutcome> {
  if (current === address) return "configured";
  if (current) return "conflict";
  try {
    await setSubmerchantSettlementAddress({ submerchantId, blockchain, address });
    return "configured";
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "PENDING_APPROVAL") return "pending_approval";
    if (err instanceof PaymentsError && err.code === "SETTLEMENT_ALREADY_SET") return "conflict";
    console.error(`[settlement] setting ${blockchain} for ${submerchantId} failed`, err);
    return "error";
  }
}

/**
 * Points a sub-merchant's settlement at Adora's own settlement wallet(s),
 * chain by chain. Idempotent: chains that already match are skipped. Pass
 * addresses you've already fetched to avoid re-reading them.
 */
export async function alignSettlementWithParent({
  submerchantId,
  parent,
  child,
}: {
  submerchantId: string;
  parent?: SettlementAddresses;
  child?: SettlementAddresses;
}): Promise<SettlementSetupState> {
  try {
    const [parentAddresses, childAddresses] = await Promise.all([
      parent ?? getSettlementAddresses(),
      child ?? getSettlementAddresses(submerchantId),
    ]);
    const chains = Object.entries(parentAddresses);
    if (!chains.length) return "unavailable";

    const outcomes = await Promise.all(
      chains.map(([blockchain, address]) =>
        settleChain({ submerchantId, blockchain, address, current: childAddresses[blockchain] }),
      ),
    );
    return SEVERITY.find((outcome) => outcomes.includes(outcome)) ?? "error";
  } catch (err) {
    console.error(`[settlement] setup for ${submerchantId} failed`, err);
    return "error";
  }
}

export type PayoutStatus = "set" | "missing" | "conflict" | "waiting" | "unavailable";

/** Read-only view of where a sub-merchant stands relative to Adora's wallets. */
export function payoutStatus({
  approved,
  parent,
  child,
}: {
  approved: boolean;
  parent: SettlementAddresses;
  child: SettlementAddresses;
}): PayoutStatus {
  const chains = Object.entries(parent);
  if (!chains.length) return "unavailable";
  if (chains.some(([chain, address]) => child[chain] && child[chain] !== address)) return "conflict";
  if (chains.every(([chain, address]) => child[chain] === address)) return "set";
  return approved ? "missing" : "waiting";
}
