"use server";

import {
  FIELD_NAMES,
  hasValue,
  sanitizeFormValues,
  validateForm,
  withFixedFields,
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
import { getCurrentAccountId } from "@/lib/session";
import {
  alignSettlementWithParent,
  type SettlementSetupState,
} from "@/lib/settlement-setup";

export type { SettlementSetupState };

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
      fields: withFixedFields(withoutEmptyValues(sanitizeFormValues(values))),
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
 * (including Adora's prefill) is merged in and fields the business cleared
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
    const merged: FormValues = { ...stored, ...answers };
    for (const [name, value] of Object.entries(answers))
      if (!hasValue(value)) delete merged[name];

    await submitOnboardingForm({ submerchantId: accountId, fields: withFixedFields(merged) });
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

/** Points this business's settlement at Adora's wallet(s); see alignSettlementWithParent. */
export async function setupSettlement(): Promise<{ state: SettlementSetupState }> {
  const accountId = await getCurrentAccountId();
  if (!accountId) return { state: "error" };
  return { state: await alignSettlementWithParent({ submerchantId: accountId }) };
}
