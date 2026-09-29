import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdoraPayActivity } from "@/features/dashboard/components/adora-pay-activity";
import { AdoraPaySignup } from "@/features/dashboard/components/adora-pay-signup";
import { RememberMerchantAccount } from "@/features/dashboard/components/remember-merchant-account";
import { LAMONICA_EMAIL, LAMONICA_PREFILL } from "@/features/dashboard/lamonica";
import { eventsFromSnapshot, snapshotFromProgress } from "@/features/dashboard/pay-status";
import { merchantSignupPrefill } from "@/features/dashboard/signup-prefill";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { sanitizeFormValues } from "@/lib/onboarding-form";
import { getOnboardingForm } from "@/lib/payments/onboarding";
import { findSubmerchantIdByEmail } from "@/lib/payments/submerchants";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import { getCurrentAccountId, getCurrentMerchantEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Adora Pay" };

export default async function AdoraPayPage() {
  const email = await getCurrentMerchantEmail();
  if (!email) redirect("/login");
  const login = await getMerchantLogin(email);
  if (!login) redirect("/login");

  const submerchantId = await findSubmerchantIdByEmail(login.email);
  if (!submerchantId) {
    return <AdoraPaySignup prefill={merchantSignupPrefill(login.email)} />;
  }

  const [progress, form, currentAccountId] = await Promise.all([
    getSubmerchantProgress(submerchantId),
    getOnboardingForm(submerchantId),
    getCurrentAccountId(),
  ]);
  const bindAccount = currentAccountId === submerchantId ? null : <RememberMerchantAccount />;

  if (!progress.applicationSubmitted) {
    return (
      <>
        {bindAccount}
        <AdoraPaySignup
          prefill={{ ...merchantSignupPrefill(login.email), ...sanitizeFormValues(form) }}
          initialProgress={progress}
        />
      </>
    );
  }

  const snapshot = snapshotFromProgress(
    progress,
    login.email === LAMONICA_EMAIL ? String(LAMONICA_PREFILL.dba) : undefined,
  );

  return (
    <>
      {bindAccount}
      <AdoraPayActivity
        initialSnapshot={snapshot}
        initialEvents={eventsFromSnapshot(snapshot)}
      />
    </>
  );
}
