import "server-only";
import { paymentsRequest } from "./client";

/** Chain → address, e.g. `{ solana: "…" }`. */
export type SettlementAddresses = Record<string, string>;

export type RawSettlementAddresses = Record<string, unknown> | undefined;

// `settlementAddresses` also carries metadata alongside the per-chain addresses.
const NON_CHAIN_KEYS = new Set([
  "recipientAddresses",
  "mpcWalletProvider",
  "verification",
  "directVendor",
]);

export function chainAddresses(raw: RawSettlementAddresses): SettlementAddresses {
  return Object.fromEntries(
    Object.entries(raw ?? {}).filter(
      (entry): entry is [string, string] =>
        !NON_CHAIN_KEYS.has(entry[0]) && typeof entry[1] === "string" && entry[1].length > 0,
    ),
  );
}

type MerchantSettlementResponse = {
  merchant: { settlementAddresses?: RawSettlementAddresses; settlementToken?: string };
};

/** Reads the settlement wallets of the API key's merchant, or of a sub-merchant. */
export async function getSettlementAddresses(
  asSubmerchant?: string,
): Promise<SettlementAddresses> {
  const { merchant } = await paymentsRequest<MerchantSettlementResponse>({
    method: "GET",
    path: "/merchant/v2",
    asSubmerchant,
  });
  return chainAddresses(merchant.settlementAddresses);
}

/**
 * Can be set once per chain, and only after the provider has approved the
 * account (a blocked account gets PENDING_APPROVAL).
 */
export function setSubmerchantSettlementAddress({
  submerchantId,
  blockchain,
  address,
}: {
  submerchantId: string;
  blockchain: string;
  address: string;
}) {
  return paymentsRequest<unknown>({
    method: "POST",
    path: "/merchant/settlement-address",
    body: { blockchain, address },
    asSubmerchant: submerchantId,
  });
}
