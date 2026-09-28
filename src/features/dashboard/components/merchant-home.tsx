import Link from "next/link";
import { ArrowRightIcon, CreditCardIcon, MapPinIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import type { MerchantHomeProfile } from "../merchant-profile";
import { MERCHANT_PRODUCTS } from "../products";

function shopMark(name: string) {
  const words = name.match(/[A-Za-z0-9]+/g) ?? [];
  const mark = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return mark || "A";
}

export function MerchantHome({ profile }: { profile: MerchantHomeProfile }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-3xl bg-shop-fill text-shop-on-fill shadow-[0_28px_60px_-36px_var(--shop-shadow)]">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-10 size-80 rounded-full bg-shop-glow/40 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 size-72 rounded-full bg-shop-highlight/40 blur-3xl" />
            <div className="shop-dots absolute inset-0 opacity-50" />
            <div className="absolute -right-20 -bottom-28 size-[22rem] rounded-full border border-shop-on-fill/10" />
            <div className="absolute -right-8 -bottom-36 size-[26rem] rounded-full border border-shop-on-fill/10" />
          </div>

          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.45fr)_18.5rem] lg:items-stretch lg:p-10">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                {profile.logo ? (
                  <span className="flex h-14 max-w-44 shrink-0 items-center justify-center rounded-2xl bg-white px-2.5 py-1.5 ring-1 ring-shop-on-fill/20">
                    <img
                      src={profile.logo}
                      alt=""
                      className="h-auto max-h-11 w-auto max-w-40 object-contain"
                    />
                  </span>
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-shop-on-fill/10 font-heading text-base font-bold tracking-tight ring-1 ring-shop-on-fill/20">
                    {shopMark(profile.name)}
                  </span>
                )}
        
              </div>
              <div className="flex flex-col gap-6">
                <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                  {profile.name}
                </h1>
                <p className="max-w-xl text-lg text-pretty text-shop-on-fill/80">
                  {profile.place ? `${profile.place}. ` : ""}
                  The counter, the kitchen, and the door, ready for tonight.
                </p>
              <div className="flex flex-wrap items-center gap-2">
                {profile.place ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-shop-on-fill/10 px-3 py-1 text-sm text-shop-on-fill/90 ring-1 ring-shop-on-fill/15">
                    <MapPinIcon className="size-3.5" />
                    {profile.place}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full bg-shop-on-fill/10 px-4 py-2 text-base font-medium text-shop-on-fill/90 ring-1 ring-shop-on-fill/25">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      profile.payConnected
                        ? "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.35)]"
                        : "bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.35)]",
                    )}
                  />
                  {profile.payConnected ? "Adora Pay is on" : "Adora Pay not enrolled"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-4">
                {MERCHANT_PRODUCTS.map((product) => (
                  <Link
                    key={product.slug}
                    href={`/dashboard/${product.slug}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "h-8 rounded-full bg-white px-3 text-shop-ink hover:bg-white/90",
                    )}
                  >
                    {product.slug === "point-of-sale" ? "Open the POS" : product.title}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                ))}
              </div>
              </div>
            </div>

            <Link
              href="/dashboard/adora-pay"
              className="group flex flex-col justify-between gap-6 rounded-2xl bg-shop-panel p-5 ring-1 ring-shop-on-fill/15 transition-colors hover:bg-shop-panel-hover"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-shop-on-fill/15">
                  <CreditCardIcon className="size-5" />
                </span>
                <span className="text-xs font-semibold tracking-[0.16em] text-shop-on-fill/60 uppercase">
                  Adora Pay
                </span>
              </span>
              <span className="flex flex-col gap-2">
                <span className="font-heading text-2xl font-semibold tracking-tight">
                  {profile.payConnected ? "Payments are on" : "Enroll this shop"}
                </span>
                <span className="text-sm leading-relaxed text-shop-on-fill/75">
                  {profile.payConnected
                    ? "Cards, wallets, and bank pay are live for this counter."
                    : "Turn on card, wallet, and bank payments for the tickets this shop already rings up."}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-shop-on-fill">
                {profile.payConnected ? "View Adora Pay" : "Enroll now"}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
