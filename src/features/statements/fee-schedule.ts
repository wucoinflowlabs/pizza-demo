/**
 * What Adora and the franchisor take from each restaurant's sales. SaaS and
 * royalty are collected by Coinflow on every payment as one marketplace fee;
 * the hardware program is a flat daily charge billed on the statement.
 */
export type FeeSchedule = {
  /** Stamped on each payment so a statement can tell which rates it was charged. */
  version: string;
  /** Adora SaaS fee, in basis points of gross sales. */
  saasBps: number;
  /** Franchise royalty, in basis points of gross sales. Adora collects it and remits it to the franchisor. */
  royaltyBps: number;
  /** Terminal and hardware lease, per location per day. */
  hardwareDailyCents: number;
};

/** The rates a payment was charged, as stamped in its `webhookInfo.fees`. */
export type ChargedRates = Pick<FeeSchedule, "version" | "saasBps" | "royaltyBps">;

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  version: "2026-10",
  saasBps: 50,
  royaltyBps: 600,
  hardwareDailyCents: 330,
};

/** Franchise-specific terms, keyed by Adora customer id. */
const OVERRIDES: Record<string, Partial<FeeSchedule>> = {};

export function feeScheduleFor(customerId: string): FeeSchedule {
  return { ...DEFAULT_FEE_SCHEDULE, ...OVERRIDES[customerId] };
}

export function chargedRates({ version, saasBps, royaltyBps }: FeeSchedule): ChargedRates {
  return { version, saasBps, royaltyBps };
}

/** The marketplace fee Coinflow takes from the subtotal, as a percent (6.5 = 6.5%). */
export function marketplaceFeePercent({ saasBps, royaltyBps }: Pick<FeeSchedule, "saasBps" | "royaltyBps">) {
  return (saasBps + royaltyBps) / 100;
}

/** "0.50%" */
export function formatBps(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}
