/**
 * Adora's take rate on each restaurant's sales, collected by Coinflow on every
 * payment as one marketplace fee. Statements call it the processing fee.
 */
export type FeeSchedule = {
  /** Stamped on each payment so a statement can tell which rates it was charged. */
  version: string;
  /** Adora SaaS fee, in basis points of gross sales. */
  saasBps: number;
  /** Adora's flat fee per payment, in cents, collected with the SaaS percentage. */
  saasFixedCents: number;
  /** Franchise royalty, in basis points of gross sales. Adora collects it and remits it to the franchisor. */
  royaltyBps: number;
};

/** The rates a payment was charged, as stamped in its `webhookInfo.fees`. */
export type ChargedRates = Pick<FeeSchedule, "version" | "saasBps" | "saasFixedCents" | "royaltyBps">;

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  version: "2026-10-07",
  saasBps: 249,
  saasFixedCents: 30,
  royaltyBps: 0,
};

/** Charges that only appear on statements. Never sent to Coinflow. */
export const STATEMENT_CHARGES = {
  saasMonthlyCents: 6_900,
  hardwareMonthlyCentsPerDevice: 8_000,
  devicesPerLocation: 2,
  /** Paid to the franchise owner, in basis points of gross sales. */
  franchiseFeeBps: 500,
};

export type StatementCharges = typeof STATEMENT_CHARGES;

/** Franchise-specific terms, keyed by Adora customer id. */
const OVERRIDES: Record<string, Partial<FeeSchedule>> = {};

export function feeScheduleFor(customerId: string): FeeSchedule {
  return { ...DEFAULT_FEE_SCHEDULE, ...OVERRIDES[customerId] };
}

export function chargedRates({ version, saasBps, saasFixedCents, royaltyBps }: FeeSchedule): ChargedRates {
  return { version, saasBps, saasFixedCents, royaltyBps };
}

/** The percentage part of the marketplace fee Coinflow takes from the subtotal, as a percent (2.49 = 2.49%). */
export function marketplaceFeePercent({ saasBps, royaltyBps }: Pick<FeeSchedule, "saasBps" | "royaltyBps">) {
  return (saasBps + royaltyBps) / 100;
}

/** "0.50%" */
export function formatBps(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}

/** "2.49% + $0.30", or "2.49%" with no flat fee. */
export function formatSaasRate({ saasBps, saasFixedCents }: Pick<FeeSchedule, "saasBps" | "saasFixedCents">) {
  if (!saasFixedCents) return formatBps(saasBps);
  return `${formatBps(saasBps)} + $${(saasFixedCents / 100).toFixed(2)}`;
}
