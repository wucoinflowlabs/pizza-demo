import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdoraPaySignup } from "@/features/dashboard/components/adora-pay-signup";
import { OrdersTable } from "@/features/dashboard/components/orders-table";
import { RememberMerchantAccount } from "@/features/dashboard/components/remember-merchant-account";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { loadOrders, type OrdersResult } from "@/features/dashboard/load-orders";
import { parseOrderWindow, type OrderWindow } from "@/features/dashboard/orders";
import { isAdoraPayEnrolled } from "@/features/dashboard/pay-status";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { merchantSignupPrefill } from "@/features/dashboard/signup-prefill";
import { sanitizeFormValues } from "@/lib/onboarding-form";
import { getOnboardingForm } from "@/lib/payments/onboarding";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import { getCurrentAccountId } from "@/lib/session";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/dashboard/adora-pay/payments">) {
  const params = await searchParams;
  const window = parseOrderWindow(params.window);

  // A franchise owner reads each store's payments with that store's own
  // sub-merchant id, or just one store when a location is picked.
  const franchise = await getSessionFranchise();
  if (franchise) {
    const selected = parseLocation(params.location, franchise.locations);
    const sources = (selected ? [selected] : enrolledLocations(franchise.locations)).map((location) => ({
      submerchantId: location.submerchantId,
      location: { id: location.id, label: location.label, city: location.city },
    }));
    const result = await loadOrders({ sources, window });
    const locations = franchise.locations.map((location) => ({
      id: location.id,
      label: location.label,
      city: location.city,
      enrolled: location.submerchantId !== null,
    }));
    return <PaymentsView window={window} result={result} locations={locations} location={selected?.id} />;
  }

  const session = await getSessionSubmerchant();
  if (!session) redirect("/operator");
  const { login, submerchantId } = session;
  const openApplication = params.enroll === "1";

  // Until the shop is enrolled, this page is the enroll carousel. Other pages send people here.
  if (!submerchantId) {
    return <AdoraPaySignup prefill={merchantSignupPrefill(login.email)} openApplication={openApplication} />;
  }

  const [progress, currentAccountId] = await Promise.all([
    getSubmerchantProgress(submerchantId),
    getCurrentAccountId(),
  ]);
  if (!isAdoraPayEnrolled(progress)) {
    const form = await getOnboardingForm(submerchantId);
    return (
      <>
        {currentAccountId === submerchantId ? null : <RememberMerchantAccount />}
        <AdoraPaySignup
          prefill={{ ...merchantSignupPrefill(login.email), ...sanitizeFormValues(form) }}
          initialProgress={progress}
          openApplication={openApplication}
        />
      </>
    );
  }

  const result = await loadOrders({ sources: [{ submerchantId }], loginId: login.id, window });
  return <PaymentsView window={window} result={result} />;
}

function PaymentsView({
  window,
  result,
  locations,
  location,
}: {
  window: OrderWindow;
  result: OrdersResult;
  locations?: { id: string; label: string; city: string; enrolled: boolean }[];
  location?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 py-8">
      {result.ok ? (
        <OrdersTable
          window={window}
          orders={result.orders}
          timeZone={result.timeZone}
          now={result.now}
          locations={locations}
          location={location}
          failedLocations={result.failedLocations}
        />
      ) : (
        <OrdersTable window={window} error={result.message} locations={locations} location={location} />
      )}
    </div>
  );
}
