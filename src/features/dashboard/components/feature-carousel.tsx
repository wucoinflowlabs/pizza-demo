"use client";

import { useState } from "react";
import {
  BuildingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "cn";

const SLIDES = [
  {
    icon: CreditCardIcon,
    title: "Every card, at the counter",
    body: "Credit and debit cards stay inside the POS ticket, with the same menu and the same drawer close.",
  },
  {
    icon: SmartphoneIcon,
    title: "Wallets and bank pay",
    body: "Apple Pay, Google Pay, and bank transfer for in-store, online ordering, and the door.",
  },
  {
    icon: ZapIcon,
    title: "Payouts on the restaurant's clock",
    body: "Standard bank payout, instant payout, or push to a debit card once the ticket is paid.",
  },
  {
    icon: BuildingIcon,
    title: "One parent, every shop",
    body: "Each location is its own account under Adora, so a chain can onboard without a new processor.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Verification that keeps moving",
    body: "Business and owner checks, then a live status trail as the application moves through review.",
  },
];

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <div className="flex h-full min-h-[28rem] flex-col justify-between bg-linear-to-br from-adora-navy to-adora-blue p-6 text-white sm:p-10">
      <p className="text-sm font-semibold tracking-wide text-white/80 uppercase">
        Adora Pay, powered by Coinflow
      </p>
      <div className="flex max-w-xl flex-col gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-white/15">
          <Icon className="size-6" />
        </span>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {slide.title}
        </h2>
        <p className="text-lg text-pretty text-white/85">{slide.body}</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2" role="tablist" aria-label="Adora Pay features">
          {SLIDES.map((item, itemIndex) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={itemIndex === index}
              aria-label={item.title}
              onClick={() => setIndex(itemIndex)}
              className={cn(
                "h-2 rounded-full transition-all",
                itemIndex === index ? "w-8 bg-white" : "w-2 bg-white/40",
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIndex((current) => (current - 1 + SLIDES.length) % SLIDES.length)}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-white/30 text-white hover:bg-white/10"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIndex((current) => (current + 1) % SLIDES.length)}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-white/30 text-white hover:bg-white/10"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
