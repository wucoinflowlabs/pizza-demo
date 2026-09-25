import "server-only";
import type { SubmerchantFields } from "@/lib/payments/types";
import {
  normalizeUrl,
  type AccountValues,
  type ContactValues,
  type OnlinePresenceValues,
  type PaymentsValues,
} from "./schema";

export function accountToFields({
  dba,
  industry,
}: AccountValues): SubmerchantFields {
  return { dba, industry };
}

export function contactToFields(values: ContactValues): SubmerchantFields {
  const base = {
    businessEmail: values.businessEmail,
    businessPhoneCountryCode: values.businessPhoneCountryCode,
    businessPhoneNumber: values.businessPhoneNumber,
  };
  if (values.billingEmailSameAsBusinessEmail)
    return { ...base, billingEmailSameAsBusinessEmail: true };
  return {
    ...base,
    billingEmailSameAsBusinessEmail: false,
    billingEmail: values.billingEmail,
  };
}

export function onlinePresenceToFields(
  values: OnlinePresenceValues,
): SubmerchantFields {
  const fields: SubmerchantFields = {
    websiteUrls: values.websiteUrls.map(({ value }) => normalizeUrl(value)),
    privacyPolicyUrl: normalizeUrl(values.privacyPolicyUrl),
    termsOfServiceUrl: normalizeUrl(values.termsOfServiceUrl),
  };
  if (values.returnPolicyUrl)
    fields.returnPolicyUrl = normalizeUrl(values.returnPolicyUrl);
  return fields;
}

// The provider takes multi-select answers as comma-separated strings.
export function paymentsToFields(values: PaymentsValues): SubmerchantFields {
  return {
    payinMethods: values.payinMethods.join(","),
    payoutMethods: values.payoutMethods.join(","),
    endUserJurisdictions: values.endUserJurisdictions.join(","),
  };
}
