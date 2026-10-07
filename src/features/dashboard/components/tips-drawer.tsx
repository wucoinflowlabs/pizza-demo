"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import {
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  ReceiptIcon,
  SendIcon,
  SparklesIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { cashOutTipsAction } from "../tips/cash-out-action";
import type { SettledTip } from "../tips/queries";
import type { WithdrawerRow } from "../withdrawals";
import { compactDate, money } from "./withdrawal-pills";

const ICON_BUTTON =
  "rounded-md p-1.5 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30";

type TipData = {
  staff?: { id: string; name: string; cfUserId: string; venmo?: { token: string; display: string } };
  summary: { todayCents: number; unpaidCents: number; lastPayout?: { atIso: string; cents: number } };
  recent: SettledTip[];
  timeZone: string;
};

export function TipsDrawer({
  withdrawer,
  locationId,
  container,
  onClose,
}: {
  withdrawer: WithdrawerRow | null;
  locationId?: string;
  container: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const [data, setData] = useState<Record<string, TipData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const key = withdrawer ? `${locationId ?? ""}:${withdrawer.wallet}` : undefined;
  const payload = key ? data[key] : undefined;
  const error = key ? errors[key] : undefined;
  const needsFetch = !!key && !payload && !error;

  useEffect(() => {
    if (!key || !needsFetch) return;
    const controller = new AbortController();
    (async () => {
      try {
        const search = locationId ? `?${new URLSearchParams({ location: locationId }).toString()}` : "";
        const response = await fetch(`/api/tips/${encodeURIComponent(withdrawer!.wallet)}${search}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (response.ok) setData((current) => ({ ...current, [key]: body as TipData }));
        else setErrors((current) => ({ ...current, [key]: body.error ?? "Tips couldn't be loaded." }));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[tips-drawer] load failed", err);
        setErrors((current) => ({ ...current, [key]: "Tips couldn't be loaded." }));
      }
    })();
    return () => controller.abort();
  }, [key, locationId, needsFetch, withdrawer]);

  const cashOut = () => {
    if (!payload?.staff) return;
    startTransition(async () => {
      const result = await cashOutTipsAction({ staffId: payload.staff!.id, locationId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Cashed out ${money(result.cents)} to ${payload.staff?.venmo?.display ?? "Venmo"}`);
      setData((current) => {
        const next = { ...current };
        delete next[key!];
        return next;
      });
      router.refresh();
    });
  };

  const canCashOut = (payload?.summary.unpaidCents ?? 0) > 0 && Boolean(payload?.staff?.venmo?.token);
  const displayName = withdrawer?.name ?? payload?.staff?.name ?? withdrawer?.email ?? withdrawer?.wallet ?? "Staff";
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const accent = useMemo(() => accentFor(displayName), [displayName]);

  return (
    <>
      <Dialog.Root
        open={withdrawer !== null}
        onOpenChange={(open) => !open && onClose()}
        modal={false}
        disablePointerDismissal
      >
        <Dialog.Portal container={container}>
          <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto bg-background text-sm shadow-2xl ring-1 ring-foreground/10 outline-none sm:max-w-[36rem] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
            {withdrawer && (
              <>
                <header
                  className="relative overflow-hidden px-6 pb-6 pt-5"
                  style={{
                    background: `linear-gradient(135deg, ${accent.bg} 0%, var(--background) 65%)`,
                  }}
                >
                  <div className="absolute top-3 right-4 flex items-center gap-1">
                    <Dialog.Close aria-label="Close" className={cn(ICON_BUTTON, "bg-background/70 ring-1 ring-foreground/10 backdrop-blur-sm")}>
                      <XIcon className="size-4" />
                    </Dialog.Close>
                  </div>
                  <div className="flex items-start gap-4">
                    <span
                      className="flex size-14 shrink-0 items-center justify-center rounded-2xl font-heading text-lg font-semibold text-white shadow-[0_8px_20px_-10px_rgba(13,61,133,0.6)]"
                      style={{ background: accent.ring }}
                      aria-hidden
                    >
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <Dialog.Title className="truncate font-heading text-2xl font-semibold text-shop-ink">
                        {displayName}
                      </Dialog.Title>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {payload?.staff?.venmo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-600/20 ring-inset backdrop-blur-sm">
                            <span className="text-[13px] leading-none font-black text-[#008CFF] italic">V</span>
                            {payload.staff.venmo.display}
                          </span>
                        ) : withdrawer.email ? (
                          <span className="truncate text-xs text-muted-foreground">{withdrawer.email}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {payload?.summary.lastPayout
                        ? `Last cash out · ${money(payload.summary.lastPayout.cents)} on ${compactDate(
                            payload.summary.lastPayout.atIso,
                            payload.timeZone,
                          )}`
                        : "No cash-outs yet"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canCashOut || pending}
                      onClick={cashOut}
                      className={cn(
                        "gap-1.5 rounded-full px-4 shadow-sm transition-all",
                        canCashOut
                          ? "bg-shop-ink text-background hover:-translate-y-0.5 hover:bg-shop-ink/90"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {pending ? (
                        <Loader2Icon className="animate-spin" />
                      ) : canCashOut ? (
                        <SendIcon />
                      ) : (
                        <CheckCircle2Icon />
                      )}
                      {canCashOut ? `Cash out ${money(payload!.summary.unpaidCents)}` : "No tips to cash out"}
                    </Button>
                  </div>
                </header>

                <div className="flex flex-1 flex-col gap-6 border-t border-foreground/5 bg-shop-surface/40 px-6 py-6">
                  {error ? (
                    <Empty icon={WalletIcon}>{error}</Empty>
                  ) : !payload ? (
                    <LoadingBody />
                  ) : (
                    <>
                      <section className="grid gap-3 sm:grid-cols-2">
                        <Stat label="Today" icon={ClockIcon} cents={payload.summary.todayCents} />
                        <Stat
                          label="Unpaid balance"
                          icon={SparklesIcon}
                          cents={payload.summary.unpaidCents}
                          emphasis
                        />
                      </section>

                      <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 px-1">
                          <h3 className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                            Recent tipped orders
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {payload.recent.length} {payload.recent.length === 1 ? "order" : "orders"}
                          </span>
                        </div>
                        <div className="flex flex-col divide-y divide-foreground/5 overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10">
                          {payload.recent.length === 0 ? (
                            <Empty icon={ReceiptIcon}>No tipped orders yet.</Empty>
                          ) : (
                            payload.recent.map((tip) => (
                              <OrderRow key={tip.paymentId} tip={tip} timeZone={payload.timeZone} />
                            ))
                          )}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <Toaster theme="light" position="bottom-right" />
    </>
  );
}

function Stat({
  label,
  icon: Icon,
  cents,
  emphasis,
}: {
  label: string;
  icon: typeof WalletIcon;
  cents: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl p-4 ring-1 ring-foreground/10 transition-colors",
        emphasis
          ? "bg-gradient-to-br from-shop-ink to-shop-ink/85 text-background shadow-[0_10px_24px_-18px_rgba(13,61,133,0.9)]"
          : "bg-background",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase",
          emphasis ? "text-background/80" : "text-muted-foreground",
        )}
      >
        <Icon className="size-3" />
        {label}
      </span>
      <span className="font-heading text-[26px] leading-none font-semibold tabular-nums">
        {money(cents)}
      </span>
    </div>
  );
}

function OrderRow({ tip, timeZone }: { tip: SettledTip; timeZone: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-foreground/60 ring-1 ring-foreground/5">
        <ReceiptIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">Ticket #{tip.orderTicket}</p>
        <p className="text-xs text-muted-foreground">
          Order total {money(tip.totalCents)} · {compactDate(tip.settledAt, timeZone)}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset tabular-nums">
        +{money(tip.tipCents)}
      </span>
    </div>
  );
}

function Empty({ icon: Icon, children }: { icon: typeof WalletIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
      <Icon className="size-5" />
      {children}
    </div>
  );
}

function LoadingBody() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </>
  );
}

function getInitials(name: string): string {
  const words = name.match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length === 0) return name.slice(0, 2).toUpperCase() || "·";
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

// A stable "pretty gradient" per staff — same input, same colors.
function accentFor(seed: string): { bg: string; ring: string } {
  const palette = [
    { bg: "#E8F0FF", ring: "#4F6DF5" },
    { bg: "#FBECFF", ring: "#A64CDE" },
    { bg: "#E5F7F1", ring: "#19A974" },
    { bg: "#FFF1E6", ring: "#F08030" },
    { bg: "#FFF4D9", ring: "#D4A017" },
    { bg: "#FFE9EE", ring: "#E04F6D" },
  ];
  let hash = 0;
  for (let index = 0; index < seed.length; index++) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return palette[hash % palette.length];
}
