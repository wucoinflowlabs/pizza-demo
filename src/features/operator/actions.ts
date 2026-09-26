"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { fakerEN_US as faker } from "@faker-js/faker";
import { accountIdCandidates, slugify } from "@/lib/account-id";
import { createInviteUrl } from "@/lib/invites";
import { saveMerchantLogin } from "@/lib/merchant-logins";
import {
  FIXED_FIELDS,
  PLATFORM_FIELDS,
  sanitizeFormValues,
  validateForm,
  withFixedFields,
  withoutEmptyValues,
  type FieldErrors,
  type FormValues,
} from "@/lib/onboarding-form";
import { PaymentsError } from "@/lib/payments/errors";
import { saveOnboardingDraft } from "@/lib/payments/onboarding";
import {
  createSubmerchant,
  getSubmerchant,
  listSubmerchants,
} from "@/lib/payments/submerchants";
import {
  chainAddresses,
  getSettlementAddresses,
  type RawSettlementAddresses,
} from "@/lib/payments/settlement";
import type { CreateSubmerchantInput } from "@/lib/payments/types";
import { endOperatorSession, isOperator, startOperatorSession } from "@/lib/session";
import {
  alignSettlementWithParent,
  payoutStatus,
  type PayoutStatus,
} from "@/lib/settlement-setup";

async function requireOperator() {
  if (!(await isOperator())) redirect("/operator");
}

export async function signInOperator(
  _previous: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const expected = process.env.OPERATOR_PASSCODE ?? "";
  const given = String(formData.get("passcode") ?? "");
  const matches =
    expected.length > 0 &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!matches) return { error: "That passcode isn't right." };

  await startOperatorSession();
  redirect("/operator");
}

export async function signOutOperator() {
  await endOperatorSession();
  redirect("/operator");
}

export type ApplicationSummary = {
  merchantId: string;
  email?: string;
  createdAt?: string;
  verificationStatus: string;
  onboardingFormSubmitted: boolean;
  applicationSubmitted: boolean;
  approved: boolean;
  payouts: PayoutStatus;
};

