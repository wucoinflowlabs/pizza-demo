"use server";

import { PaymentsError } from "@/lib/payments/errors";
import { paymentsRequest } from "@/lib/payments/client";
import { LAMONICA_MERCHANT_ID } from "./menu";

const CUSTOMER_ID = /^guest_[a-zA-Z0-9]{16,64}$/;

/**
 * Mints a short-lived checkout session for a guest, as the Lamonica sub-merchant.
 * The parent API key never reaches the browser; only this session key does.
 */
export async function createLamonicaSessionKey(
  customerId: string,
): Promise<{ sessionKey: string } | { error: string }> {
  if (!CUSTOMER_ID.test(customerId)) {
    return { error: "We couldn't start checkout. Please try again." };
  }

  try {
    const { key } = await paymentsRequest<{ key?: string }>({
      method: "GET",
      path: "/auth/session-key",
      asSubmerchant: LAMONICA_MERCHANT_ID,
      headers: { "x-coinflow-auth-user-id": customerId },
    });
    if (!key) return { error: "Checkout is unavailable right now. Please try again." };
    return { sessionKey: key };
  } catch (err) {
    console.error("[lamonica] session key failed", err);
    if (err instanceof PaymentsError) return { error: err.userMessage };
    return { error: "Checkout is unavailable right now. Please try again." };
  }
}
