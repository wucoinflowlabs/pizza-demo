import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TipsLedger } from "@/features/dashboard/components/tips-ledger";
import { shopTimeZone } from "@/features/dashboard/load-payments-series";
import { getSessionSubmerchant } from "@/features/dashboard/session-submerchant";
import { loadRecentTippedPayments, loadTipSummary } from "@/features/dashboard/tips/queries";
import { loadTipRecipient } from "@/features/dashboard/tips/recipient";

export const metadata: Metadata = { title: "Tips" };

export default async function TipsPage() {
  const session = await getSessionSubmerchant();
  if (!session) redirect("/login");
  const { login, submerchantId } = session;
  if (!submerchantId) redirect("/dashboard/adora-pay");

  const [timeZone, recipient] = await Promise.all([
    shopTimeZone(login.id),
    loadTipRecipient({ shopId: login.id, submerchantId }),
  ]);

  if (!recipient) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center text-muted-foreground">
        <h1 className="font-heading text-2xl text-shop-ink">Tips aren&apos;t set up</h1>
        <p className="mt-2 text-sm">
          No staff row matches <code className="rounded bg-muted px-1 py-0.5">TIP_RECIPIENT_CF_USER_ID</code>. Insert a
          staff row for this shop with a matching <code className="rounded bg-muted px-1 py-0.5">cf_user_id</code> and a
          <code className="rounded bg-muted px-1 py-0.5"> payout_accounts</code> row for Venmo.
        </p>
      </div>
    );
  }

  const [summary, recent] = await Promise.all([
    loadTipSummary({ shopId: login.id, staffId: recipient.staffId, timeZone }),
    loadRecentTippedPayments({ shopId: login.id, staffId: recipient.staffId }),
  ]);

  return <TipsLedger recipient={recipient} summary={summary} recent={recent} timeZone={timeZone} />;
}
