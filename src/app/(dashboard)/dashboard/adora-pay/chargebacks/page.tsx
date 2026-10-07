import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChargebacksTable } from "@/features/dashboard/components/chargebacks-table";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { loadChargebacks, type ChargebacksResult } from "@/features/dashboard/load-chargebacks";
import { parseOrderWindow, type OrderWindow } from "@/features/dashboard/orders";
import { PAYMENTS_PATH, redirectUnlessAdoraPayReady } from "@/features/dashboard/pay-gate";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";

export const metadata: Metadata = { title: "Chargebacks" };

export default async function ChargebacksPage({ searchParams }: PageProps<"/dashboard/adora-pay/chargebacks">) {
  await redirectUnlessAdoraPayReady();
  const params = await searchParams;
  const window = parseOrderWindow(params.window);

  // A franchise owner reads each store's chargebacks with that store's own
  // sub-merchant id, or just one store when a location is picked.
  const franchise = await getSessionFranchise();
  if (franchise) {
    const selected = parseLocation(params.location, franchise.locations);
    const sources = (selected ? [selected] : enrolledLocations(franchise.locations)).map((location) => ({
      submerchantId: location.submerchantId,
      location: { id: location.id, label: location.label, city: location.city },
    }));
    const result = await loadChargebacks({ sources, window });
    const locations = franchise.locations.map((location) => ({
      id: location.id,
      label: location.label,
      city: location.city,
      enrolled: location.submerchantId !== null,
    }));
    return <ChargebacksView window={window} result={result} locations={locations} location={selected?.id} />;
  }

  const session = await getSessionSubmerchant();
  if (!session) redirect("/operator");
  // Chargebacks only exist once the shop has an Adora Pay account.
  const { login, submerchantId } = session;
  if (!submerchantId) redirect(PAYMENTS_PATH);

  const result = await loadChargebacks({ sources: [{ submerchantId }], loginId: login.id, window });
  return <ChargebacksView window={window} result={result} />;
}

function ChargebacksView({
  window,
  result,
  locations,
  location,
}: {
  window: OrderWindow;
  result: ChargebacksResult;
  locations?: { id: string; label: string; city: string; enrolled: boolean }[];
  location?: string;
}) {
  return (
    // Full width: the table has more columns than fit in the Payments page's max width.
    <div className="w-full px-4 py-8 sm:px-6">
      {result.ok ? (
        <ChargebacksTable
          window={window}
          chargebacks={result.chargebacks}
          timeZone={result.timeZone}
          now={result.now}
          locations={locations}
          location={location}
          failedLocations={result.failedLocations}
        />
      ) : (
        <ChargebacksTable window={window} error={result.message} locations={locations} location={location} />
      )}
    </div>
  );
}
