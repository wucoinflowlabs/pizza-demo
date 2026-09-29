import { ADORA_CUSTOMERS } from "@/features/operator/adora-customers";
import { ADORA_STORES } from "@/features/operator/adora-stores";
import { ADORA_PREFILL, type FormValues } from "@/lib/onboarding-form";
import { LAMONICA_EMAIL, LAMONICA_PREFILL } from "./lamonica";

/** Plus-address from a store login: chris+mmp-kjt3q@… is Mountain Mike's KJT3Q. */
const STORE_LOGIN = /^[^+@]+\+([a-z0-9]+)-([a-z0-9]+)@/;

/** Answers Adora already has for this login, shown when the shop enrolls in Adora Pay. */
export function merchantSignupPrefill(email: string): FormValues {
  const normalized = email.trim().toLowerCase();
  if (normalized === LAMONICA_EMAIL) return LAMONICA_PREFILL;

  const known: FormValues = {
    ...ADORA_PREFILL,
    businessEmail: normalized,
    billingEmail: normalized,
  };

  const match = normalized.match(STORE_LOGIN);
  const customer = match
    ? ADORA_CUSTOMERS.find((item) => item.id === match[1])
    : undefined;
  if (!customer) return known;

  const store = ADORA_STORES.find(
    (item) => item.customerId === customer.id && item.id.toLowerCase() === match?.[2],
  );
  const phone = store?.phone || customer.phone;

  return {
    ...known,
    dba: customer.name,
    businessPhoneCountryCode: "+1",
    ...(phone ? { businessPhoneNumber: phone } : {}),
    ...(customer.websiteUrl ? { websiteUrl: customer.websiteUrl } : {}),
  };
}
