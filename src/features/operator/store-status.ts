export type StoreOnboardingStatus =
  | "not-started"
  | "verification-pending"
  | "verification-in-progress"
  | "verification-approved"
  | "form-submitted"
  | "under-review"
  | "approved";

type ApplicationProgress = {
  verificationStatus: string;
  onboardingFormSubmitted: boolean;
  applicationSubmitted: boolean;
  approved: boolean;
};

const LABELS: Record<StoreOnboardingStatus, string> = {
  "not-started": "Not started",
  "verification-pending": "Verification pending",
  "verification-in-progress": "Verification in progress",
  "verification-approved": "Verification approved",
  "form-submitted": "Form submitted",
  "under-review": "Under review",
  approved: "Approved",
};

export function storeOnboardingStatus(
  application: ApplicationProgress | undefined,
): StoreOnboardingStatus {
  if (!application) return "not-started";
  if (application.approved) return "approved";
  if (application.applicationSubmitted) return "under-review";
  if (application.onboardingFormSubmitted) return "form-submitted";
  if (application.verificationStatus === "approved") return "verification-approved";
  if (application.verificationStatus === "partialApproval") return "verification-in-progress";
  return "verification-pending";
}

export function storeOnboardingLabel(status: StoreOnboardingStatus): string {
  return LABELS[status];
}
