"use server";

import { redirect } from "next/navigation";
import { LAMONICA_EMAIL } from "@/features/dashboard/lamonica";
import { findAdoraCustomer } from "@/features/operator/adora-customers";
import { findAdoraStore, shopDemoEmail } from "@/features/operator/adora-stores";
import { storeAccountId } from "@/features/operator/store-account";
import { createInviteUrl } from "@/lib/invites";
import {
  assignSubmerchantLogin,
  ensureMerchantLogin,
  getMerchantLogin,
  getMerchantLoginBySubmerchantId,
  MerchantLoginEmailTakenError,
  saveMerchantLogin,
} from "@/lib/merchant-logins";
import {
  PLATFORM_FIELDS,
  sanitizeFormValues,
  validateForm,
  withoutEmptyValues,
  type FieldErrors,
  type FormValues,
} from "@/lib/onboarding-form";
import { PaymentsError } from "@/lib/payments/errors";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveOnboardingDraft } from "@/lib/payments/onboarding";
import {
  createSubmerchant,
  findSubmerchantIdByEmail,
  getSubmerchant,
  listSubmerchants,
} from "@/lib/payments/submerchants";
import { createWithAvailableId, toCreateBody, toDraftFields } from "@/lib/submerchant-account";
import { startFranchiseSession, startMerchantSession } from "@/lib/session";

export type ApplicationSummary = {
  merchantId: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  verificationStatus: string;
  onboardingFormSubmitted: boolean;
  applicationSubmitted: boolean;
  applicationSubmittedAt?: string;
  /** When the merchant finished the KYB step in the dashboard (from Supabase). */
  kybCompletedAt?: string;
  /** When the merchant submitted the onboarding form (from Supabase). */
  formSubmittedAt?: string;
  approved: boolean;
};

type ListedSubmerchant = {
  merchantId: string;
  createdAt?: string;
  updatedAt?: string;
  users?: { email?: string }[];
  verification?: { status?: string };
  goLiveChecklist?: {
    onboardingFormSubmitted?: boolean;
    applicationSubmitted?: boolean;
    applicationSubmittedAt?: string;
  };
  blocked?: unknown;
};


/** Reads each shop's kyb_completed_at from Supabase, keyed by cf_submerchant_id. */
type ShopTimestamps = { kybCompletedAt?: string; formSubmittedAt?: string };

async function loadShopTimestamps(): Promise<Map<string, ShopTimestamps>> {
  const { data, error } = await getSupabaseAdmin()
    .from("shops")
    .select("cf_submerchant_id, kyb_completed_at, form_submitted_at");
  if (error) {
    console.error(
      "[operator] shop timestamps lookup failed:",
      error.message ?? error.hint ?? JSON.stringify(error),
    );
    return new Map();
  }
  const out = new Map<string, ShopTimestamps>();
  for (const row of data ?? []) {
    if (!row.cf_submerchant_id) continue;
    out.set(row.cf_submerchant_id, {
      kybCompletedAt: row.kyb_completed_at ?? undefined,
      formSubmittedAt: row.form_submitted_at ?? undefined,
    });
  }
  return out;
}

async function listSubmerchantRecords(): Promise<ListedSubmerchant[]> {
  return (await listSubmerchants({ limit: 100 })) as unknown as ListedSubmerchant[];
}

/**
 * Fully-reviewed and live. Sandbox sub-merchants start with `blocked: false`
 * and `verification.status: approved` by default, so neither flag alone is a
 * signal of compliance approval. The real signal is the merchant having
 * clicked "Submit application" (which only unlocks after KYB), confirmed by
 * the account still being unblocked and the Persona case still Approved.
 */
function isApplicationApproved(submerchant: ListedSubmerchant): boolean {
  return (
    !submerchant.blocked &&
    Boolean(submerchant.goLiveChecklist?.applicationSubmitted) &&
    submerchant.verification?.status === "approved"
  );
}

