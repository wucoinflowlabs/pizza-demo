import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrdersTable } from "@/features/dashboard/components/orders-table";
import { loadOrders } from "@/features/dashboard/load-orders";
import { parseOrderWindow } from "@/features/dashboard/orders";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/dashboard/adora-pay/payments">) {
  const session = await getSessionSubmerchant();
  if (!session) redirect("/operator");
  // Payments only exist once the shop has an Adora Pay account.
  const { login, submerchantId } = session;
  if (!submerchantId) redirect("/dashboard/adora-pay");

  const window = parseOrderWindow((await searchParams).window);
  const result = await loadOrders({ submerchantId, loginId: login.id, window });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {result.ok ? (
        <OrdersTable
          window={window}
          orders={result.orders}
          timeZone={result.timeZone}
          now={result.now}
        />
      ) : (
        <OrdersTable window={window} error={result.message} />
      )}
    </div>
  );
}
