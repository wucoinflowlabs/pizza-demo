import "server-only";
import { paymentsRequest } from "./client";

/** Flat map of onboarding form field name → stored value. */
export type OnboardingFormData = Record<string, unknown>;

export function getOnboardingForm(submerchantId: string) {
  return paymentsRequest<OnboardingFormData>({
    method: "GET",
    path: "/merchant/onboarding",
    asSubmerchant: submerchantId,
  });
}

/** Merges into the stored draft; only type-checks, so partial data is fine. */
export function saveOnboardingDraft({
  submerchantId,
  fields,
}: {
  submerchantId: string;
  fields: OnboardingFormData;
}) {
  return paymentsRequest<void>({
    method: "POST",
    path: "/merchant/onboarding/draft",
    body: fields,
    asSubmerchant: submerchantId,
  });
}

/**
 * Validates the body alone (not the stored draft) against the full
 * conditional schema, so callers must send every field.
 */
export function submitOnboardingForm({
  submerchantId,
  fields,
}: {
  submerchantId: string;
  fields: OnboardingFormData;
}) {
  return paymentsRequest<void>({
    method: "POST",
    path: "/merchant/onboarding/submit",
    body: fields,
    asSubmerchant: submerchantId,
  });
}

/**
 * "Submit application": sends the application to the provider's compliance
 * review. Requires approved KYB and a submitted form; afterwards the form is
 * locked (409 on further edits).
 */
export function submitApplicationForReview(submerchantId: string) {
  return paymentsRequest<void>({
    method: "POST",
    path: "/merchant/onboarding/review",
    body: {},
    asSubmerchant: submerchantId,
  });
}
