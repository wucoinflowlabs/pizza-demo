import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrdersTable } from "@/features/dashboard/components/orders-table";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { loadOrders, type OrdersResult } from "@/features/dashboard/load-orders";
import { parseOrderWindow, type OrderWindow } from "@/features/dashboard/orders";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";

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
  // Payments only exist once the shop has an Adora Pay account.
  const { login, submerchantId } = session;
  if (!submerchantId) redirect("/dashboard/adora-pay");

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
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
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
