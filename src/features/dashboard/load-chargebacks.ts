import "server-only";
import { listChargebacks } from "@/lib/payments/chargebacks";
import { PaymentsError } from "@/lib/payments/errors";
import { toChargeback, type Chargeback } from "./chargebacks";
import { DEFAULT_TIME_ZONE, shopTimeZone } from "./load-payments-series";
import type { OrdersSource } from "./load-orders";
import { ORDER_WINDOWS, type OrderWindow } from "./orders";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ChargebacksResult =
  | { ok: true; chargebacks: Chargeback[]; timeZone: string; now: string; failedLocations: string[] }
  | { ok: false; message: string };

/**
 * Every chargeback in the window, newest first. Like payments, each source is
 * its own request with its own sub-merchant header, and one store failing
 * leaves the others on screen.
 */
export async function loadChargebacks({
  sources,
  loginId,
  window,
}: {
  sources: OrdersSource[];
  /** The shop whose time zone dates are shown in. Omitted for a franchise. */
  loginId?: string;
  window: OrderWindow;
}): Promise<ChargebacksResult> {
  try {
    const now = new Date();
    const days = ORDER_WINDOWS.find((option) => option.key === window)?.days ?? 30;
    const range = { since: now.getTime() - days * DAY_MS, until: now.getTime() };
    const [timeZone, results] = await Promise.all([
      loginId ? shopTimeZone(loginId) : DEFAULT_TIME_ZONE,
      Promise.allSettled(sources.map((source) => listChargebacks(source.submerchantId, range))),
    ]);

    const failures = results.flatMap((result, index) => (result.status === "rejected" ? [index] : []));
    if (sources.length > 0 && failures.length === sources.length) {
      throw (results[0] as PromiseRejectedResult).reason;
    }
    for (const index of failures) {
      console.error(
        `[dashboard] chargebacks for ${sources[index].submerchantId} could not be loaded`,
        (results[index] as PromiseRejectedResult).reason,
      );
    }

    const chargebacks = results
      .flatMap((result, index) =>
        result.status === "fulfilled"
          ? result.value.map((row) => ({ ...toChargeback(row), location: sources[index].location }))
          : [],
      )
      .sort((a, b) => Date.parse(b.loadedAt) - Date.parse(a.loadedAt));
    const failedLocations = failures.map(
      (index) => sources[index].location?.label ?? sources[index].submerchantId,
    );
    return { ok: true, chargebacks, timeZone, now: now.toISOString(), failedLocations };
  } catch (err) {
    console.error("[dashboard] chargebacks list could not be loaded", err);
    const message =
      err instanceof PaymentsError ? err.userMessage : "Chargebacks couldn't be loaded right now.";
    return { ok: false, message };
  }
}
