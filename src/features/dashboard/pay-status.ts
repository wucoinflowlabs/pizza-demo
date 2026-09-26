export type AdoraPaySnapshot = {
  merchantId: string;
  businessName?: string;
  verificationStatus: string;
  onboardingFormSubmitted: boolean;
  applicationSubmitted: boolean;
  approved: boolean;
};

export type PayWebhook = {
  id: string;
  type: string;
  summary: string;
  at: string;
};

export type PayStep = {
  id: string;
  label: string;
  done: boolean;
};

const VERIFIED = new Set(["approved", "partialApproval"]);

export function paySteps(snapshot: AdoraPaySnapshot): PayStep[] {
  return [
    { id: "account", label: "Account created", done: true },
    { id: "details", label: "Onboarding details saved", done: true },
    {
      id: "verification",
      label: `Business verification · ${snapshot.verificationStatus}`,
      done: VERIFIED.has(snapshot.verificationStatus),
    },
    {
      id: "form",
      label: "Onboarding form submitted",
      done: snapshot.onboardingFormSubmitted,
    },
    {
      id: "review",
      label: "Application in review",
      done: snapshot.applicationSubmitted,
    },
  ];
}

/** Events already implied by the account's current onboarding state. */
export function eventsFromSnapshot(snapshot: AdoraPaySnapshot, at = new Date().toISOString()): PayWebhook[] {
  const name = snapshot.businessName ?? snapshot.merchantId;
  const events: PayWebhook[] = [
    {
      id: `created:${snapshot.merchantId}`,
      type: "submerchant.created",
      summary: `${name} was created under Adora.`,
      at,
    },
    {
      id: `draft:${snapshot.merchantId}`,
      type: "onboarding.draft.saved",
      summary: `Onboarding details for ${name} were saved.`,
      at,
    },
    {
      id: `verification:${snapshot.merchantId}:${snapshot.verificationStatus}`,
      type: "verification.updated",
      summary: `Verification status is ${snapshot.verificationStatus}.`,
      at,
    },
  ];
  if (snapshot.onboardingFormSubmitted) {
    events.push({
      id: `form:${snapshot.merchantId}`,
      type: "onboarding.form.submitted",
      summary: `${name} submitted the onboarding form.`,
      at,
    });
  }
  if (snapshot.applicationSubmitted) {
    events.push({
      id: `review:${snapshot.merchantId}`,
      type: "application.submitted",
      summary: `${name} was submitted for review.`,
      at,
    });
  }
  return events;
}
