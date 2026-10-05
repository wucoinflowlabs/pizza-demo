import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WithdrawsTable } from "@/features/dashboard/components/withdraws-table";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import {
  loadWithdraws,
  shopTimeZone,
  type WithdrawsResult,
  type WithdrawalsSource,
} from "@/features/dashboard/load-withdrawals";
import { DEFAULT_TIME_ZONE } from "@/features/dashboard/load-payments-series";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { parseWithdrawRange, type WithdrawRange } from "@/features/dashboard/withdraw-range";

export const metadata: Metadata = { title: "Withdraws" };

export default async function WithdrawsPage({ searchParams }: PageProps<"/dashboard/adora-pay/withdraws">) {
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
    const timeZone = DEFAULT_TIME_ZONE;
    const range = parseWithdrawRange({ from: params.from, to: params.to, timeZone, now: new Date() });
    const result = await loadWithdraws({ sources, range, timeZone, search: search || undefined });
    const locations = franchise.locations.map((location) => ({
      id: location.id,
      label: location.label,
      city: location.city,
      enrolled: location.submerchantId !== null,
    }));
    return (
      <WithdrawsView
        search={search}
        range={range}
        timeZone={timeZone}
        result={result}
        locations={locations}
        location={selected?.id}
      />
    );
  }

  const session = await getSessionSubmerchant();
  if (!session) redirect("/login");
  const { login, submerchantId } = session;
  if (!submerchantId) redirect("/dashboard/adora-pay");

  const timeZone = await shopTimeZone(login.id);
  const range = parseWithdrawRange({ from: params.from, to: params.to, timeZone, now: new Date() });
  const result = await loadWithdraws({
    sources: [{ submerchantId }],
    range,
    timeZone,
    search: search || undefined,
  });
  return <WithdrawsView search={search} range={range} timeZone={timeZone} result={result} />;
}

function WithdrawsView({
  search,
  range,
  timeZone,
  result,
  locations,
  location,
}: {
  search: string;
  range: WithdrawRange;
  timeZone: string;
  result: WithdrawsResult;
  locations?: { id: string; label: string; city: string; enrolled: boolean }[];
  location?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {result.ok ? (
        <WithdrawsTable
          search={search}
          range={range}
          timeZone={timeZone}
          withdraws={result.withdraws}
          now={result.now}
          locations={locations}
          location={location}
          failedLocations={result.failedLocations}
        />
      ) : (
        <WithdrawsTable
          search={search}
          range={range}
          timeZone={timeZone}
          error={result.message}
          locations={locations}
          location={location}
        />
      )}
    </div>
  );
}
