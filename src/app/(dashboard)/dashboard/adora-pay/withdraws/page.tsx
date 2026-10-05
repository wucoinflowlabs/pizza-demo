import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WithdrawsTable } from "@/features/dashboard/components/withdraws-table";
import { loadWithdraws, shopTimeZone } from "@/features/dashboard/load-withdrawals";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { parseWithdrawRange } from "@/features/dashboard/withdraw-range";

export const metadata: Metadata = { title: "Withdraws" };

export default async function WithdrawsPage({ searchParams }: PageProps<"/dashboard/adora-pay/withdraws">) {
  const session = await getSessionSubmerchant();
  if (!session) redirect("/login");
  const { login, submerchantId } = session;
  if (!submerchantId) redirect("/dashboard/adora-pay");

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const timeZone = await shopTimeZone(login.id);
  const range = parseWithdrawRange({ from: params.from, to: params.to, timeZone, now: new Date() });
  const result = await loadWithdraws({ submerchantId, range, timeZone, search: search || undefined });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {result.ok ? (
        <WithdrawsTable
          search={search}
          range={range}
          timeZone={timeZone}
          withdraws={result.withdraws}
          now={result.now}
        />
      ) : (
        <WithdrawsTable search={search} range={range} timeZone={timeZone} error={result.message} />
      )}
    </div>
  );
}
