"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChefHatIcon,
  CreditCardIcon,
  FileTextIcon,
  GiftIcon,
  GlobeIcon,
  HouseIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  ReceiptTextIcon,
  ShieldAlertIcon,
  TruckIcon,
  UsersRoundIcon,
  WalletCardsIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { signOutMerchant } from "../actions";
import { MERCHANT_PRODUCTS } from "../products";
import { shopThemeStyle, type ShopTheme } from "../shop-theme";

const PRODUCT_ICONS: Record<(typeof MERCHANT_PRODUCTS)[number]["slug"], LucideIcon> = {
  "point-of-sale": MonitorIcon,
  "online-ordering": GlobeIcon,
  "kitchen-display": ChefHatIcon,
  delivery: TruckIcon,
  loyalty: GiftIcon,
};

function accountMark(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.split("@")[0] || "";
  const words = source.match(/[A-Za-z0-9]+/g) ?? [];
  const mark = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return mark || "A";
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  accent,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:ring-offset-2 focus-visible:ring-offset-shop-surface focus-visible:outline-none",
        active
          ? "bg-white text-shop-ink shadow-[0_10px_24px_-16px_var(--shop-ink)] ring-1 ring-shop-ink/10"
          : "text-foreground/80 hover:bg-white/80 hover:text-shop-ink",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          accent
            ? "bg-adora-blue/12 text-adora-blue ring-1 ring-adora-blue/25"
            : active
              ? "bg-shop-fill text-shop-on-fill"
              : "bg-white text-shop-ink/55 ring-1 ring-shop-ink/10 group-hover:text-shop-ink",
        )}
      >
        <Icon className="size-4" />
      </span>
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pt-5 pb-1.5 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function NavLinks({ onNavigate, franchise }: { onNavigate?: () => void; franchise?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Adora products" className="flex flex-1 flex-col">
      <NavItem
        href="/dashboard"
        label="Home"
        icon={HouseIcon}
        active={pathname === "/dashboard"}
        onNavigate={onNavigate}
      />
      <SectionLabel>Payments</SectionLabel>
      <NavItem
        href="/dashboard/adora-pay"
        label="Analytics"
        icon={CreditCardIcon}
        active={pathname === "/dashboard/adora-pay"}
        onNavigate={onNavigate}
        accent
      />
      <NavItem
        href="/dashboard/adora-pay/payments"
        label="Payments"
        icon={ReceiptTextIcon}
        active={pathname === "/dashboard/adora-pay/payments"}
        onNavigate={onNavigate}
        accent
      />
      <NavItem
        href="/dashboard/adora-pay/chargebacks"
        label="Chargebacks"
        icon={ShieldAlertIcon}
        // Includes the dispute screen under it.
        active={pathname.startsWith("/dashboard/adora-pay/chargebacks")}
        onNavigate={onNavigate}
        accent
      />
      {franchise && (
        <NavItem
          href="/dashboard/adora-pay/statements"
          label="Statements"
          icon={FileTextIcon}
          active={pathname === "/dashboard/adora-pay/statements"}
          onNavigate={onNavigate}
          accent
        />
      )}
      <SectionLabel>Withdrawals</SectionLabel>
      <NavItem
        href="/dashboard/adora-pay/withdraws"
        label="Withdraws"
        icon={WalletCardsIcon}
        active={pathname === "/dashboard/adora-pay/withdraws"}
        onNavigate={onNavigate}
        accent
      />
      <NavItem
        href="/dashboard/adora-pay/withdrawers"
        label="Staff"
        icon={UsersRoundIcon}
        active={pathname === "/dashboard/adora-pay/withdrawers"}
        onNavigate={onNavigate}
        accent
      />
      <SectionLabel>Products</SectionLabel>
      <ul className="flex flex-col gap-0.5">
        {MERCHANT_PRODUCTS.map((product) => {
          const href = `/dashboard/${product.slug}`;
          return (
            <li key={product.slug}>
              <NavItem
                href={href}
                label={product.title}
                icon={PRODUCT_ICONS[product.slug]}
                active={pathname === href}
                onNavigate={onNavigate}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AccountMark({
  name,
  email,
  logo,
}: {
  name?: string | null;
  email: string;
  logo?: string;
}) {
  if (logo) {
    return (
      <span className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-shop-ink/10">
        <img src={logo} alt="" className="max-h-9 max-w-14 object-contain" />
      </span>
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-shop-fill font-heading text-xs font-bold text-shop-on-fill">
      {accountMark(name, email)}
    </span>
  );
}

function SidebarBody({
  logo,
  email,
  name,
  subtitle,
  shopLogo,
  franchise,
  onNavigate,
}: {
  logo: ReactNode;
  email: string;
  name?: string | null;
  subtitle?: string;
  shopLogo?: string;
  franchise?: boolean;
  onNavigate?: () => void;
}) {
  const shop = name?.trim();

  return (
    <div className="flex min-h-full flex-col px-3.5 py-5">
      <Link
        href="/dashboard"
        aria-label="Merchant dashboard"
        onClick={onNavigate}
        className="px-1.5"
      >
        {logo}
      </Link>
      <div
        aria-hidden
        className="mx-1.5 mt-5 mb-4 h-px bg-gradient-to-r from-transparent via-shop-accent/35 to-transparent"
      />
      <NavLinks onNavigate={onNavigate} franchise={franchise} />
      <div className="mt-6 rounded-2xl bg-white p-3 shadow-[0_16px_40px_-28px_var(--shop-ink)] ring-1 ring-shop-ink/10">
        <div className="flex items-center gap-2.5 px-0.5">
          <AccountMark name={shop} email={email} logo={shopLogo} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {shop || email}
            </span>
            {shop ? (
              <span className="block truncate text-xs text-muted-foreground">{subtitle ?? email}</span>
            ) : null}
          </span>
        </div>
        <form action={signOutMerchant} className="mt-2.5">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-8 w-full text-muted-foreground hover:bg-shop-surface hover:text-shop-ink"
          >
            <LogOutIcon />
            Switch restaurant
          </Button>
        </form>
      </div>
    </div>
  );
}

export function DashboardShell({
  logo,
  email,
  name,
  subtitle,
  shopLogo,
  franchise,
  theme,
  children,
}: {
  logo: ReactNode;
  email: string;
  name?: string | null;
  /** Shown under the name in place of the email, e.g. for a franchise owner. */
  subtitle?: string;
  shopLogo?: string;
  /** A franchise owner, who also gets the Statements page. */
  franchise?: boolean;
  theme: ShopTheme;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shop = name?.trim();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-full flex-1" style={shopThemeStyle(theme)}>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-shop-ink/10 bg-gradient-to-b from-shop-surface via-shop-surface to-background md:flex">
        <SidebarBody
          logo={logo}
          email={email}
          name={name}
          subtitle={subtitle}
          shopLogo={shopLogo}
          franchise={franchise}
        />
      </aside>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-shop-ink/30 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex-col overflow-y-auto border-r border-shop-ink/10 bg-gradient-to-b from-shop-surface via-shop-surface to-background md:hidden",
          open ? "animate-in slide-in-from-left flex duration-200" : "hidden",
        )}
      >
        <SidebarBody
          logo={logo}
          email={email}
          name={name}
          subtitle={subtitle}
          shopLogo={shopLogo}
          franchise={franchise}
          onNavigate={() => setOpen(false)}
        />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-shop-surface to-background">
        <div className="flex items-center gap-3 border-b border-shop-ink/10 bg-shop-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="border-shop-ink/10 bg-white text-shop-ink"
          >
            {open ? <XIcon /> : <MenuIcon />}
          </Button>
          <span className="truncate text-sm font-medium">{shop || email}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
