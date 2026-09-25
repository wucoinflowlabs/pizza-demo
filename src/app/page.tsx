import Link from "next/link";
import { ArrowRightIcon, BanknoteIcon, CreditCardIcon, ZapIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { getCurrentAccountId } from "@/lib/session";

const HIGHLIGHTS = [
  {
    icon: CreditCardIcon,
    title: "Every way to pay",
    body: "Cards, Apple Pay, Google Pay, bank transfers and more.",
  },
  {
    icon: ZapIcon,
    title: "Fast payouts",
    body: "Get your money by bank transfer, instant payout or debit card.",
  },
  {
    icon: BanknoteIcon,
    title: "One place for it all",
    body: "Orders, payments and payouts, all managed from The Za.",
  },
];

export default async function Home() {
  const hasApplication = Boolean(await getCurrentAccountId());

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-16 sm:py-24">
      <section className="flex max-w-2xl flex-col gap-6">
        <span className="text-sm font-medium text-primary">{brand.tagline}</span>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Start accepting payments with {brand.name}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">{brand.description}</p>
        {hasApplication ? (
          <Link href="/apply" className={`${buttonVariants({ size: "lg" })} self-start`}>
            Continue your application
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            Already talking with {brand.name}? Open the invite link we sent you to get started.
          </p>
        )}
      </section>
      <section className="grid gap-6 sm:grid-cols-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </span>
            <h2 className="font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
