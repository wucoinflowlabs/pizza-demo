"use server";

import { shopDemoEmail } from "@/features/operator/adora-stores";
import { storeAccountId } from "@/features/operator/store-account";
import { createInviteUrl } from "@/lib/invites";
import {
  assignSubmerchantLogin,
  getMerchantLogin,
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
import { saveOnboardingDraft } from "@/lib/payments/onboarding";
import {
  createSubmerchant,
  findSubmerchantIdByEmail,
  getSubmerchant,
  listSubmerchants,
} from "@/lib/payments/submerchants";
import { createWithAvailableId, toCreateBody, toDraftFields } from "@/lib/submerchant-account";
import {
  chainAddresses,
  getSettlementAddresses,
  type RawSettlementAddresses,
} from "@/lib/payments/settlement";
import {
  alignSettlementWithParent,
  payoutStatus,
  type PayoutStatus,
} from "@/lib/settlement-setup";

export type ApplicationSummary = {
  merchantId: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  verificationStatus: string;
  onboardingFormSubmitted: boolean;
  applicationSubmitted: boolean;
  applicationSubmittedAt?: string;
  approved: boolean;
  payouts: PayoutStatus;
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
  settlementAddresses?: RawSettlementAddresses;
};

async function listSubmerchantRecords(): Promise<ListedSubmerchant[]> {
  return (await listSubmerchants({ limit: 100 })) as unknown as ListedSubmerchant[];
}

/** An unblocked account is not approval until onboarding details are submitted. */
function isApplicationApproved(submerchant: ListedSubmerchant): boolean {
  return (
    !submerchant.blocked && Boolean(submerchant.goLiveChecklist?.onboardingFormSubmitted)
  );
}

/** Only the fields the operator table shows — the raw records include API keys. */
export async function listApplications(): Promise<ApplicationSummary[]> {
  const [submerchants, parent] = await Promise.all([
    listSubmerchantRecords(),
    getSettlementAddresses(),
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
        approved,
        payouts: payoutStatus({
          approved,
          parent,
          child: chainAddresses(submerchant.settlementAddresses),
        }),
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/**
 * Coinflow sends no webhook when an admin approves an account, so each visit
 * to the operator screen points newly approved businesses' settlement at
 * Adora's wallet. Only accounts that are unblocked and have submitted onboarding
 * details, and still need a wallet, are touched.
 */
export async function sweepSettlements(): Promise<{ configured: string[]; failed: string[] }> {
  const [submerchants, parent] = await Promise.all([
    listSubmerchantRecords(),
    getSettlementAddresses(),
  ]);

  const needsSetup = submerchants.filter((submerchant) => {
    const child = chainAddresses(submerchant.settlementAddresses);
    return payoutStatus({ approved: isApplicationApproved(submerchant), parent, child }) === "missing";
  });

  const configured: string[] = [];
  const failed: string[] = [];
  for (const submerchant of needsSetup) {
    const state = await alignSettlementWithParent({
      submerchantId: submerchant.merchantId,
      parent,
      child: chainAddresses(submerchant.settlementAddresses),
    });
    (state === "configured" ? configured : failed).push(submerchant.merchantId);
  }
  return { configured, failed };
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
