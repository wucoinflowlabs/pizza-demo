import "server-only";
import { PaymentsError } from "@/lib/payments/errors";
import { listMerchantPayments } from "@/lib/payments/payments";
import { shopTimeZone } from "./load-payments-series";
import { ORDER_WINDOWS, toOrder, type Order, type OrderWindow } from "./orders";

const DAY_MS = 24 * 60 * 60 * 1000;

export type OrdersResult =
  | { ok: true; orders: Order[]; timeZone: string; now: string }
  | { ok: false; message: string };

/** Every payment in the window, whatever its status, newest first. */
export async function loadOrders({
  submerchantId,
  loginId,
  window,
}: {
  submerchantId: string;
  loginId: string;
  window: OrderWindow;
}): Promise<OrdersResult> {
  try {
    const now = new Date();
    const days = ORDER_WINDOWS.find((option) => option.key === window)?.days ?? 30;
    const [timeZone, payments] = await Promise.all([
      shopTimeZone(loginId),
      listMerchantPayments(submerchantId, { since: now.getTime() - days * DAY_MS, until: now.getTime() }),
    ]);
    const orders = payments
      .map(toOrder)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return { ok: true, orders, timeZone, now: now.toISOString() };
  } catch (err) {
    console.error("[dashboard] payments list could not be loaded", err);
    const message =
      err instanceof PaymentsError ? err.userMessage : "Payments couldn't be loaded right now.";
    return { ok: false, message };
  }
}
