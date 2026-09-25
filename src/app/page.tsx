import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingIcon,
  ChefHatIcon,
  CreditCardIcon,
  GlobeIcon,
  MapPinnedIcon,
  MonitorSmartphoneIcon,
  StoreIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { getCurrentAccountId } from "@/lib/session";

const PLATFORM = [
  {
    icon: MonitorSmartphoneIcon,
    title: "Point of Sale",
    body: "Browser-based and hardware-agnostic. A POS as dynamic as a Friday-night rush.",
  },
  {
    icon: GlobeIcon,
    title: "Online Ordering",
    body: "Native ordering that acts as its own POS and sends tickets straight to the kitchen.",
  },
  {
    icon: ChefHatIcon,
    title: "Kitchen Display System",
    body: "Prep List, Make Line and Cut & Wrap screens, with production-time reporting.",
  },
  {
    icon: MapPinnedIcon,
    title: "Delivery Management",
    body: "Integrated maps with color-coded order timing, routing and driver regrouping.",
  },
];

const PAYMENTS = [
  {
    icon: CreditCardIcon,
    title: "Every way to pay",
    body: "Cards, Apple Pay, Google Pay and bank transfers — at the counter, online and at the door.",
  },
  {
    icon: ZapIcon,
    title: "Fast payouts",
    body: "Restaurants get paid by bank transfer, instant payout or debit card.",
  },
  {
    icon: BuildingIcon,
    title: "Onboard the whole portfolio",
    body: "Invite existing Adora restaurants, then review and approve them from one console.",
  },
];

const WALKTHROUGH = [
  {
    title: "Adora invites a restaurant",
    body: "Prefill what Adora already knows and send the owner an invite link.",
    href: "/operator/new",
    cta: "Invite a restaurant",
  },
  {
    title: "The owner completes onboarding",
    body: "Business details, identity verification and payout setup in a few minutes.",
    href: "/apply",
    cta: "See merchant onboarding",
  },
  {
    title: "Adora approves and goes live",
    body: "Approve the application and a settlement wallet is set up automatically.",
    href: "/operator",
    cta: "Open the Adora console",
  },
];

const TICKET = [
  { item: "Large Pepperoni", price: "$18.99" },
  { item: "Garlic Knots (8)", price: "$6.49" },
  { item: "2L Soda", price: "$3.29" },
];

export default async function Home() {
  const hasApplication = Boolean(await getCurrentAccountId());

  return (
    <div className="flex flex-col">
      <section className="bg-linear-to-br from-adora-navy to-adora-blue text-white">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-6">
            <span className="self-start rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              {brand.name}
            </span>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              The POS built for pizza. Now with payments built in.
            </h1>
            <p className="text-lg text-pretty text-white/85">
              Adora runs more than 200 million pizzas&apos; worth of orders across POS, online
              ordering, kitchen and delivery. Adora Payments, powered by Coinflow, lets every
              restaurant in the portfolio take payments and get paid out on the same platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/apply"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 bg-white px-5 text-adora-navy hover:bg-white/90",
                )}
              >
                {hasApplication ? "Continue your application" : "See merchant onboarding"}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
              <Link
                href="/operator"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-11 border-white/40 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white",
                )}
              >
                Adora team console
              </Link>
            </div>
          </div>
          <TicketMockup />
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16 sm:py-20">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="text-sm font-semibold text-adora-blue">The Adora platform</span>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-adora-navy">
            Purpose-built for pizzerias. Proven by the pros.
          </h2>
          <p className="text-muted-foreground">
            Trusted by brands like Marco&apos;s Pizza, Mountain Mike&apos;s and Topper&apos;s to run
            every part of the store.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-adora-surface text-adora-navy">
                <Icon className="size-5" />
              </span>
              <h3 className="font-heading font-semibold text-adora-navy">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-adora-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16 sm:py-20">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="self-start rounded-full bg-adora-navy px-3 py-1 text-xs font-semibold text-white">
              New
            </span>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-adora-navy">
              Adora Payments, powered by Coinflow
            </h2>
            <p className="text-muted-foreground">
              A payments layer that lives inside Adora — so restaurants run orders, payments and
              payouts from the system they already know.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {PAYMENTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col gap-2">
                <span className="flex size-10 items-center justify-center rounded-lg bg-white text-adora-blue shadow-sm">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-heading font-semibold text-adora-navy">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16 sm:py-20">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="text-sm font-semibold text-adora-blue">Demo walkthrough</span>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-adora-navy">
            From Adora customer to live on Adora Payments
          </h2>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {WALKTHROUGH.map(({ title, body, href, cta }, i) => (
            <li key={title} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-adora-navy text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="font-heading font-semibold text-adora-navy">{title}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{body}</p>
              <Link
                href={href}
                className="inline-flex items-center gap-1 text-sm font-semibold text-adora-blue hover:underline"
              >
                {cta}
                <ArrowRightIcon className="size-4" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function TicketMockup() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-5 text-foreground shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b pb-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-adora-navy">
          <StoreIcon className="size-4" />
          Tony&apos;s Brick Oven
        </span>
        <span className="rounded-full bg-adora-surface px-2 py-0.5 text-xs font-medium text-adora-navy">
          Order #1042
        </span>
      </div>
      <ul className="flex flex-col gap-2 py-4 text-sm">
        {TICKET.map(({ item, price }) => (
          <li key={item} className="flex justify-between">
            <span>{item}</span>
            <span className="tabular-nums text-muted-foreground">{price}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t pt-3 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">$28.77</span>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-emerald-700">
          <CreditCardIcon className="size-4" />
          Paid · Visa •••• 4242
        </span>
        <span className="text-xs text-emerald-700/80">Adora Payments</span>
      </div>
    </div>
  );
}
