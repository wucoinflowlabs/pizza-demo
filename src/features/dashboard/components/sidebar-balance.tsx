import Link from "next/link";
import { ArrowLeftRightIcon } from "lucide-react";
import { loadAccountBalance } from "../load-balance";

const CARD =
  "flex items-center gap-3 rounded-2xl bg-white py-3 pr-3 pl-4 shadow-[0_16px_40px_-28px_var(--shop-ink)] ring-1 ring-shop-ink/10";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function BalanceCard({ amount, label, title }: { amount: string; label: string; title?: string }) {
  return (
    <div className={CARD} title={title}>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-lg font-semibold text-shop-ink tabular-nums">
          {amount}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
      <span aria-hidden className="h-9 w-px shrink-0 bg-shop-ink/10" />
      <Link
        href="/dashboard/adora-pay/withdraws"
        aria-label="View withdrawals"
        title="View withdrawals"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-shop-fill text-shop-on-fill transition-colors hover:bg-shop-fill/90 focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <ArrowLeftRightIcon className="size-4" />
      </Link>
    </div>
  );
}

export function SidebarBalanceSkeleton() {
  return (
    <div className={CARD} aria-busy aria-label="Loading balance">
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="h-5 w-24 animate-pulse rounded bg-shop-ink/10" />
        <span className="h-3 w-20 animate-pulse rounded bg-shop-ink/5" />
      </span>
      <span aria-hidden className="h-9 w-px shrink-0 bg-shop-ink/10" />
      <span className="size-10 shrink-0 animate-pulse rounded-xl bg-shop-ink/10" />
    </div>
  );
}

/** The account's payout balance from Coinflow; a franchise sees all its locations added up. */
export async function SidebarBalance({ franchise }: { franchise?: boolean }) {
  const balance = await loadAccountBalance();
  if (!balance) return null;

  const { cents, accounts, missing } = balance;
  const label = franchise
    ? `Balance · ${accounts} ${accounts === 1 ? "location" : "locations"}`
    : "Account balance";
  return (
    <BalanceCard
      amount={money(cents)}
      label={label}
      title={
        missing
          ? `${missing} of ${accounts} locations couldn't be loaded and aren't included`
          : undefined
      }
    />
  );
}
