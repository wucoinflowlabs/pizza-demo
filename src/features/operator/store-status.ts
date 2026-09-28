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
  createdAt?: string;
  updatedAt?: string;
  /** Set by Coinflow when the application is sent for review. */
  applicationSubmittedAt?: string;
};

/** When each operator step was finished. Absent fields have no recorded time. */
export type OnboardingCompletedAt = {
  account?: string;
  form?: string;
  approved?: string;
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
  now = Date.now(),
): StoreOnboardingStatus {
  if (!application) return "not-started";
  if (application.approved) {
    const approvedAt = onboardingCompletedAt(application).approved;
    if (approvedAt && Date.parse(approvedAt) > now) return "under-review";
    return "approved";
  }
  if (application.applicationSubmitted) return "under-review";
  if (application.onboardingFormSubmitted) return "form-submitted";
  if (application.verificationStatus === "approved") return "verification-approved";
  if (application.verificationStatus === "partialApproval") return "verification-in-progress";
  return "verification-pending";
}

export function storeOnboardingLabel(status: StoreOnboardingStatus): string {
  return LABELS[status];
}

/**
 * A just-submitted store stays under review until its approval time.
 * After that moment, a held review is shown as approved.
 */
export function revealApproval(
  status: StoreOnboardingStatus,
  completedAt: OnboardingCompletedAt | undefined,
  now: number,
): StoreOnboardingStatus {
  const approvedAt = completedAt?.approved;
  if (!approvedAt) return status;
  const at = Date.parse(approvedAt);
  if (Number.isNaN(at)) return status;
  if (at > now) return status === "approved" ? "under-review" : status;
  if (status === "under-review") return "approved";
  return status;
}

/** Demo gap so approval doesn't land on the same second as form submit. */
export const SUBMIT_TO_APPROVAL_MS = 5_000;

function delayIso(iso: string, ms: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  return new Date(time + ms).toISOString();
}

/**
 * Coinflow stores account creation and the last write to the merchant, not a
 * clock for every step. An unblocked account becomes approved when the form
 * is submitted, so that later timestamp is when both steps finish. Approval
 * is shown a few seconds after submit.
 */
export function onboardingCompletedAt(
  application: ApplicationProgress | undefined,
): OnboardingCompletedAt {
  if (!application?.createdAt) return {};
  const later = application.updatedAt ?? application.applicationSubmittedAt;
  const form = application.onboardingFormSubmitted ? later : undefined;
  return {
    account: application.createdAt,
    form,
    approved: application.approved
      ? form
        ? delayIso(form, SUBMIT_TO_APPROVAL_MS)
        : later
      : undefined,
  };
}
