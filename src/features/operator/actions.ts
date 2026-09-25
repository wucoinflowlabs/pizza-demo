"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { fakerEN_US as faker } from "@faker-js/faker";
import { accountIdCandidates, slugify } from "@/lib/account-id";
import { createInviteUrl } from "@/lib/invites";
import {
  FIXED_FIELDS,
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
  getSubmerchant,
  listSubmerchants,
} from "@/lib/payments/submerchants";
import type { CreateSubmerchantInput } from "@/lib/payments/types";
import { endOperatorSession, isOperator, startOperatorSession } from "@/lib/session";

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
};

type ListedSubmerchant = {
  merchantId: string;
  createdAt?: string;
  users?: { email?: string }[];
  verification?: { status?: string };
  goLiveChecklist?: { onboardingFormSubmitted?: boolean; applicationSubmitted?: boolean };
  blocked?: unknown;
};

/** Only the fields the operator table shows — the raw records include API keys. */
export async function listApplications(): Promise<ApplicationSummary[]> {
  await requireOperator();
  const submerchants = (await listSubmerchants({ limit: 100 })) as unknown as ListedSubmerchant[];
  return submerchants
    .map((submerchant) => ({
      merchantId: submerchant.merchantId,
      email: submerchant.users?.[0]?.email,
      createdAt: submerchant.createdAt,
      verificationStatus: submerchant.verification?.status ?? "pending",
      onboardingFormSubmitted: Boolean(submerchant.goLiveChecklist?.onboardingFormSubmitted),
      applicationSubmitted: Boolean(submerchant.goLiveChecklist?.applicationSubmitted),
      approved: !submerchant.blocked,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
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

function urlList(values: FormValues, prefix: string, first: string): string[] {
  return [first, `${prefix}2`, `${prefix}3`, `${prefix}4`, `${prefix}5`]
    .map((name) => values[name])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function hasProduct(values: FormValues, product: string): boolean {
  const products = values.products;
  return typeof products === "string" && products.split(",").includes(product);
}

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
  const websiteUrls = urlList(values, "websiteUrl", "websiteUrl");
  const developmentUrls = urlList(values, "developmentUrl", "developmentUrl");

  return Object.fromEntries(
    Object.entries({
      merchantId,
      email,
      dba: text("dba"),
      industry: text("industry"),
      businessEmail: text("businessEmail"),
      businessPhoneNumber: text("businessPhoneNumber"),
      businessPhoneCountryCode: text("businessPhoneCountryCode"),
      billingEmail: text("billingEmail"),
      websiteUrls: websiteUrls.length ? websiteUrls : undefined,
      developmentUrls: developmentUrls.length ? developmentUrls : undefined,
      privacyPolicyUrl: text("privacyPolicyUrl"),
      termsOfServiceUrl: text("termsOfServiceUrl"),
      returnPolicyUrl: text("returnPolicyUrl"),
      payinMethods: hasProduct(values, "checkout") ? text("payinMethods") : undefined,
      payoutMethods: hasProduct(values, "userPayouts") ? text("payoutMethods") : undefined,
    }).filter(([, value]) => value !== undefined),
  ) as unknown as CreateSubmerchantInput;
}

const CREATE_KEYS = new Set([
  "dba",
  "industry",
  "businessEmail",
  "businessPhoneNumber",
  "businessPhoneCountryCode",
  "billingEmail",
  "privacyPolicyUrl",
  "termsOfServiceUrl",
  "returnPolicyUrl",
  "payinMethods",
  "payoutMethods",
]);

function toDraftFields(values: FormValues): FormValues {
  const rest = Object.fromEntries(
    Object.entries(values).filter(
      ([name]) =>
        !CREATE_KEYS.has(name) &&
        !name.startsWith("websiteUrl") &&
        !name.startsWith("developmentUrl"),
    ),
  );
  return { ...rest, ...FIXED_FIELDS };
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
 * Creates the sub-merchant, then prefills every other answer The Za already
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
  if (!values.industry) fieldErrors.industry = "This field is required";
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
  try {
    await saveOnboardingDraft({ submerchantId: merchantId, fields: toDraftFields(values) });
  } catch (err) {
    console.error("[operator] prefill draft failed", err);
    return {
      ok: true,
      merchantId,
      inviteUrl,
      warning:
        "The account was created, but some prefilled answers couldn't be saved. The business will need to fill them in.",
    };
  }
  return { ok: true, merchantId, inviteUrl };
}

const PIZZA_SUFFIXES = ["Pizzeria", "Pizza Co.", "Brick Oven", "Slice Shop", "Pizza Kitchen"];
const AREA_CODES = ["312", "415", "646", "737", "206", "617"];

/** Realistic demo data for a pizzeria joining The Za. */
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
      industry: "foodBeverage",
      dba,
      businessPhoneCountryCode: "+1",
      businessPhoneNumber: `(${faker.helpers.arrayElement(AREA_CODES)}) 555-01${faker.number.int({ min: 10, max: 99 })}`,
      businessEmail: `hello@${domain}`,
      billingEmail: `hello@${domain}`,
      whatDoesYourBusinessDo: `${dba} is a neighborhood pizzeria in ${faker.location.city()} serving wood-fired pizza, salads and drinks for dine-in, pickup and delivery. Customers pay online through The Za's ordering page and in store.`,
      websiteUrl: `https://${domain}`,
      products: "checkout",
      bankSettlementMethods: "ach",
      payinMethods: "card,applePay,googlePay",
      payinsMonthlyVolume: {
        currency: "usd",
        amount: faker.number.int({ min: 20, max: 120 }) * 1000,
      },
      payinsAverageTransactionSize: {
        currency: "usd",
        amount: faker.number.int({ min: 25, max: 60 }),
      },
      payinsMaximumTransactionSize: {
        currency: "usd",
        amount: faker.number.int({ min: 3, max: 8 }) * 100,
      },
      businessCountryOfIncorporation: "US",
      endUserGeoDistribution: [{ region: "US", percentage: 100 }],
      activeCustomers: "<10,000",
      customerSupportMethods: "live,email",
      privacyPolicyUrl: `https://${domain}/privacy`,
      termsOfServiceUrl: `https://${domain}/terms`,
      returnPolicyUrl: `https://${domain}/refunds`,
    },
  };
}
