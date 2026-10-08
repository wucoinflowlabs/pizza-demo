import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdoraPayActivity } from "@/features/dashboard/components/adora-pay-activity";
import { PaymentsChart } from "@/features/dashboard/components/payments-chart";
import { RememberMerchantAccount } from "@/features/dashboard/components/remember-merchant-account";
import { enrolledLocations, getSessionFranchise } from "@/features/dashboard/franchise";
import { findShopBrand } from "@/features/dashboard/shop-logo";
import { loadPaymentsSeries } from "@/features/dashboard/load-payments-series";
import { PAYMENTS_PATH } from "@/features/dashboard/pay-gate";
import { eventsFromSnapshot, isAdoraPayEnrolled, snapshotFromProgress } from "@/features/dashboard/pay-status";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import { getCurrentAccountId } from "@/lib/session";

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

  const session = await getSessionSubmerchant();
  if (!session) redirect("/operator");
  const { login, submerchantId } = session;
  const openApplication = (await searchParams).enroll === "1";
  if (!submerchantId) {
    redirect(openApplication ? `${PAYMENTS_PATH}?enroll=1` : PAYMENTS_PATH);
  }

  const progress = await getSubmerchantProgress(submerchantId);
  // Enrollment lives on the payments page until Coinflow has accepted the application.
  if (!isAdoraPayEnrolled(progress)) {
    redirect(openApplication ? `${PAYMENTS_PATH}?enroll=1` : PAYMENTS_PATH);
  }

  const [currentAccountId, payments] = await Promise.all([
    getCurrentAccountId(),
    loadPaymentsSeries({ submerchantIds: [submerchantId], loginId: login.id }),
  ]);

  const bindAccount = currentAccountId === submerchantId ? null : <RememberMerchantAccount />;
  const paymentsChart = payments.ok ? (
    <PaymentsChart series={payments.series} />
  ) : (
    <PaymentsChart error={payments.message} />
  );

  // Lamonica's stores are shown as Woodstock's; other stores keep the account id.
  const brand = findShopBrand(login);
  const snapshot = snapshotFromProgress(progress, brand?.id === "lamonica" ? brand.name : undefined);

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
