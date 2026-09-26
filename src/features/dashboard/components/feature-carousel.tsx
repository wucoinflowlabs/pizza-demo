"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  StoreIcon,
  TimerIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

const SLIDES: { icon: LucideIcon; kicker: string; title: string; body: string }[] = [
  {
    icon: CreditCardIcon,
    kicker: "Online ordering",
    title: "More tickets make it to the oven",
    body: "A card that fails at checkout is a pie that never gets made. Adora Pay routes and retries the charge so a Friday-night order lands in the kitchen.",
  },
  {
    icon: SmartphoneIcon,
    kicker: "Counter, web, and the door",
    title: "Guests pay the way they already pay",
    body: "Credit, debit, Apple Pay, Google Pay, and bank transfer on the ticket this shop already rings up — in the store, on the online order, and at delivery.",
  },
  {
    icon: ZapIcon,
    kicker: "After the drawer closes",
    title: "Friday's money moves with the shop",
    body: "Bank payout, instant payout, or push to a debit card once the ticket is paid. A busy weekend can reach the account the same night.",
  },
  {
    icon: TimerIcon,
    kicker: "The dinner rush",
    title: "A packed Saturday stays open for business",
    body: "Game day and holiday volume are the business. Adora Pay carries that spike, so the rush settles without a rolling reserve or an account hold.",
  },
  {
    icon: ShieldCheckIcon,
    kicker: "Delivery disputes",
    title: "A missing-pizza claim stays a claim",
    body: "Chargeback protection is included. Delivery and pickup disputes stay off the make line, and the counter keeps moving.",
  },
  {
    icon: StoreIcon,
    kicker: "Already on Adora",
    title: "Enrolling is super easy",
    body: "No new system to learn. Adora Pay turns on inside the POS, online ordering, kitchen, and delivery this restaurant already runs — one short enrollment, and tonight’s rush stays on the same screens.",
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
    }, 8000);
    return () => window.clearInterval(timer);
  }, [paused, index]);

  const go = (next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  };

  return (
    <section
      className="flex h-full min-h-[32rem] flex-col justify-between bg-linear-to-br from-adora-navy to-adora-blue p-6 text-white sm:p-10"
      aria-roledescription="carousel"
      aria-label="Why enroll in Adora Pay"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <p className="text-sm font-semibold tracking-wide text-white/80 uppercase">
        Why pizzerias enroll in Adora Pay
      </p>
      <div
        className="flex max-w-xl flex-col gap-4 pr-48 sm:pr-56 md:pr-64 xl:pr-0"
        aria-live="polite"
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-white/15">
          <Icon className="size-8" />
        </span>
        <p className="text-sm font-semibold tracking-wide text-white/70">{slide.kicker}</p>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {slide.title}
        </h2>
        <p className="text-lg text-pretty text-white/85">{slide.body}</p>
      </div>
      <div className="flex items-center justify-between gap-4">
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
                itemIndex === index ? "w-8 bg-white" : "w-2 bg-white/40",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm tabular-nums text-white/70">
            {index + 1} / {SLIDES.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous reason"
              onClick={() => go(index - 1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-white/30 text-white hover:bg-white/10"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next reason"
              onClick={() => go(index + 1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-white/30 text-white hover:bg-white/10"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
