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
  submitOnboardingForm,
} from "@/lib/payments/onboarding";
import {
  getSubmerchantProgress,
  type SubmerchantProgress,
} from "@/lib/payments/verification";
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
