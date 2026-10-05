import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WithdrawersTable } from "@/features/dashboard/components/withdrawers-table";
import { loadWithdrawers, shopTimeZone } from "@/features/dashboard/load-withdrawals";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";

export const metadata: Metadata = { title: "Withdrawers" };

export default async function WithdrawersPage({ searchParams }: PageProps<"/dashboard/adora-pay/withdrawers">) {
  const session = await getSessionSubmerchant();
  if (!session) redirect("/login");
  const { login, submerchantId } = session;
  if (!submerchantId) redirect("/dashboard/adora-pay");

  const raw = (await searchParams).search;
  const search = typeof raw === "string" ? raw.trim() : "";
  const [timeZone, result] = await Promise.all([
    shopTimeZone(login.id),
    loadWithdrawers({ submerchantId, search: search || undefined }),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {result.ok ? (
        <WithdrawersTable search={search} timeZone={timeZone} withdrawers={result.withdrawers} />
      ) : (
        <WithdrawersTable search={search} timeZone={timeZone} error={result.message} />
      )}
    </div>
  );
}
