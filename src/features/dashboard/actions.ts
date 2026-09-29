"use server";

import { redirect } from "next/navigation";
import {
  FIELD_DEFINITIONS,
  FIELD_NAMES,
  sanitizeFormValues,
  validateForm,
  withFixedFields,
  withoutEmptyValues,
  type FieldErrors,
  type FormValues,
} from "@/lib/onboarding-form";
import { saveMerchantLogin, setLoginSubmerchantId, verifyMerchantPassword } from "@/lib/merchant-logins";
import { PaymentsError } from "@/lib/payments/errors";
import { saveOnboardingDraft, submitApplicationForReview, submitOnboardingForm } from "@/lib/payments/onboarding";
import { findSubmerchantIdByEmail } from "@/lib/payments/submerchants";
import { createWithAvailableId, toDraftFields } from "@/lib/submerchant-account";
import { getSubmerchantProgress, type SubmerchantProgress } from "@/lib/payments/verification";
import {
  endMerchantSession,
  getCurrentAccountId,
  getCurrentMerchantEmail,
  setCurrentAccountId,
  startMerchantSession,
} from "@/lib/session";
import type { AdoraPaySnapshot } from "./pay-status";
import { snapshotFromProgress } from "./pay-status";

export async function signInMerchant(
  _previous: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  let login: Awaited<ReturnType<typeof verifyMerchantPassword>>;
  try {
    login = await verifyMerchantPassword({ email, password });
  } catch (err) {
    console.error("[dashboard] merchant sign-in failed", err);
    return { error: "Something went wrong. Please try again." };
  }

  if (!login) return { error: "That email or password isn't right." };

  await startMerchantSession(login.email);
  redirect("/dashboard");
}

export async function signOutMerchant() {
  await endMerchantSession();
  redirect("/login");
}

async function requireMerchantEmail() {
  const email = await getCurrentMerchantEmail();
  if (!email) redirect("/login");
  return email;
}

/** Binds the logged-in merchant to the account cookie. Cookie writes are only allowed in a Server Action. */
export async function rememberMerchantAccount() {
  try {
    const email = await getCurrentMerchantEmail();
    if (!email) return;
    const merchantId = await findSubmerchantIdByEmail(email);
    if (!merchantId || (await getCurrentAccountId()) === merchantId) return;
    await setCurrentAccountId(merchantId);
  } catch (err) {
    console.error("[dashboard] could not bind the merchant account", err);
  }
}

export async function loadAdoraPaySnapshot(): Promise<AdoraPaySnapshot | undefined> {
  const email = await requireMerchantEmail();
  const merchantId = await findSubmerchantIdByEmail(email);
  if (!merchantId) return undefined;
  const progress = await getSubmerchantProgress(merchantId);
  return snapshotFromProgress(progress);
}

function text(values: FormValues, name: string) {
  return typeof values[name] === "string" ? values[name] : undefined;
}

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

async function merchantProgress(): Promise<SubmerchantProgress | undefined> {
  const email = await requireMerchantEmail();
  const merchantId = await findSubmerchantIdByEmail(email);
  if (!merchantId) return undefined;
  return getSubmerchantProgress(merchantId);
}

export type StartOnboardingResult =
  | { ok: true; progress: SubmerchantProgress }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export async function startAdoraPayOnboarding(rawValues: unknown): Promise<StartOnboardingResult> {
  const email = await requireMerchantEmail();
  const values = withoutEmptyValues(sanitizeFormValues(rawValues));
  const fieldErrors = validateForm({
    values,
    fields: FIELD_DEFINITIONS.filter((field) => field.type !== "file"),
    requireAll: true,
  });
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  let merchantId = await findSubmerchantIdByEmail(email);
  if (!merchantId) {
    const businessName = text(values, "dba");
    try {
      merchantId = await createWithAvailableId({ email, values });
    } catch (err) {
      const message = err instanceof PaymentsError ? err.userMessage : "Something went wrong. Please try again.";
      return { ok: false, message };
    }

    try {
      const linked = await setLoginSubmerchantId(email, merchantId);
      if (!linked) {
        await saveMerchantLogin({
          cfSubmerchantId: merchantId,
          email,
          name: businessName,
        });
      }
    } catch (err) {
      console.error("[dashboard] merchant login was not linked to the new account", err);
    }
  }

  const current = await getSubmerchantProgress(merchantId);
  if (!current.onboardingFormSubmitted) {
    try {
      await saveOnboardingDraft({ submerchantId: merchantId, fields: toDraftFields(values) });
      await submitOnboardingForm({ submerchantId: merchantId, fields: withFixedFields(values) });
    } catch (err) {
      if (!(err instanceof PaymentsError) || err.code !== "ALREADY_SUBMITTED") {
        if (err instanceof PaymentsError && err.code === "INVALID_FIELDS") {
          const serverErrors = fieldErrorsFrom(err.details);
          return {
            ok: false,
            message: Object.keys(serverErrors).length
              ? "Please answer the highlighted questions."
              : err.userMessage,
            fieldErrors: serverErrors,
          };
        }
        const message = err instanceof PaymentsError ? err.userMessage : "Something went wrong. Please try again.";
        return { ok: false, message };
      }
    }
  }

  await setCurrentAccountId(merchantId);
  return { ok: true, progress: await getSubmerchantProgress(merchantId) };
}

export async function refreshAdoraPayProgress(): Promise<
  { ok: true; progress: SubmerchantProgress } | { ok: false; message: string }
> {
  try {
    const progress = await merchantProgress();
    if (!progress) return { ok: false, message: "We couldn't find your application. Let's start again." };
    return { ok: true, progress };
  } catch (err) {
    const message = err instanceof PaymentsError ? err.userMessage : "Something went wrong. Please try again.";
    return { ok: false, message };
  }
}

export async function submitAdoraPayApplication(): Promise<
  { ok: true; progress: SubmerchantProgress } | { ok: false; message: string }
> {
  const email = await requireMerchantEmail();
  const merchantId = await findSubmerchantIdByEmail(email);
  if (!merchantId) return { ok: false, message: "We couldn't find your application. Let's start again." };

  try {
    const before = await getSubmerchantProgress(merchantId);
    if (before.verificationStatus !== "approved" || !before.onboardingFormSubmitted)
      return { ok: false, message: "Finish the outstanding tasks before submitting." };
    if (!before.applicationSubmitted) await submitApplicationForReview(merchantId);
    return { ok: true, progress: await getSubmerchantProgress(merchantId) };
  } catch (err) {
    if (err instanceof PaymentsError && err.code === "ALREADY_SUBMITTED")
      return { ok: true, progress: await getSubmerchantProgress(merchantId) };
    const message = err instanceof PaymentsError ? err.userMessage : "Something went wrong. Please try again.";
    return { ok: false, message };
  }
}
