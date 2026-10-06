import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TipsLedger } from "@/features/dashboard/components/tips-ledger";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { DEFAULT_TIME_ZONE, shopTimeZone } from "@/features/dashboard/load-payments-series";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { loadRecentTippedPayments, loadTipSummary } from "@/features/dashboard/tips/queries";
import { loadTipRecipient } from "@/features/dashboard/tips/recipient";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Tips" };

export default async function TipsPage({ searchParams }: PageProps<"/dashboard/adora-pay/tips">) {
  const franchise = await getSessionFranchise();
  if (franchise) return <FranchiseTips franchise={franchise} searchParams={searchParams} />;

  const session = await getSessionSubmerchant();
  if (!session) redirect("/login");
  const { login, submerchantId } = session;
  if (!submerchantId) redirect("/dashboard/adora-pay");

  const [timeZone, recipient] = await Promise.all([
    shopTimeZone(login.id),
    loadTipRecipient({ shopId: login.id, submerchantId }),
  ]);

  return <TipsView shopId={login.id} timeZone={timeZone} recipient={recipient} />;
}

async function FranchiseTips({
  franchise,
  searchParams,
}: {
  franchise: NonNullable<Awaited<ReturnType<typeof getSessionFranchise>>>;
  searchParams: PageProps<"/dashboard/adora-pay/tips">["searchParams"];
}) {
  const enrolled = enrolledLocations(franchise.locations);
  const picked =
    parseLocation((await searchParams).location, franchise.locations) ?? enrolled[0];

  const locations = franchise.locations.map((location) => ({
    id: location.id,
    label: location.label,
    city: location.city,
    enrolled: location.submerchantId !== null,
  }));

  if (!picked) {
    return (
      <EmptyTips
        locations={locations}
        location={undefined}
        title="No enrolled shops yet"
        body="Enroll a shop in Adora Pay to see tips."
      />
    );
  }

  // Resolve the shop row (shops.id === merchant_logins.id) from the franchise
  // location's Coinflow sub-merchant id.
  const { data: shop } = await getSupabaseAdmin()
    .from("shops")
    .select("id, timezone")
    .eq("cf_submerchant_id", picked.submerchantId)
    .maybeSingle();

  const timeZone = shop?.timezone ?? DEFAULT_TIME_ZONE;
  const recipient = shop
    ? await loadTipRecipient({ shopId: shop.id, submerchantId: picked.submerchantId })
    : undefined;

  return (
    <TipsView
      shopId={shop?.id}
      timeZone={timeZone}
      recipient={recipient}
      locations={locations}
      location={picked.id}
    />
  );
}

async function TipsView({
  shopId,
  timeZone,
  recipient,
  locations,
  location,
}: {
  shopId?: string;
  timeZone: string;
  recipient: Awaited<ReturnType<typeof loadTipRecipient>>;
  locations?: { id: string; label: string; city: string; enrolled: boolean }[];
  location?: string;
}) {
  if (!recipient || !shopId) {
    return (
      <EmptyTips
        locations={locations}
        location={location}
        title="Tips aren't set up"
        body={
          <>
            No staff row matches <code className="rounded bg-muted px-1 py-0.5">TIP_RECIPIENT_CF_USER_ID</code> for this
            shop. Insert a staff row with a matching <code className="rounded bg-muted px-1 py-0.5">cf_user_id</code>.
          </>
        }
      />
    );
  }

  const [summary, recent] = await Promise.all([
    loadTipSummary({ shopId, staffId: recipient.staffId, timeZone }),
    loadRecentTippedPayments({ shopId, staffId: recipient.staffId }),
  ]);

  return (
    <TipsLedger
      recipient={recipient}
      summary={summary}
      recent={recent}
      timeZone={timeZone}
      locations={locations}
      location={location}
    />
  );
}

function EmptyTips({
  locations,
  location,
  title,
  body,
}: {
  locations?: { id: string; label: string; city: string; enrolled: boolean }[];
  location?: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <TipsLedger
      recipient={undefined}
      summary={undefined}
      recent={undefined}
      timeZone="America/Los_Angeles"
      locations={locations}
      location={location}
      emptyState={{ title, body }}
    />
  );
}
