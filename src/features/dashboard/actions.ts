"use server";

import { redirect } from "next/navigation";
import { accountIdCandidates } from "@/lib/account-id";
import {
  FIELD_DEFINITIONS,
  FIXED_FIELDS,
  sanitizeFormValues,
  validateForm,
  withFixedFields,
  withoutEmptyValues,
  type FieldErrors,
  type FormValues,
} from "@/lib/onboarding-form";
import { saveMerchantLogin, verifyMerchantPassword } from "@/lib/merchant-logins";
import { PaymentsError } from "@/lib/payments/errors";
import { saveOnboardingDraft } from "@/lib/payments/onboarding";
import { createSubmerchant, findSubmerchantIdByEmail } from "@/lib/payments/submerchants";
import type { CreateSubmerchantInput } from "@/lib/payments/types";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import {
  endMerchantSession,
  getCurrentMerchantEmail,
  startMerchantSession,
} from "@/lib/session";
import type { AdoraPaySnapshot, PayWebhook } from "./pay-status";
import { eventsFromSnapshot } from "./pay-status";

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

function snapshotFromProgress(
  progress: Awaited<ReturnType<typeof getSubmerchantProgress>>,
  businessName?: string,
): AdoraPaySnapshot {
  return {
    merchantId: progress.merchantId,
    businessName,
    verificationStatus: progress.verificationStatus,
    onboardingFormSubmitted: progress.onboardingFormSubmitted,
    applicationSubmitted: progress.applicationSubmitted,
    approved: progress.approved,
  };
}

export async function loadAdoraPaySnapshot(): Promise<AdoraPaySnapshot | undefined> {
  const email = await requireMerchantEmail();
  const merchantId = await findSubmerchantIdByEmail(email);
  if (!merchantId) return undefined;
  const progress = await getSubmerchantProgress(merchantId);
  return snapshotFromProgress(progress);
}

const CREATE_KEYS = new Set([
  "dba",
  "businessEmail",
  "businessPhoneNumber",
  "businessPhoneCountryCode",
  "billingEmail",
]);

function text(values: FormValues, name: string) {
  return typeof values[name] === "string" ? values[name] : undefined;
}

function toCreateBody({
  merchantId,
  email,
  values,
}: {
  merchantId: string;
  email: string;
  values: FormValues;
}): CreateSubmerchantInput {
  const website = text(values, "websiteUrl");
  const websiteUrls = website ? [website] : [];
  return Object.fromEntries(
    Object.entries({
      merchantId,
      email,
      dba: text(values, "dba"),
      industry: FIXED_FIELDS.industry,
      businessEmail: text(values, "businessEmail"),
      businessPhoneNumber: text(values, "businessPhoneNumber"),
      businessPhoneCountryCode: text(values, "businessPhoneCountryCode"),
      billingEmail: text(values, "billingEmail"),
      websiteUrls: websiteUrls.length ? websiteUrls : undefined,
      developmentUrls: websiteUrls.length ? [websiteUrls[0]] : undefined,
      privacyPolicyUrl: websiteUrls[0],
      termsOfServiceUrl: websiteUrls[0],
      returnPolicyUrl: websiteUrls[0],
      payinMethods: FIXED_FIELDS.payinMethods,
      payoutMethods: FIXED_FIELDS.payoutMethods,
    }).filter(([, value]) => value !== undefined),
  ) as unknown as CreateSubmerchantInput;
}

function toDraftFields(values: FormValues): FormValues {
  const rest = Object.fromEntries(
    Object.entries(values).filter(
      ([name]) => !CREATE_KEYS.has(name) && !name.startsWith("websiteUrl"),
    ),
  );
  return withFixedFields(rest);
}

export type StartOnboardingResult =
  | { ok: true; snapshot: AdoraPaySnapshot; events: PayWebhook[] }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export async function startAdoraPayOnboarding(rawValues: unknown): Promise<StartOnboardingResult> {
  const email = await requireMerchantEmail();
  const existing = await findSubmerchantIdByEmail(email);
  if (existing) {
    const progress = await getSubmerchantProgress(existing);
    const snapshot = snapshotFromProgress(progress);
    return { ok: true, snapshot, events: eventsFromSnapshot(snapshot) };
  }

  const values = withoutEmptyValues(sanitizeFormValues(rawValues));
  const fieldErrors = validateForm({
    values,
    fields: FIELD_DEFINITIONS.filter((field) => field.type !== "file"),
    requireAll: true,
  });
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const businessName = text(values, "dba");
  let merchantId: string | undefined;
  try {
    const candidates = accountIdCandidates(String(businessName));
    for (const [index, candidate] of candidates.entries()) {
      try {
        await createSubmerchant(toCreateBody({ merchantId: candidate, email, values }));
        merchantId = candidate;
        break;
      } catch (err) {
        const taken = err instanceof PaymentsError && err.code === "ACCOUNT_ID_TAKEN";
        if (!taken || index === candidates.length - 1) throw err;
      }
    }
  } catch (err) {
    const message = err instanceof PaymentsError ? err.userMessage : "Something went wrong. Please try again.";
    return { ok: false, message };
  }
  if (!merchantId) return { ok: false, message: "Something went wrong. Please try again." };

  const events: PayWebhook[] = [
    {
      id: `created:${merchantId}`,
      type: "submerchant.created",
      summary: `${businessName ?? merchantId} was created under Adora.`,
      at: new Date().toISOString(),
    },
  ];

  try {
    await saveOnboardingDraft({ submerchantId: merchantId, fields: toDraftFields(values) });
    events.push({
      id: `draft:${merchantId}`,
      type: "onboarding.draft.saved",
      summary: `Onboarding details for ${businessName ?? merchantId} were saved.`,
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[dashboard] onboarding draft was not saved", err);
  }

  try {
    await saveMerchantLogin({ merchantId, email });
  } catch (err) {
    console.error("[dashboard] merchant login was not linked to the new account", err);
  }

  const progress = await getSubmerchantProgress(merchantId);
  const snapshot = snapshotFromProgress(progress, businessName);
  const verification = eventsFromSnapshot(snapshot).find((event) => event.type === "verification.updated");
  if (verification && !events.some((event) => event.id === verification.id)) events.push(verification);

  return { ok: true, snapshot, events };
}
