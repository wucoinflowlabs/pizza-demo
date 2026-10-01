import "server-only";
import type { LamonicaCoinflowEnv } from "./menu";

/** Matches PAYMENTS_API_BASE_URL so checkout talks to the same Coinflow environment as the rest of the app. */
export function lamonicaCheckoutEnv(): LamonicaCoinflowEnv {
  const base = process.env.PAYMENTS_API_BASE_URL ?? "";
  if (base.includes("staging")) return "staging";
  if (base.includes("api.coinflow.cash") && !base.includes("sandbox") && !base.includes("staging")) {
    return "prod";
  }
  return "sandbox";
}
