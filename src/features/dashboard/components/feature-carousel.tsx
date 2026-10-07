"use client";

import { useEffect, useState } from "react";
import {
  BarChart3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  LandmarkIcon,
  SmartphoneIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

const SLIDE_MS = 4_000;

const SLIDES: { icon: LucideIcon; kicker: string; title: string; body: string }[] = [
  {
    icon: ZapIcon,
    kicker: "After the drawer closes",
    title: "Instant payouts",
    body: "Friday's money can reach the account the same night — bank transfer, instant payout, or push to a debit card once the ticket is paid.",
  },
  {
    icon: CreditCardIcon,
    kicker: "Spend that stays with the shop",
    title: "Card issuing",
    body: "Issue cards for the business from inside Adora Pay — supply runs, driver expenses, and the spend the shop already tracks.",
  },
  {
    icon: SmartphoneIcon,
    kicker: "The crew gets paid tonight",
    title: "Venmo/PayPal instant tips",
    body: "Tips land on Venmo or PayPal as soon as the ticket closes, so staff don't wait on the next payroll cycle.",
  },
  {
    icon: LandmarkIcon,
    kicker: "A place for the weekend's take",
    title: "Treasury accounts",
    body: "Hold operating cash next to payouts, so a busy Saturday has an account before the money moves on.",
  },
  {
    icon: BarChart3Icon,
    kicker: "One set of numbers",
    title: "Unified reporting",
    body: "Sales, payouts, tips, and card spend in one report — the same figures the counter and the books already share.",
  },
];

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];
  const Icon = slide.icon;

  useEffect(() => {
    if (paused) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [paused, index]);

  const go = (next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  };

  return (
    <section
      className="relative flex h-full min-h-[32rem] flex-col overflow-hidden bg-shop-fill p-6 text-shop-on-fill sm:p-10"
      aria-roledescription="carousel"
      aria-label="Adora Pay"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-10 size-80 rounded-full bg-shop-accent/35 blur-3xl" />
        <div className="absolute -bottom-28 left-1/4 size-72 rounded-full bg-shop-highlight/40 blur-3xl" />
      </div>
      <div className="relative flex flex-1 items-center pt-14 sm:pt-16">
        <div
          className="relative ml-6 flex max-w-2xl flex-col gap-5 sm:ml-12 sm:pr-72 lg:ml-16 lg:max-w-[50%] lg:pr-8"
          aria-live="polite"
        >
          <span className="flex size-14 items-center justify-center rounded-xl bg-shop-on-fill/15">
            <Icon className="size-9" />
          </span>
          <p className="text-base font-semibold tracking-wide text-shop-on-fill/70">{slide.kicker}</p>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {slide.title}
          </h2>
          <p className="text-xl text-pretty text-shop-on-fill/85">{slide.body}</p>
        </div>
      </div>
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex gap-2" role="tablist" aria-label="Reasons to enroll">
          {SLIDES.map((item, itemIndex) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={itemIndex === index}
              aria-label={item.title}
              onClick={() => go(itemIndex)}
              className={cn(
                "h-2 rounded-full transition-all",
                itemIndex === index ? "w-8 bg-shop-on-fill" : "w-2 bg-shop-on-fill/40",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-base tabular-nums text-shop-on-fill/70">
            {index + 1} / {SLIDES.length}
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              aria-label="Previous reason"
              onClick={() => go(index - 1)}
              className="inline-flex size-12 items-center justify-center rounded-xl border border-shop-on-fill/30 text-shop-on-fill hover:bg-shop-on-fill/10 sm:size-14"
            >
              <ChevronLeftIcon className="size-6 sm:size-7" />
            </button>
            <button
              type="button"
              aria-label="Next reason"
              onClick={() => go(index + 1)}
              className="inline-flex size-12 items-center justify-center rounded-xl border border-shop-on-fill/30 text-shop-on-fill hover:bg-shop-on-fill/10 sm:size-14"
            >
              <ChevronRightIcon className="size-6 sm:size-7" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
