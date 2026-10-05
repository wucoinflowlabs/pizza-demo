import "server-only";
import { PaymentsError } from "@/lib/payments/errors";
import { listMerchantPayments } from "@/lib/payments/payments";
import { DEFAULT_TIME_ZONE, shopTimeZone } from "./load-payments-series";
import { ORDER_WINDOWS, toOrder, type Order, type OrderLocation, type OrderWindow } from "./orders";

const DAY_MS = 24 * 60 * 60 * 1000;

export type OrdersResult =
  | { ok: true; orders: Order[]; timeZone: string; now: string; failedLocations: string[] }
  | { ok: false; message: string };

/** One sub-merchant to read payments from. A franchise owner has one per store. */
export type OrdersSource = { submerchantId: string; location?: OrderLocation };

/**
 * Every payment in the window, whatever its status, newest first. Coinflow has
 * no nested sub-merchants, so each source is its own request with its own
 * sub-merchant header. One store failing leaves the others on screen.
 */
export async function loadOrders({
  sources,
  loginId,
  window,
}: {
  sources: OrdersSource[];
  /** The shop whose time zone dates are shown in. Omitted for a franchise. */
  loginId?: string;
  window: OrderWindow;
}): Promise<OrdersResult> {
  try {
    const now = new Date();
    const days = ORDER_WINDOWS.find((option) => option.key === window)?.days ?? 30;
    const range = { since: now.getTime() - days * DAY_MS, until: now.getTime() };
    const [timeZone, results] = await Promise.all([
      loginId ? shopTimeZone(loginId) : DEFAULT_TIME_ZONE,
      Promise.allSettled(sources.map((source) => listMerchantPayments(source.submerchantId, range))),
    ]);

    const failures = results.flatMap((result, index) => (result.status === "rejected" ? [index] : []));
    if (sources.length > 0 && failures.length === sources.length) {
      throw (results[0] as PromiseRejectedResult).reason;
    }
    for (const index of failures) {
      console.error(
        `[dashboard] payments for ${sources[index].submerchantId} could not be loaded`,
        (results[index] as PromiseRejectedResult).reason,
      );
    }

    const orders = results
      .flatMap((result, index) =>
        result.status === "fulfilled"
          ? result.value.map((payment) => ({ ...toOrder(payment), location: sources[index].location }))
          : [],
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const failedLocations = failures.map(
      (index) => sources[index].location?.label ?? sources[index].submerchantId,
    );
    return { ok: true, orders, timeZone, now: now.toISOString(), failedLocations };
  } catch (err) {
    console.error("[dashboard] payments list could not be loaded", err);
    const message =
      err instanceof PaymentsError ? err.userMessage : "Payments couldn't be loaded right now.";
    return { ok: false, message };
  }
}
