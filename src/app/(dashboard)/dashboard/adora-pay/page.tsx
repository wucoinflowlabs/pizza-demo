import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdoraPayActivity } from "@/features/dashboard/components/adora-pay-activity";
import { AdoraPaySignup } from "@/features/dashboard/components/adora-pay-signup";
import { PaymentsChart } from "@/features/dashboard/components/payments-chart";
import { RememberMerchantAccount } from "@/features/dashboard/components/remember-merchant-account";
import { enrolledLocations, getSessionFranchise } from "@/features/dashboard/franchise";
import { LAMONICA_EMAIL, LAMONICA_PREFILL } from "@/features/dashboard/lamonica";
import { loadPaymentsSeries } from "@/features/dashboard/load-payments-series";
import { eventsFromSnapshot, isAdoraPayEnrolled, snapshotFromProgress } from "@/features/dashboard/pay-status";
import { merchantSignupPrefill } from "@/features/dashboard/signup-prefill";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { sanitizeFormValues } from "@/lib/onboarding-form";
import { getOnboardingForm } from "@/lib/payments/onboarding";
import { findSubmerchantIdByEmail } from "@/lib/payments/submerchants";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import { getCurrentAccountId, getCurrentMerchantEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Adora Pay" };

export default async function AdoraPayPage({ searchParams }: PageProps<"/dashboard/adora-pay">) {
  // A franchise owner sees every store's settled payments together. Onboarding
  // belongs to each store, so none of it is shown here.
  const franchise = await getSessionFranchise();
  if (franchise) {
    const payments = await loadPaymentsSeries({
      submerchantIds: enrolledLocations(franchise.locations).map((location) => location.submerchantId),
    });
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-8">
        {payments.ok ? <PaymentsChart series={payments.series} /> : <PaymentsChart error={payments.message} />}
      </div>
    );
  }

  const email = await getCurrentMerchantEmail();
  if (!email) redirect("/operator");
  const login = await getMerchantLogin(email);
  if (!login) redirect("/operator");
  const openApplication = (await searchParams).enroll === "1";

  const submerchantId =
    (await findSubmerchantIdByEmail(login.email)) ?? login.cfSubmerchantId ?? undefined;
  if (!submerchantId) {
    return (
      <AdoraPaySignup
        prefill={merchantSignupPrefill(login.email)}
        openApplication={openApplication}
      />
    );
  }

  const [progress, form, currentAccountId, payments] = await Promise.all([
    getSubmerchantProgress(submerchantId),
    getOnboardingForm(submerchantId),
    getCurrentAccountId(),
    loadPaymentsSeries({ submerchantIds: [submerchantId], loginId: login.id }),
  ]);
  const bindAccount = currentAccountId === submerchantId ? null : <RememberMerchantAccount />;
  const paymentsChart = payments.ok ? (
    <PaymentsChart series={payments.series} />
  ) : (
    <PaymentsChart error={payments.message} />
  );

  // Stay on the application until Coinflow has recorded the submission and
  // unblocked the account. A submitted onboarding form is not enrollment.
  const settled = isAdoraPayEnrolled(progress);

  if (!settled) {
    return (
      <>
        {bindAccount}
        <AdoraPaySignup
          prefill={{ ...merchantSignupPrefill(login.email), ...sanitizeFormValues(form) }}
          initialProgress={progress}
          backdrop={paymentsChart}
          openApplication={openApplication}
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
      <div className="mx-auto w-full max-w-5xl px-4 pt-8">{paymentsChart}</div>
      <AdoraPayActivity
        initialSnapshot={snapshot}
        initialEvents={eventsFromSnapshot(snapshot)}
      />
    </>
  );
}
