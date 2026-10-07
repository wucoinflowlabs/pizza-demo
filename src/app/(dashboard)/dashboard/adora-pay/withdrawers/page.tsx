import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WithdrawersTable } from "@/features/dashboard/components/withdrawers-table";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { loadWithdrawers, shopTimeZone, type WithdrawersResult, type WithdrawalsSource } from "@/features/dashboard/load-withdrawals";
import { DEFAULT_TIME_ZONE } from "@/features/dashboard/load-payments-series";
import { PAYMENTS_PATH, redirectUnlessAdoraPayReady } from "@/features/dashboard/pay-gate";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";

export const metadata: Metadata = { title: "Withdrawers" };

export default async function WithdrawersPage({ searchParams }: PageProps<"/dashboard/adora-pay/withdrawers">) {
  await redirectUnlessAdoraPayReady();
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.trim() : "";

  const franchise = await getSessionFranchise();
  if (franchise) {
    const selected = parseLocation(params.location, franchise.locations);
    const sources: WithdrawalsSource[] = (selected ? [selected] : enrolledLocations(franchise.locations)).map(
      (location) => ({
        submerchantId: location.submerchantId,
        location: { id: location.id, label: location.label, city: location.city },
      }),
    );
    const result = await loadWithdrawers({ sources, search: search || undefined });
    const locations = franchise.locations.map((location) => ({
      id: location.id,
      label: location.label,
      city: location.city,
      enrolled: location.submerchantId !== null,
    }));
    return (
      <WithdrawersView
        search={search}
        result={result}
        timeZone={DEFAULT_TIME_ZONE}
        locations={locations}
        location={selected?.id}
      />
    );
  }

  const session = await getSessionSubmerchant();
  if (!session) redirect("/login");
  const { login, submerchantId } = session;
  if (!submerchantId) redirect(PAYMENTS_PATH);

  const [timeZone, result] = await Promise.all([
    shopTimeZone(login.id),
    loadWithdrawers({ sources: [{ submerchantId }], search: search || undefined }),
  ]);
  return <WithdrawersView search={search} result={result} timeZone={timeZone} />;
}

function WithdrawersView({
  search,
  result,
  timeZone,
  locations,
  location,
}: {
  search: string;
  result: WithdrawersResult;
  timeZone: string;
  locations?: { id: string; label: string; city: string; enrolled: boolean }[];
  location?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {result.ok ? (
        <WithdrawersTable
          search={search}
          timeZone={timeZone}
          withdrawers={result.withdrawers}
          locations={locations}
          location={location}
          failedLocations={result.failedLocations}
        />
      ) : (
        <WithdrawersTable
          search={search}
          timeZone={timeZone}
          error={result.message}
          locations={locations}
          location={location}
        />
      )}
    </div>
  );
}
