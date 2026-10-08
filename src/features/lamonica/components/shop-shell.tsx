"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCart } from "@/features/lamonica/cart";
import { SHOP } from "@/features/lamonica/menu";

export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#F5ECDC] text-[#40321D]">
      <ShopHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <ShopFooter />
    </div>
  );
}

function ShopHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const onMenu = pathname === "/woodstock-pizza";
  const onCheckout = pathname.startsWith("/woodstock-pizza/checkout");

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-[#FFA400] px-4 py-1.5 text-center text-xs font-semibold tracking-[0.18em] text-[#40321D] uppercase">
        Downtown Davis · {SHOP.hours}
      </div>
      <div className="border-b border-[#40321D]/10 bg-[#40321D] text-[#F5ECDC]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/woodstock-pizza" className="flex items-center gap-3">
            <Image
              src="/shops/woodstocks.png"
              alt=""
              width={325}
              height={157}
              priority
              className="h-12 w-auto"
            />
            <span className="hidden font-heading text-lg leading-tight font-bold sm:block">
              Woodstock&apos;s
              <span className="block text-xs font-semibold tracking-[0.16em] text-[#FFA400] uppercase">
                Pizza · Davis
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link
              href="/woodstock-pizza"
              className={`rounded-full px-3 py-2 ${onMenu ? "bg-white/10" : "hover:bg-white/10"}`}
            >
              Menu
            </Link>
            <Link
              href="/woodstock-pizza/checkout"
              className={`rounded-full px-3 py-2 ${
                onCheckout ? "bg-white/10" : "bg-[#FFA400] text-[#40321D]"
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
    <footer className="mt-auto border-t border-[#40321D]/10 bg-[#40321D] text-[#F5ECDC]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="font-heading text-lg font-bold">Woodstock&apos;s Pizza</p>
          <p className="mt-1 text-[#F5ECDC]/80">
            {SHOP.address}
            <br />
            {SHOP.city}
          </p>
        </div>
        <div className="text-[#F5ECDC]/80 sm:text-right">
          <a href={SHOP.phoneHref} className="font-semibold text-[#FFA400]">
            {SHOP.phone}
          </a>
          <p className="mt-1">{SHOP.hours}</p>
        </div>
      </div>
    </footer>
  );
}
