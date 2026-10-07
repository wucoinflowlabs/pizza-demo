import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { redirectUnlessAdoraPayReady } from "@/features/dashboard/pay-gate";
import { dayIn } from "@/features/dashboard/withdraw-range";
import { StatementsTable } from "@/features/statements/components/statements-table";
import { STATEMENT_TIME_ZONE, loadStatementDays } from "@/features/statements/load-statements";

export const metadata: Metadata = { title: "Statements" };

const DAYS = 14;

/** Daily statements are a franchise owner's view: one store, or every store rolled up. */
export default async function StatementsPage({ searchParams }: PageProps<"/dashboard/adora-pay/statements">) {
  await redirectUnlessAdoraPayReady();
  const franchise = await getSessionFranchise();
  if (!franchise) redirect("/dashboard/adora-pay");

  const params = await searchParams;
  const selected = parseLocation(params.location, franchise.locations);
  const locations = selected ? [selected] : enrolledLocations(franchise.locations);
  const result = await loadStatementDays({ franchise, locations, days: DAYS });
  const options = franchise.locations.map((location) => ({
    id: location.id,
    label: location.label,
    city: location.city,
    enrolled: location.submerchantId !== null,
  }));
  const shared = {
    locations: options,
    location: selected?.id,
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {result.ok ? (
        <StatementsTable {...shared} days={result.days} today={result.today} failedLocations={result.failedLocations} />
      ) : (
        <StatementsTable {...shared} today={dayIn(STATEMENT_TIME_ZONE, new Date())} error={result.message} />
      )}
    </div>
  );
}
