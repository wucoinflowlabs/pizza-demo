import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdoraPayActivity } from "@/features/dashboard/components/adora-pay-activity";
import { AdoraPaySignup } from "@/features/dashboard/components/adora-pay-signup";
import { LAMONICA_EMAIL, LAMONICA_PREFILL } from "@/features/dashboard/lamonica";
import { eventsFromSnapshot, snapshotFromProgress } from "@/features/dashboard/pay-status";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { findSubmerchantIdByEmail } from "@/lib/payments/submerchants";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import { getCurrentMerchantEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Adora Pay" };

export default async function AdoraPayPage() {
  const email = await getCurrentMerchantEmail();
  if (!email) redirect("/login");
  const login = await getMerchantLogin(email);
  if (!login) redirect("/login");

  const submerchantId = await findSubmerchantIdByEmail(login.email);
  if (!submerchantId) {
    const prefill =
      login.email === LAMONICA_EMAIL
        ? LAMONICA_PREFILL
        : { businessEmail: login.email, billingEmail: login.email };
    return <AdoraPaySignup prefill={prefill} />;
  }

  const progress = await getSubmerchantProgress(submerchantId);
  const snapshot = snapshotFromProgress(
    progress,
    login.email === LAMONICA_EMAIL ? String(LAMONICA_PREFILL.dba) : undefined,
  );

  return (
    <AdoraPayActivity
      initialSnapshot={snapshot}
      initialEvents={eventsFromSnapshot(snapshot)}
    />
  );
}
