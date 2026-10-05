import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantHome } from "@/features/dashboard/components/merchant-home";
import { enrolledLocations, franchiseSummary, getSessionFranchise } from "@/features/dashboard/franchise";
import { getMerchantHomeProfile } from "@/features/dashboard/merchant-profile";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { getCurrentMerchantEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardHome() {
  const franchise = await getSessionFranchise();
  if (franchise) {
    const { customer, locations } = franchise;
    return (
      <MerchantHome
        profile={{
          name: customer.name,
          place: `${franchiseSummary(franchise)} · ${customer.location.city}, ${customer.location.state}`,
          payConnected: enrolledLocations(locations).length > 0,
          logo: customer.logo,
        }}
      />
    );
  }

  const email = await getCurrentMerchantEmail();
  if (!email) redirect("/operator");
  const login = await getMerchantLogin(email);
  if (!login) redirect("/operator");

  const profile = await getMerchantHomeProfile(login);
  return <MerchantHome profile={profile} />;
}
