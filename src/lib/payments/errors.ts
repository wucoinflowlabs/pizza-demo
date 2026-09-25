import "server-only";

export type PaymentsErrorCode =
  | "EMAIL_TAKEN"
  | "ACCOUNT_ID_TAKEN"
  | "INVALID_FIELDS"
  | "NOT_FOUND"
  | "ALREADY_SUBMITTED"
  | "RATE_LIMITED"
  | "PENDING_APPROVAL"
  | "SETTLEMENT_ALREADY_SET"
  | "UNKNOWN";

const USER_MESSAGES: Record<PaymentsErrorCode, string> = {
  EMAIL_TAKEN: "An account with this email already exists.",
  ACCOUNT_ID_TAKEN: "Something went wrong. Please try again.",
  INVALID_FIELDS:
    "Some of your details couldn't be verified. Please review them and try again.",
  NOT_FOUND: "We couldn't find your application. Let's start again.",
  ALREADY_SUBMITTED: "Your application has already been submitted.",
  RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
  PENDING_APPROVAL: "This account hasn't been activated yet.",
  SETTLEMENT_ALREADY_SET: "Payouts are already configured for this account.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export class PaymentsError extends Error {
  readonly code: PaymentsErrorCode;
  readonly userMessage: string;
  /** Raw `details` from the provider's error body, for server-side mapping only. */
  readonly details: unknown;

  constructor({
    code,
    detail,
    details,
  }: {
    code: PaymentsErrorCode;
    detail?: string;
    details?: unknown;
  }) {
    super(detail ?? code);
    this.name = "PaymentsError";
    this.code = code;
    this.userMessage = USER_MESSAGES[code];
    this.details = details;
  }
}

function codeForResponse({
  status,
  detail,
}: {
  status: number;
  detail: string;
}): PaymentsErrorCode {
  if (/email .* is already used/i.test(detail)) return "EMAIL_TAKEN";
  if (status === 403 && /awaiting verification/i.test(detail)) return "PENDING_APPROVAL";
  if (/unable to reset the settlement address/i.test(detail)) return "SETTLEMENT_ALREADY_SET";
  // 409 is shared by "merchant ID taken" (create) and "already submitted" (update).
  if (/merchant id/i.test(detail)) return "ACCOUNT_ID_TAKEN";
  if (status === 409) return "ALREADY_SUBMITTED";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status === 400 || status === 422) return "INVALID_FIELDS";
  return "UNKNOWN";
}

export function paymentsErrorFromResponse({
  status,
  body,
}: {
  status: number;
  body: unknown;
}): PaymentsError {
  const detail = extractDetail(body);
  return new PaymentsError({
    code: codeForResponse({ status, detail }),
    detail: `${status}: ${detail}`,
    details:
      body && typeof body === "object"
        ? (body as { details?: unknown }).details
        : undefined,
  });
}

function extractDetail(body: unknown): string {
  if (typeof body === "string") return body;
  if (!body || typeof body !== "object") return "";

  const { details, message } = body as { details?: unknown; message?: unknown };
  if (typeof details === "string") return details;
  if (details) return JSON.stringify(details);
  return typeof message === "string" ? message : "";
}
