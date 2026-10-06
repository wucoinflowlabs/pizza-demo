import "server-only";
import { randomUUID } from "node:crypto";
import { PaymentsError, paymentsErrorFromResponse } from "./errors";

/**
 * Demo-only: fires a REAL production payout via Coinflow's prod API. Only
 * active when PAYMENTS_PROD_API_KEY is set. Every call here moves real money.
 */

const DEFAULT_BASE_URL = "https://api.coinflow.cash/api";
const DEFAULT_USER_ID = "teststaff";
const TIMEOUT_MS = 15_000;

export type RealPayoutStatus = {
  enabled: boolean;
  /** The sandbox user id whose Send button triggers the prod payout. */
  userId: string;
};

export function realPayoutStatus(): RealPayoutStatus {
  return {
    enabled: Boolean(process.env.PAYMENTS_PROD_API_KEY),
    userId: (process.env.DEMO_REAL_PAYOUT_USER_ID ?? DEFAULT_USER_ID).trim() || DEFAULT_USER_ID,
  };
}

function prodEnv() {
  const apiKey = process.env.PAYMENTS_PROD_API_KEY;
  if (!apiKey) throw new PaymentsError({ code: "UNKNOWN", detail: "Production payout is not configured" });
  const baseUrl = (process.env.PAYMENTS_PROD_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return { baseUrl, apiKey };
}

async function prodRequest<T>({ method, path, body }: { method: "GET" | "POST"; path: string; body?: unknown }): Promise<T> {
  const { baseUrl, apiKey } = prodEnv();
  const userId = realPayoutStatus().userId;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: apiKey,
        "x-coinflow-auth-user-id": userId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`[real-payout] ${method} ${path} failed to send`, err);
    throw new PaymentsError({ code: "UNKNOWN", detail: String(err) });
  }
  const text = await response.text();
  const parsed = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const err = paymentsErrorFromResponse({ status: response.status, body: parsed });
    console.error(`[real-payout] ${method} ${path} → ${err.message}`);
    throw err;
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type ProdWithdrawerVenmo = { withdrawer?: { venmo?: { token?: string; alias?: string }; verification?: { status?: string } } };

/**
 * The production withdrawer's Venmo payout token and masked alias.
 * Thrown if the production side doesn't have a Venmo method linked.
 */
export async function getProdVenmoMethod() {
  const result = await prodRequest<ProdWithdrawerVenmo>({ method: "GET", path: "/withdraw" });
  const token = result?.withdrawer?.venmo?.token;
  const alias = result?.withdrawer?.venmo?.alias;
  if (!token) throw new PaymentsError({ code: "NOT_FOUND", detail: "No Venmo method on prod teststaff" });
  return { token, alias };
}

type Cents = { cents: number; currency?: string };

export type ProdPayoutQuote = {
  /** Per-speed sub-object. Only `venmo` is used today. */
  venmo?: {
    fee?: Cents;
    finalSettlement?: Cents;
    expectedDeliveryDate?: string;
    accountIneligible?: boolean;
  };
  merchantFees?: Cents;
  totalMerchantDebit?: Cents;
  userPayout?: Cents;
  // Provider returns a bag of other fee fields; keep the loose index.
  [key: string]: unknown;
};

/** Dry-runs the payout to show fees. The prod API runs this against real pricing. */
export async function quoteRealPayout({ cents }: { cents: number }): Promise<ProdPayoutQuote> {
  const { token } = await getProdVenmoMethod();
  const { userId } = realPayoutStatus();
  return prodRequest<ProdPayoutQuote>({
    method: "POST",
    path: "/merchant/withdraws/payout/delegated/quote",
    body: {
      userId,
      amount: { cents, currency: "USD" },
      speed: "venmo",
      account: token,
    },
  });
}

export async function sendRealPayout({
  cents,
  idempotencyKey = randomUUID(),
}: {
  cents: number;
  idempotencyKey?: string;
}): Promise<{ signature?: string; effectiveSpeed?: string }> {
  const { token } = await getProdVenmoMethod();
  const { userId } = realPayoutStatus();
  return prodRequest<{ signature?: string; effectiveSpeed?: string }>({
    method: "POST",
    path: "/merchant/withdraws/payout/delegated",
    body: {
      userId,
      amount: { cents, currency: "USD" },
      speed: "venmo",
      account: token,
      idempotencyKey,
      // The worker creates the withdraw record and retries; waiting here would
      // block the HTTP response on Solana confirmation. Mirrors the production dashboard.
      waitForConfirmation: false,
    },
  });
}

/**
 * Mirror the real payout on the sandbox sub-merchant the demo is currently
 * showing, so a matching record appears in that sub-merchant's Withdraws
 * table. Uses the regular PAYMENTS_API_KEY (sandbox) plus the user id header,
 * NOT the production credentials. Will fail until the sub-merchant has an MPC
 * wallet + delegation + CFUSD balance — the caller should swallow the error.
 */
export async function sendSandboxMirrorPayout({
  submerchantId,
  cents,
  idempotencyKey = randomUUID(),
}: {
  submerchantId: string;
  cents: number;
  idempotencyKey?: string;
}): Promise<{ signature?: string; effectiveSpeed?: string }> {
  const sandboxBase = (process.env.PAYMENTS_API_BASE_URL || "https://api-sandbox.coinflow.cash/api").replace(/\/+$/, "");
  const sandboxKey = process.env.PAYMENTS_API_KEY;
  if (!sandboxKey) throw new PaymentsError({ code: "UNKNOWN", detail: "Sandbox PAYMENTS_API_KEY not set" });
  const { userId } = realPayoutStatus();

  // Need the sandbox withdrawer's Venmo token on this sub-merchant.
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    Authorization: sandboxKey,
    "x-coinflow-submerchant-id": submerchantId,
    "x-coinflow-auth-user-id": userId,
  };

  const sandboxGet = async (path: string) => {
    const r = await fetch(`${sandboxBase}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await r.text();
    const parsed = text ? safeJson(text) : undefined;
    if (!r.ok) throw paymentsErrorFromResponse({ status: r.status, body: parsed });
    return parsed;
  };
  const sandboxPost = async (path: string, body: unknown) => {
    const r = await fetch(`${sandboxBase}${path}`, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await r.text();
    const parsed = text ? safeJson(text) : undefined;
    if (!r.ok) throw paymentsErrorFromResponse({ status: r.status, body: parsed });
    return parsed;
  };

  const withdrawer = (await sandboxGet("/withdraw")) as { withdrawer?: { venmo?: { token?: string } } };
  const token = withdrawer?.withdrawer?.venmo?.token;
  if (!token) throw new PaymentsError({ code: "NOT_FOUND", detail: `No Venmo on sandbox ${submerchantId}/${userId}` });

  return (await sandboxPost("/merchant/withdraws/payout/delegated", {
    userId,
    amount: { cents, currency: "USD" },
    speed: "venmo",
    account: token,
    idempotencyKey,
    waitForConfirmation: false,
  })) as { signature?: string; effectiveSpeed?: string };
}
