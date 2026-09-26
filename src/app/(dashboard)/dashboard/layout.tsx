import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { DashboardShell } from "@/features/dashboard/components/dashboard-nav";
import { shopLogo } from "@/features/dashboard/shop-logo";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { endMerchantSession, getCurrentMerchantEmail } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const email = await getCurrentMerchantEmail();
  const login = email ? await getMerchantLogin(email) : undefined;
  if (!login) {
    if (email) await endMerchantSession();
    redirect("/login");
  }

  return (
    <DashboardShell
      logo={<Logo />}
      email={login.email}
      name={login.name}
      shopLogo={shopLogo({ name: login.name, email: login.email })}
    >
      {children}
    </DashboardShell>
  );
}
