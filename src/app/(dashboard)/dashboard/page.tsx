import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantHome } from "@/features/dashboard/components/merchant-home";
import { getMerchantHomeProfile } from "@/features/dashboard/merchant-profile";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { getCurrentMerchantEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardHome() {
  const email = await getCurrentMerchantEmail();
  if (!email) redirect("/login");
  const login = await getMerchantLogin(email);
  if (!login) redirect("/login");

  const profile = await getMerchantHomeProfile(login);
  return <MerchantHome profile={profile} />;
}
