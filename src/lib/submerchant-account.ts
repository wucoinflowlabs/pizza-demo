import "server-only";
import { accountIdCandidates } from "@/lib/account-id";
import { FIXED_FIELDS, withFixedFields, type FormValues } from "@/lib/onboarding-form";
import { PaymentsError } from "@/lib/payments/errors";
import { createSubmerchant } from "@/lib/payments/submerchants";
import type { CreateSubmerchantInput } from "@/lib/payments/types";

const CREATE_KEYS = new Set([
  "dba",
  "businessEmail",
  "businessPhoneNumber",
  "businessPhoneCountryCode",
  "billingEmail",
]);

function text(values: FormValues, name: string) {
  const value = values[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Fields the create endpoint accepts. Everything else is saved on the draft. */
export function toCreateBody({
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

export function toDraftFields(values: FormValues): FormValues {
  const rest = Object.fromEntries(
    Object.entries(values).filter(
      ([name]) => !CREATE_KEYS.has(name) && !name.startsWith("websiteUrl"),
    ),
  );
  return withFixedFields(rest);
}

/** Tries the slug, then numbered suffixes, then a random suffix. */
export async function createWithAvailableId({
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
