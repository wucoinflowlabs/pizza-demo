import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { DashboardShell } from "@/features/dashboard/components/dashboard-nav";
import { SidebarBalance, SidebarBalanceSkeleton } from "@/features/dashboard/components/sidebar-balance";
import { franchiseSummary, getSessionFranchise } from "@/features/dashboard/franchise";
import { shopLogo } from "@/features/dashboard/shop-logo";
import { shopTheme } from "@/features/dashboard/shop-theme";
import { getMerchantLogin } from "@/lib/merchant-logins";
import { endMerchantSession, getCurrentMerchantEmail } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const franchise = await getSessionFranchise();
  if (franchise) {
    const { customer } = franchise;
    return (
      <DashboardShell
        logo={<Logo coinflow={false} />}
        email={customer.name}
        name={customer.name}
        subtitle={`Franchise owner · ${franchiseSummary(franchise)}`}
        shopLogo={customer.logo}
        franchise
        balance={
          <Suspense fallback={<SidebarBalanceSkeleton />}>
            <SidebarBalance franchise />
          </Suspense>
        }
        theme={shopTheme({ name: customer.name })}
      >
        {children}
      </DashboardShell>
    );
  }

  const email = await getCurrentMerchantEmail();
  const login = email ? await getMerchantLogin(email) : undefined;
  if (!login) {
    if (email) await endMerchantSession();
    redirect("/operator");
  }

  return (
    <DashboardShell
      logo={<Logo coinflow={false} />}
      email={login.email}
      name={login.name}
      shopLogo={shopLogo({ name: login.name, email: login.email })}
      balance={
        <Suspense fallback={<SidebarBalanceSkeleton />}>
          <SidebarBalance />
        </Suspense>
      }
      theme={shopTheme({ name: login.name, email: login.email })}
    >
      {children}
    </DashboardShell>
  );
}
