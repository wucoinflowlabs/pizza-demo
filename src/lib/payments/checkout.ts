import "server-only";
import { paymentsRequest } from "./client";

export type CheckoutJwtArgs = {
  subtotal: { cents: number; currency: string };
  /** Marketplace fee Coinflow takes from the subtotal before the sub-merchant settles, as a percent. */
  feePercentage?: number;
  /** Fixed marketplace fee taken from the subtotal. */
  fixedFee?: { cents: number };
  email?: string;
  customerInfo?: Record<string, unknown>;
  chargebackProtectionData?: unknown[];
  webhookInfo?: Record<string, unknown>;
};

/**
 * Signs a sub-merchant's purchase so the browser can't change the amount or
 * the fees. The token is single-use and is passed to the checkout as `jwtToken`.
 */
export async function createCheckoutJwt(submerchantId: string, args: CheckoutJwtArgs) {
  const { checkoutJwtToken } = await paymentsRequest<{ checkoutJwtToken?: string }>({
    method: "POST",
    path: "/checkout/jwt-token",
    body: args,
    asSubmerchant: submerchantId,
  });
  if (!checkoutJwtToken) throw new Error("Coinflow returned no checkout token");
  return checkoutJwtToken;
}
