"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { signOutMerchant } from "../actions";
import { MERCHANT_PRODUCTS } from "../products";

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium transition-colors";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Adora products" className="flex flex-1 flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {MERCHANT_PRODUCTS.map((product) => {
          const href = `/dashboard/${product.slug}`;
          const active = pathname === href;
          return (
            <li key={product.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  linkClass,
                  active
                    ? "bg-adora-navy text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {product.title}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="my-3 border-t" />
      <Link
        href="/dashboard/adora-pay"
        aria-current={pathname === "/dashboard/adora-pay" ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          linkClass,
          pathname === "/dashboard/adora-pay"
            ? "bg-adora-navy text-white"
            : "text-foreground hover:bg-muted",
        )}
      >
        Adora Pay
      </Link>
    </nav>
  );
}

function SidebarBody({
  logo,
  email,
  onNavigate,
}: {
  logo: ReactNode;
  email: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <Link href="/dashboard" aria-label="Merchant dashboard" onClick={onNavigate} className="px-2">
        {logo}
      </Link>
      <NavLinks onNavigate={onNavigate} />
      <div className="flex flex-col gap-3 border-t pt-4">
        <span className="truncate px-2 text-xs text-muted-foreground">{email}</span>
        <form action={signOutMerchant}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

export function DashboardShell({
  logo,
  email,
  children,
}: {
  logo: ReactNode;
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <SidebarBody logo={logo} email={email} />
      </aside>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-background md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <SidebarBody logo={logo} email={email} onNavigate={() => setOpen(false)} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <Button type="button" variant="outline" size="icon" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
            {open ? <XIcon /> : <MenuIcon />}
          </Button>
          <span className="truncate text-sm font-medium">{email}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
