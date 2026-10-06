"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCart } from "@/features/lamonica/cart";
import { SHOP } from "@/features/lamonica/menu";

export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#FFF6E2] text-[#181848]">
      <ShopHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <ShopFooter />
    </div>
  );
}

function ShopHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const onMenu = pathname === "/lamonica";
  const onCheckout = pathname.startsWith("/lamonica/checkout");

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-[#F0A020] px-4 py-1.5 text-center text-xs font-semibold tracking-[0.18em] text-[#181848] uppercase">
        Steps from UCLA · {SHOP.hours}
      </div>
      <div className="border-b border-[#181848]/10 bg-[#181848] text-[#FFF6E2]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/lamonica" className="flex items-center gap-3">
            <Image
              src="/shops/lamonicas.png"
              alt=""
              width={220}
              height={116}
              priority
              className="h-12 w-auto"
            />
            <span className="hidden font-heading text-lg leading-tight font-bold sm:block">
              Lamonica&apos;s
              <span className="block text-xs font-semibold tracking-[0.16em] text-[#F0A020] uppercase">
                NY Pizza
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link
              href="/lamonica"
              className={`rounded-full px-3 py-2 ${onMenu ? "bg-white/10" : "hover:bg-white/10"}`}
            >
              Menu
            </Link>
            <Link
              href="/lamonica/checkout"
              className={`rounded-full px-3 py-2 ${
                onCheckout ? "bg-white/10" : "bg-[#F0A020] text-[#181848]"
              }`}
            >
              Cart{count > 0 ? ` · ${count}` : ""}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function ShopFooter() {
  return (
    <footer className="mt-auto border-t border-[#181848]/10 bg-[#181848] text-[#FFF6E2]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="font-heading text-lg font-bold">Lamonica&apos;s NY Pizza</p>
          <p className="mt-1 text-[#FFF6E2]/80">
            {SHOP.address}
            <br />
            {SHOP.city}
          </p>
        </div>
        <div className="text-[#FFF6E2]/80 sm:text-right">
          <a href={SHOP.phoneHref} className="font-semibold text-[#F0A020]">
            {SHOP.phone}
          </a>
          <p className="mt-1">{SHOP.hours}</p>
        </div>
      </div>
    </footer>
  );
}