/** Only the fields the operator table shows — the raw records include API keys. */
export async function listApplications(): Promise<ApplicationSummary[]> {
  const [submerchants, shopTimesByMerchantId] = await Promise.all([
    listSubmerchantRecords(),
    loadShopTimestamps(),
  ]);
  return submerchants
    .map((submerchant) => {
      const onboardingFormSubmitted = Boolean(submerchant.goLiveChecklist?.onboardingFormSubmitted);
      const approved = isApplicationApproved(submerchant);
      const applicationSubmittedAt = submerchant.goLiveChecklist?.applicationSubmittedAt;
      return {
        merchantId: submerchant.merchantId,
        email: submerchant.users?.[0]?.email,
        createdAt: submerchant.createdAt,
        updatedAt: submerchant.updatedAt,
        verificationStatus: submerchant.verification?.status ?? "pending",
        onboardingFormSubmitted,
        applicationSubmitted: Boolean(submerchant.goLiveChecklist?.applicationSubmitted),
        applicationSubmittedAt:
          typeof applicationSubmittedAt === "string" ? applicationSubmittedAt : undefined,
        kybCompletedAt: shopTimesByMerchantId.get(submerchant.merchantId)?.kybCompletedAt,
        formSubmittedAt: shopTimesByMerchantId.get(submerchant.merchantId)?.formSubmittedAt,
        approved,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getInviteUrl(merchantId: string): Promise<string> {
  await getSubmerchant(merchantId);
  return createInviteUrl(merchantId);
}

export type CreateApplicationResult =
  | { ok: true; merchantId: string; inviteUrl: string; warning?: string; reused?: boolean }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates the sub-merchant, then prefills every other answer Adora already
 * knows by saving the draft onboarding form on the sub-merchant's behalf.
 */
export async function createApplication({
  email,
  values: rawValues,
  location,
}: {
  email: string;
  values: unknown;
  /** Set when onboarding one Adora location, so the account id stays tied to that store. */
  location?: { customerId: string; storeId: string };
}): Promise<CreateApplicationResult> {
  const values = withoutEmptyValues(sanitizeFormValues(rawValues));
  const fieldErrors = validateForm({ values, fields: PLATFORM_FIELDS, requireAll: false });
  if (!EMAIL.test(email.trim())) fieldErrors.email = "Enter a valid email address";
  if (!values.dba) fieldErrors.dba = "This field is required";
  if (Object.keys(fieldErrors).length)
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };

  const nextEmail = email.trim().toLowerCase();
  const seededEmail = location ? shopDemoEmail(location.customerId, location.storeId) : undefined;
  if (seededEmail && nextEmail !== seededEmail) {
    try {
      const taken = await getMerchantLogin(nextEmail);
      if (taken) {
        return {
          ok: false,
          message: "An account with this email already exists.",
          fieldErrors: { email: "An account with this email already exists." },
        };
      }
    } catch (err) {
      console.error("[operator] merchant login lookup failed", err);
      return { ok: false, message: "Something went wrong." };
    }
  }

  let merchantId: string | undefined;
  let reused = false;
  try {
    if (location) {
      const id = storeAccountId(location.customerId, location.storeId);
      await createSubmerchant(toCreateBody({ merchantId: id, email: email.trim(), values }));
      merchantId = id;
    } else {
      merchantId = await createWithAvailableId({ email: email.trim(), values });
    }
  } catch (err) {
    const emailTaken =
      seededEmail !== undefined &&
      nextEmail === seededEmail &&
      err instanceof PaymentsError &&
      err.code === "EMAIL_TAKEN";
    if (emailTaken) {
      try {
        merchantId = await findSubmerchantIdByEmail(nextEmail);
        reused = Boolean(merchantId);
      } catch (lookupErr) {
        console.error("[operator] existing account lookup failed", lookupErr);
      }
    }
    if (!merchantId) {
      const taken = location && err instanceof PaymentsError && err.code === "ACCOUNT_ID_TAKEN";
      const message = taken
        ? "This location already has a payments account."
        : err instanceof PaymentsError
          ? err.userMessage
          : "Something went wrong.";
      return {
        ok: false,
        message,
        fieldErrors:
          err instanceof PaymentsError && err.code === "EMAIL_TAKEN"
            ? { email: message }
            : undefined,
      };
    }
  }

  if (!merchantId) return { ok: false, message: "Something went wrong." };

  const inviteUrl = await createInviteUrl(merchantId);
  const warnings: string[] = [];
  const storeName = typeof values.dba === "string" ? values.dba : undefined;
  try {
    if (seededEmail) {
      await assignSubmerchantLogin({
        lookupEmail: seededEmail,
        email: nextEmail,
        cfSubmerchantId: merchantId,
        name: storeName,
      });
    } else {
      await saveMerchantLogin({
        cfSubmerchantId: merchantId,
        email: nextEmail,
        name: storeName,
      });
    }
  } catch (err) {
    console.error("[operator] merchant login was not saved", err);
    warnings.push(
      err instanceof MerchantLoginEmailTakenError
        ? "That email is already used by another login."
        : "The merchant login couldn't be saved.",
    );
  }
  if (!reused) {
    try {
      await saveOnboardingDraft({ submerchantId: merchantId, fields: toDraftFields(values) });
    } catch (err) {
      console.error("[operator] prefill draft failed", err);
      warnings.push(
        "Some prefilled answers couldn't be saved. The business will need to fill them in.",
      );
    }
  }
  return {
    ok: true,
    merchantId,
    inviteUrl,
    reused,
    warning: warnings.length ? warnings.join(" ") : undefined,
  };
}

/** The login a store had before onboarding. Lamonica's Westwood shop predates the generated addresses. */
function defaultStoreEmail(customerId: string, storeId: string) {
  return customerId === "lamonica" && storeId === "WESTWOOD"
    ? LAMONICA_EMAIL
    : shopDemoEmail(customerId, storeId);
}

/** Demo sign-in: opens the merchant dashboard as one store, no password. */
export async function signInAsStore(formData: FormData) {
  const customer = findAdoraCustomer(String(formData.get("customerId") ?? ""));
  const store = customer && findAdoraStore(customer.id, String(formData.get("storeId") ?? ""));
  if (!customer || !store) redirect("/operator");

  // An onboarded store's login may have moved to the email the operator typed,
  // so the Coinflow id finds it first.
  const merchantId = String(formData.get("merchantId") ?? "") || undefined;
  const login =
    (merchantId && (await getMerchantLoginBySubmerchantId(merchantId))) ||
    (await ensureMerchantLogin({
      email: defaultStoreEmail(customer.id, store.id),
      name: customer.name,
      cfSubmerchantId: merchantId,
    }));

  await startMerchantSession(login.email);
  redirect("/dashboard");
}

/** Demo sign-in: opens the dashboard as the owner of every location under one brand. */
export async function signInAsFranchise(formData: FormData) {
  const customer = findAdoraCustomer(String(formData.get("customerId") ?? ""));
  if (!customer) redirect("/operator");
  await startFranchiseSession(customer.id);
  redirect("/dashboard");
}
