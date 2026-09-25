"use server";

import {
  FIELD_NAMES,
  FIXED_FIELDS,
  hasValue,
  sanitizeFormValues,
  validateForm,
  withoutEmptyValues,
  type FieldErrors,
  type FormValues,
} from "@/lib/onboarding-form";
import { PaymentsError } from "@/lib/payments/errors";
import {
  getOnboardingForm,
  saveOnboardingDraft,
  submitApplicationForReview,
  submitOnboardingForm,
} from "@/lib/payments/onboarding";
import {
  getSubmerchantProgress,
  type SubmerchantProgress,
} from "@/lib/payments/verification";
import {
  getSettlementAddresses,
  setSubmerchantSettlementAddress,
} from "@/lib/payments/settlement";
import { getCurrentAccountId } from "@/lib/session";

type Failure = { ok: false; message: string; fieldErrors?: FieldErrors };

const NO_SESSION: Failure = {
  ok: false,
  message: "Your session has expired. Open your invite link again to continue.",
};

function failure(err: unknown): Failure {
  if (err instanceof PaymentsError) return { ok: false, message: err.userMessage };
  console.error("[application] unexpected error", err);
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function refreshProgress(): Promise<
  { ok: true; progress: SubmerchantProgress } | Failure
> {
  const accountId = await getCurrentAccountId();
  if (!accountId) return NO_SESSION;
  try {
    return { ok: true, progress: await getSubmerchantProgress(accountId) };
  } catch (err) {
    return failure(err);
  }
}

/** Autosave. Blank values are skipped so they never overwrite stored answers. */
export async function saveDetailsDraft(values: unknown): Promise<{ ok: true } | Failure> {
  const accountId = await getCurrentAccountId();
  if (!accountId) return NO_SESSION;
  try {
    await saveOnboardingDraft({
      submerchantId: accountId,
      fields: { ...withoutEmptyValues(sanitizeFormValues(values)), ...FIXED_FIELDS },
    });
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// The submit endpoint may report issues as a zod-style list or a field map.
function fieldErrorsFrom(details: unknown): FieldErrors {
  const known = new Set(FIELD_NAMES);
  const errors: FieldErrors = {};
  if (Array.isArray(details)) {
    for (const issue of details as { path?: unknown[]; message?: string }[]) {
      const name = issue?.path?.[0];
      if (typeof name === "string" && known.has(name))
        errors[name] = issue.message ?? "This field is invalid";
    }
  } else if (details && typeof details === "object") {
    for (const [name, value] of Object.entries(details as Record<string, unknown>)) {
      if (!known.has(name)) continue;
      const message = Array.isArray(value) ? value[0] : value;
      errors[name] = typeof message === "string" ? message : "This field is invalid";
    }
  }
  return errors;
}

/**
 * The submit endpoint validates only the request body, so the stored draft
 * (including The Za's prefill) is merged in and fields the business cleared
 * are dropped.
 */
export async function submitDetails(
  values: unknown,
): Promise<{ ok: true; progress: SubmerchantProgress } | Failure> {
  const accountId = await getCurrentAccountId();
  if (!accountId) return NO_SESSION;

  const answers = sanitizeFormValues(values);
  const fieldErrors = validateForm({ values: answers, requireAll: true });
  if (Object.keys(fieldErrors).length)
    return { ok: false, message: "Please answer the highlighted questions.", fieldErrors };

  try {
    const stored = sanitizeFormValues(await getOnboardingForm(accountId));
    const merged: FormValues = { ...stored, ...answers, ...FIXED_FIELDS };
    for (const [name, value] of Object.entries(answers))
      if (!hasValue(value)) delete merged[name];

    await submitOnboardingForm({ submerchantId: accountId, fields: merged });
    return { ok: true, progress: await getSubmerchantProgress(accountId) };
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "INVALID_FIELDS") {
      console.error("[application] submit rejected", JSON.stringify(err.details));
      const serverErrors = fieldErrorsFrom(err.details);
      return {
        ok: false,
        message: Object.keys(serverErrors).length
          ? "Please answer the highlighted questions."
          : "Some answers couldn't be accepted. Please review the form and try again.",
        fieldErrors: serverErrors,
      };
    }
    return failure(err);
  }
}

/**
 * Sends the application to the provider's compliance review. Approval itself
 * only happens on their side; the journey picks it up by re-reading progress.
 */
export async function submitApplication(): Promise<
  { ok: true; progress: SubmerchantProgress } | Failure
> {
  const accountId = await getCurrentAccountId();
  if (!accountId) return NO_SESSION;

  try {
    const before = await getSubmerchantProgress(accountId);
    if (before.verificationStatus !== "approved" || !before.onboardingFormSubmitted)
      return { ok: false, message: "Finish the outstanding tasks before submitting." };

    if (!before.applicationSubmitted) await submitApplicationForReview(accountId);
    return { ok: true, progress: await getSubmerchantProgress(accountId) };
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "ALREADY_SUBMITTED")
      return { ok: true, progress: await getSubmerchantProgress(accountId) };
    if (err instanceof PaymentsError && err.code === "INVALID_FIELDS") {
      console.error("[application] review rejected", JSON.stringify(err.details), err.message);
      return {
        ok: false,
        message: "Your application isn't complete yet. Review your details and verification, then try again.",
      };
    }
    return failure(err);
  }
}

export type SettlementSetupState =
  | "configured"
  | "pending_approval"
  | "conflict"
  | "unavailable"
  | "error";

type ChainOutcome = Exclude<SettlementSetupState, "unavailable">;

// Worst outcome wins, so one failing chain isn't hidden behind another that succeeded.
const SEVERITY: ChainOutcome[] = ["error", "conflict", "pending_approval", "configured"];

async function settleChain({
  accountId,
  blockchain,
  address,
  current,
}: {
  accountId: string;
  blockchain: string;
  address: string;
  current?: string;
}): Promise<ChainOutcome> {
  if (current === address) return "configured";
  if (current) return "conflict";
  try {
    await setSubmerchantSettlementAddress({ submerchantId: accountId, blockchain, address });
    return "configured";
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "PENDING_APPROVAL") return "pending_approval";
    if (err instanceof PaymentsError && err.code === "SETTLEMENT_ALREADY_SET") return "conflict";
    console.error(`[settlement] setting ${blockchain} failed`, err);
    return "error";
  }
}

/**
 * Points the sub-merchant's settlement at The Za's own settlement wallet(s),
 * chain by chain. Safe to call repeatedly: already-matching chains are skipped.
 */
export async function setupSettlement(): Promise<{ state: SettlementSetupState }> {
  const accountId = await getCurrentAccountId();
  if (!accountId) return { state: "error" };

  try {
    const [parent, child] = await Promise.all([
      getSettlementAddresses(),
      getSettlementAddresses(accountId),
    ]);
    const chains = Object.entries(parent);
    if (!chains.length) return { state: "unavailable" };

    const outcomes = await Promise.all(
      chains.map(([blockchain, address]) =>
        settleChain({ accountId, blockchain, address, current: child[blockchain] }),
      ),
    );
    return { state: SEVERITY.find((outcome) => outcomes.includes(outcome)) ?? "error" };
  } catch (err) {
    console.error("[settlement] setup failed", err);
    return { state: "error" };
  }
}