type ListedSubmerchant = {
  merchantId: string;
  createdAt?: string;
  users?: { email?: string }[];
  verification?: { status?: string };
  goLiveChecklist?: { onboardingFormSubmitted?: boolean; applicationSubmitted?: boolean };
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
  await requireOperator();
  const [submerchants, parent] = await Promise.all([
    listSubmerchantRecords(),
    getSettlementAddresses(),
  ]);
  return submerchants
    .map((submerchant) => {
      const onboardingFormSubmitted = Boolean(submerchant.goLiveChecklist?.onboardingFormSubmitted);
      const approved = isApplicationApproved(submerchant);
      return {
        merchantId: submerchant.merchantId,
        email: submerchant.users?.[0]?.email,
        createdAt: submerchant.createdAt,
        verificationStatus: submerchant.verification?.status ?? "pending",
        onboardingFormSubmitted,
        applicationSubmitted: Boolean(submerchant.goLiveChecklist?.applicationSubmitted),
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
 * to the operator screen points newly approved businesses' settlement at The
 * Za's wallet. Only accounts that are unblocked and have submitted onboarding
 * details, and still need a wallet, are touched.
 */
export async function sweepSettlements(): Promise<{ configured: string[]; failed: string[] }> {
  await requireOperator();
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
  await requireOperator();
  await getSubmerchant(merchantId);
  return createInviteUrl(merchantId);
}

export type CreateApplicationResult =
  | { ok: true; merchantId: string; inviteUrl: string; warning?: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fields the create endpoint accepts; everything else goes through the draft endpoint.
function toCreateBody({
  merchantId,
  email,
  values,
}: {
  merchantId: string;
  email: string;
  values: FormValues;
}): CreateSubmerchantInput {
  const text = (name: string) =>
    typeof values[name] === "string" ? (values[name] as string) : undefined;
  const website =
    typeof values.websiteUrl === "string" && values.websiteUrl.length > 0
      ? values.websiteUrl
      : undefined;
  const websiteUrls = website ? [website] : [];

  return Object.fromEntries(
    Object.entries({
      merchantId,
      email,
      dba: text("dba"),
      industry: FIXED_FIELDS.industry,
      businessEmail: text("businessEmail"),
      businessPhoneNumber: text("businessPhoneNumber"),
      businessPhoneCountryCode: text("businessPhoneCountryCode"),
      billingEmail: text("billingEmail"),
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

const CREATE_KEYS = new Set([
  "dba",
  "businessEmail",
  "businessPhoneNumber",
  "businessPhoneCountryCode",
  "billingEmail",
]);

function toDraftFields(values: FormValues): FormValues {
  const rest = Object.fromEntries(
    Object.entries(values).filter(
      ([name]) => !CREATE_KEYS.has(name) && !name.startsWith("websiteUrl"),
    ),
  );
  return withFixedFields(rest);
}

async function createWithAvailableId({
  email,
  values,
}: {
  email: string;
  values: FormValues;
}): Promise<string> {
  const candidates = accountIdCandidates(String(values.dba));
  for (const [index, merchantId] of candidates.entries()) {
    try {
      await createSubmerchant(toCreateBody({ merchantId, email, values }));
      return merchantId;
    } catch (err) {
      const taken = err instanceof PaymentsError && err.code === "ACCOUNT_ID_TAKEN";
      if (!taken || index === candidates.length - 1) throw err;
    }
  }
  throw new PaymentsError({ code: "ACCOUNT_ID_TAKEN" });
}

/**
 * Creates the sub-merchant, then prefills every other answer Adora already
 * knows by saving the draft onboarding form on the sub-merchant's behalf.
 */
export async function createApplication({
  email,
  values: rawValues,
}: {
  email: string;
  values: unknown;
}): Promise<CreateApplicationResult> {
  await requireOperator();

  const values = withoutEmptyValues(sanitizeFormValues(rawValues));
  const fieldErrors = validateForm({ values, fields: PLATFORM_FIELDS, requireAll: false });
  if (!EMAIL.test(email.trim())) fieldErrors.email = "Enter a valid email address";
  if (!values.dba) fieldErrors.dba = "This field is required";
  if (Object.keys(fieldErrors).length)
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };

  let merchantId: string;
  try {
    merchantId = await createWithAvailableId({ email: email.trim(), values });
  } catch (err) {
    const message = err instanceof PaymentsError ? err.userMessage : "Something went wrong.";
    return {
      ok: false,
      message,
      fieldErrors:
        err instanceof PaymentsError && err.code === "EMAIL_TAKEN"
          ? { email: message }
          : undefined,
    };
  }

  const inviteUrl = await createInviteUrl(merchantId);
  const warnings: string[] = [];
  try {
    await saveMerchantLogin({ merchantId, email: email.trim() });
  } catch (err) {
    console.error("[operator] merchant login was not saved", err);
    warnings.push("The account was created, but the merchant login couldn't be saved.");
  }
  try {
    await saveOnboardingDraft({ submerchantId: merchantId, fields: toDraftFields(values) });
  } catch (err) {
    console.error("[operator] prefill draft failed", err);
    warnings.push(
      "Some prefilled answers couldn't be saved. The business will need to fill them in.",
    );
  }
  return {
    ok: true,
    merchantId,
    inviteUrl,
    warning: warnings.length ? warnings.join(" ") : undefined,
  };
}

const PIZZA_SUFFIXES = ["Pizzeria", "Pizza Co.", "Brick Oven", "Slice Shop", "Pizza Kitchen"];
const AREA_CODES = ["312", "415", "646", "737", "206", "617"];

/** Realistic demo data for a pizzeria joining Adora Payments. */
export async function generateSampleApplication(): Promise<{
  email: string;
  values: FormValues;
}> {
  await requireOperator();
  const owner = faker.person.lastName();
  const suffix = faker.helpers.arrayElement(PIZZA_SUFFIXES);
  const dba = `${owner}'s ${suffix}`;
  const slug = slugify(dba);
  const domain = `${slug}.example`;
  const email = `demo+${faker.string.alphanumeric({ length: 6, casing: "lower" })}@example.com`;

  return {
    email,
    values: {
      dba,
      businessPhoneCountryCode: "+1",
      businessPhoneNumber: `(${faker.helpers.arrayElement(AREA_CODES)}) 555-01${faker.number.int({ min: 10, max: 99 })}`,
      businessEmail: `hello@${domain}`,
      billingEmail: `hello@${domain}`,
      whatDoesYourBusinessDo: `${dba} is a neighborhood pizzeria in ${faker.location.city()} serving wood-fired pizza, salads and drinks for dine-in, pickup and delivery. Customers pay online through Adora online ordering and in store.`,
      websiteUrl: `https://${domain}`,
    },
  };
}
