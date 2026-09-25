import "server-only";
import { getPaymentsEnv } from "./env";
import { PaymentsError, paymentsErrorFromResponse } from "./errors";

const REQUEST_TIMEOUT_MS = 15_000;

type HttpMethod = "GET" | "POST" | "PATCH";

export async function paymentsRequest<T>({
  method,
  path,
  body,
  asSubmerchant,
}: {
  method: HttpMethod;
  path: string;
  body?: unknown;
  /** Acts as this sub-merchant using the parent's key. */
  asSubmerchant?: string;
}): Promise<T> {
  const { PAYMENTS_API_BASE_URL, PAYMENTS_API_KEY } = getPaymentsEnv();

  let response: Response;
  try {
    response = await fetch(`${PAYMENTS_API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: PAYMENTS_API_KEY,
        accept: "application/json",
        "content-type": "application/json",
        ...(asSubmerchant
          ? { "x-coinflow-submerchant-id": asSubmerchant }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`[payments] ${method} ${path} failed to send`, err);
    throw new PaymentsError({ code: "UNKNOWN", detail: String(err) });
  }

  const parsed = await parseBody(response);
  if (response.ok) return parsed as T;


  const error = paymentsErrorFromResponse({
    status: response.status,
    body: parsed,
  });
  console.error(`[payments] ${method} ${path} → ${error.message}`);
  throw error;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
