"use client";

import { useEffect, useState, useTransition, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleXIcon,
  ClockIcon,
  CopyIcon,
  CreditCardIcon,
  KeyRoundIcon,
  LandmarkIcon,
  Loader2Icon,
  ReceiptTextIcon,
  ScrollTextIcon,
  SendIcon,
  ShieldBanIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  WalletIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { realPayoutStatusAction } from "../real-payout-actions";
import { setWithdrawerAvailabilityAction } from "../withdrawer-actions";
import type { RealPayoutStatus } from "@/lib/payments/real-payout";
import { SendPayoutDialog } from "./send-payout-dialog";
import type { PayoutMethodGroup, WithdrawerProfile, WithdrawerRow, WithdrawRow } from "../withdrawals";
import { CopyableId, shortId, useCopy } from "./payment-pills";
import { POPUP } from "./table-controls";
import {
  BlockedPill,
  CopyText,
  VerificationPill,
  WithdrawStatusPill,
  compactDate,
  money,
} from "./withdrawal-pills";

const ICON_BUTTON =
  "rounded-md p-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30";

type Tab = "overview" | "activity" | "methods" | "verification" | "audit";

function withdrawsHref(wallet: string) {
  return `/dashboard/adora-pay/withdraws?search=${encodeURIComponent(wallet)}`;
}

function SectionCard({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      <div className="flex flex-col divide-y divide-foreground/5 overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
        {children}
      </div>
    </section>
  );
}

function KvRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-foreground">{children}</span>
    </div>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-muted-foreground">{children}</p>;
}

function ActivityRow({ payout, timeZone }: { payout: WithdrawRow; timeZone: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <WithdrawStatusPill status={payout.status} returnStatus={payout.returnStatus} />
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-foreground" title={payout.id}>
            {shortId(payout.id)}
          </p>
          <p className="text-xs text-muted-foreground">{compactDate(payout.createdAt, timeZone)}</p>
        </div>
      </div>
      <span className="shrink-0 font-medium text-foreground tabular-nums">
        −{money(payout.amountCents, payout.currency)}
      </span>
    </div>
  );
}

const METHOD_ICONS: Record<PayoutMethodGroup["kind"], LucideIcon> = {
  card: CreditCardIcon,
  bank: LandmarkIcon,
  iban: LandmarkIcon,
  pix: LandmarkIcon,
  venmo: WalletIcon,
  paypal: WalletIcon,
  interac: WalletIcon,
};

function MethodIcon({ kind }: { kind: PayoutMethodGroup["kind"] | "key" }) {
  if (kind === "venmo" || kind === "paypal") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-base font-black italic ring-1 ring-sky-600/15">
        <span className={kind === "venmo" ? "text-[#008CFF]" : "text-[#003087]"}>{kind === "venmo" ? "V" : "P"}</span>
      </span>
    );
  }
  const Icon = kind === "key" ? KeyRoundIcon : METHOD_ICONS[kind];
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
      <Icon className="size-4" />
    </span>
  );
}

function MethodRow({
  kind,
  title,
  subtitle,
  copyValue,
  onSend,
}: {
  kind: PayoutMethodGroup["kind"] | "key";
  title: string;
  subtitle: string;
  copyValue: string;
  /** Set when a real demo payout is available for this row. */
  onSend?: () => void;
}) {
  const { copied, copy } = useCopy();
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <MethodIcon kind={kind} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span className="flex items-center gap-0.5">
        {onSend && (
          <button
            type="button"
            onClick={onSend}
            aria-label="Send payout"
            title="Send a real Venmo payout"
            className={ICON_BUTTON}
          >
            <SendIcon className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => copy(copyValue)}
          aria-label={`Copy ${kind === "key" ? "reference ID" : "method token"}`}
          className={ICON_BUTTON}
        >
          {copied ? <BadgeCheckIcon className="size-4 text-emerald-600" /> : <CopyIcon className="size-4" />}
        </button>
      </span>
    </div>
  );
}

function OverviewTab({
  row,
  profile,
  timeZone,
  showMerchant,
  onTab,
}: {
  row: WithdrawerRow;
  profile: WithdrawerProfile;
  timeZone: string;
  showMerchant: boolean;
  onTab: (tab: Tab) => void;
}) {
  const activity = profile.payouts.length + profile.paymentsCount;
  const methods = profile.methodGroups.flatMap((group) =>
    group.methods.map((method) => ({ ...method, kind: group.kind })),
  );
  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Recent activity"
        action={
          activity > 0 && (
            <button type="button" onClick={() => onTab("activity")} className="text-xs font-medium text-shop-accent">
              See all ({activity})
            </button>
          )
        }
      >
        {profile.payouts.length === 0 ? (
          <EmptyRow>No payouts yet.</EmptyRow>
        ) : (
          profile.payouts.slice(0, 4).map((payout) => <ActivityRow key={payout.id} payout={payout} timeZone={timeZone} />)
        )}
      </SectionCard>
      <SectionCard
        title="Payment methods"
        action={
          <button type="button" onClick={() => onTab("methods")} className="text-xs font-medium text-shop-accent">
            Manage ({profile.methodCount})
          </button>
        }
      >
        {methods.length === 0 ? (
          <EmptyRow>No payout methods linked.</EmptyRow>
        ) : (
          methods
            .slice(0, 3)
            .map((method) => (
              <MethodRow
                key={method.key}
                kind={method.kind}
                title={method.title}
                subtitle={method.subtitle}
                copyValue={method.token}
              />
            ))
        )}
      </SectionCard>
      <SectionCard title="Identifiers">
        <KvRow label={row.isUser ? "User ID" : "Wallet"}>
          <CopyText value={row.wallet} label="withdrawer ID" mono />
        </KvRow>
        <KvRow label="Type">{row.isUser ? "Merchant-registered user" : "Blockchain wallet"}</KvRow>
        {showMerchant && <KvRow label="Merchant">{row.merchantId ?? "—"}</KvRow>}
        <KvRow label="Email">
          <CopyText value={row.email} label="email" />
        </KvRow>
        <KvRow label="Currency">{row.currency}</KvRow>
        {row.country && <KvRow label="Country">{row.country}</KvRow>}
        <KvRow label="Created">{compactDate(row.createdAt, timeZone)}</KvRow>
      </SectionCard>
    </div>
  );
}

function ActivityTab({ row, profile, timeZone }: { row: WithdrawerRow; profile: WithdrawerProfile; timeZone: string }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title={`Payouts (${profile.payouts.length})`}
        action={
          profile.payouts.length > 0 && (
            <Link href={withdrawsHref(row.wallet)} className="text-xs font-medium text-shop-accent">
              View all
            </Link>
          )
        }
      >
        {profile.payouts.length === 0 ? (
          <EmptyRow>No payouts yet.</EmptyRow>
        ) : (
          profile.payouts.map((payout) => <ActivityRow key={payout.id} payout={payout} timeZone={timeZone} />)
        )}
      </SectionCard>
      <SectionCard title={`Payments (${profile.paymentsCount})`}>
        <EmptyRow>
          {profile.paymentsCount === 0
            ? "No payments from this withdrawer."
            : "Payments from this withdrawer appear on the Payments page."}
        </EmptyRow>
      </SectionCard>
    </div>
  );
}

function MethodsTab({
  profile,
  onSendPayout,
}: {
  profile: WithdrawerProfile;
  /** Set when the viewer may fire a real Venmo payout for this withdrawer. */
  onSendPayout?: (method: { title: string; subtitle: string }) => void;
}) {
  if (profile.methodCount === 0) {
    return (
      <SectionCard title="Methods">
        <EmptyRow>No payout methods linked.</EmptyRow>
      </SectionCard>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {profile.methodGroups.map((group) => (
        <SectionCard key={group.kind} title={`${group.title}${group.methods.length > 1 ? ` (${group.methods.length})` : ""}`}>
          {group.methods.map((method) => (
            <MethodRow
              key={method.key}
              kind={group.kind}
              title={method.title}
              subtitle={method.subtitle}
              copyValue={method.token}
              onSend={group.kind === "venmo" && onSendPayout ? () => onSendPayout({ title: method.title, subtitle: method.subtitle }) : undefined}
            />
          ))}
        </SectionCard>
      ))}
      {profile.referenceKeys.length > 0 && (
        <SectionCard title={`Reference keys (${profile.referenceKeys.length})`}>
          {profile.referenceKeys.map((key) => (
            <MethodRow
              key={`${key.merchantId}:${key.referenceId}`}
              kind="key"
              title={key.merchantId}
              subtitle={key.referenceId}
              copyValue={key.referenceId}
            />
          ))}
        </SectionCard>
      )}
    </div>
  );
}

function KycRow({ status }: { status?: WithdrawerRow["verification"]["status"] }) {
  const approved = status === "approved" || status === "partial-approval";
  const rejected = status === "rejected";
  const Icon = approved ? BadgeCheckIcon : rejected ? CircleXIcon : status ? ClockIcon : UserRoundIcon;
  const title = approved ? "KYC verified" : rejected ? "KYC rejected" : status ? "KYC pending" : "Unverified withdrawer";
  const body = approved
    ? "Identity verified. This withdrawer can receive payouts."
    : rejected
      ? "Identity verification failed. Payouts are disabled."
      : status
        ? "Verification is in progress. Payouts unlock once it's approved."
        : "This withdrawer hasn't started identity verification.";
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          approved ? "bg-emerald-50 text-emerald-600" : rejected ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function VerificationTab({ row }: { row: WithdrawerRow }) {
  const { verification } = row;
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="KYC">
        <KycRow status={verification.status} />
      </SectionCard>
      <SectionCard title="Verification details">
        <KvRow label="Status">
          <VerificationPill status={verification.status} reasons={verification.rejectionReasons} />
        </KvRow>
        <KvRow label="Reference">
          <CopyText value={verification.reference} label="verification reference" mono />
        </KvRow>
        <KvRow label="Vendor">{verification.vendor ? verification.vendor.replace(/_/g, " ") : "—"}</KvRow>
        {verification.rejectionReasons.length > 0 && (
          <KvRow label="Rejection reasons">{verification.rejectionReasons.join(", ")}</KvRow>
        )}
      </SectionCard>
      <SectionCard title="Account status">
        <KvRow label="Availability">
          <BlockedPill blocked={row.blocked} override={row.override} reason={row.blockReason} />
        </KvRow>
        {row.blockReason && <KvRow label="Reason">{row.blockReason}</KvRow>}
      </SectionCard>
    </div>
  );
}

function AuditTab({ profile, timeZone }: { profile: WithdrawerProfile; timeZone: string }) {
  return (
    <SectionCard title={`Audit log (${profile.auditLog.length})`}>
      {profile.auditLog.length === 0 ? (
        <EmptyRow>No changes have been recorded.</EmptyRow>
      ) : (
        profile.auditLog.map((entry, index) => (
          <div key={`${entry.createdAt}-${index}`} className="flex flex-col gap-2 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{entry.editor}</p>
                <p className="text-xs text-muted-foreground">
                  {[entry.editorType, entry.ip].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {compactDate(entry.createdAt, timeZone)}
              </span>
            </div>
            {entry.changes.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg bg-muted/60 p-2.5 font-mono text-[11px]">
                {entry.changes.map((change, changeIndex) => (
                  <li key={`${change.path}-${changeIndex}`} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground">{change.path}</span>
                    {change.before !== undefined && <span className="text-red-700 line-through">{change.before}</span>}
                    <ArrowRightIcon className="size-3 text-muted-foreground" />
                    <span className="text-emerald-700">{change.after ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </SectionCard>
  );
}

function BlockDialog({
  row,
  open,
  onOpenChange,
  container,
  onSaved,
}: {
  row: WithdrawerRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: RefObject<HTMLElement | null>;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const nextStatus = row.blocked ? "Functional" : "Blocked";

  const save = () =>
    startTransition(async () => {
      const result = await setWithdrawerAvailabilityAction({ withdrawerId: row.id, status: nextStatus, reason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(row.blocked ? "Withdrawer unblocked" : "Withdrawer blocked");
      setReason("");
      onOpenChange(false);
      onSaved();
    });

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Backdrop className="fixed inset-0 z-[60] bg-black/20 data-open:animate-in data-open:fade-in-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl bg-background p-6 text-sm shadow-2xl ring-1 ring-foreground/10 outline-none">
          <AlertDialog.Title className="font-heading text-lg font-semibold text-shop-ink">
            {row.blocked ? "Unblock withdrawer" : "Block withdrawer"}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-muted-foreground">
            {row.blocked
              ? `${row.email ?? row.wallet} will be able to receive payouts again.`
              : `${row.email ?? row.wallet} won't be able to receive payouts until unblocked.`}
          </AlertDialog.Description>
          <label className="flex flex-col gap-1.5 font-medium">
            Reason
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={row.blocked ? "Why is this withdrawer being unblocked?" : "Why is this withdrawer being blocked?"}
              rows={3}
            />
          </label>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close render={<Button type="button" variant="outline" />}>Cancel</AlertDialog.Close>
            <Button
              type="button"
              variant={row.blocked ? "default" : "destructive"}
              disabled={pending || !reason.trim()}
              onClick={save}
            >
              {pending && <Loader2Icon className="animate-spin" />}
              {row.blocked ? "Unblock" : "Block"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function ManageMenu({ row, onBlock }: { row: WithdrawerRow; onBlock: () => void }) {
  const { copy } = useCopy();
  const item = "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none data-highlighted:bg-muted";
  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none">
        Manage
        <ChevronDownIcon className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="end" className="z-[55]">
          <Menu.Popup className={cn(POPUP, "min-w-52 p-1")}>
            <Menu.Item onClick={onBlock} className={item}>
              {row.blocked ? <ShieldCheckIcon className="size-3.5" /> : <ShieldBanIcon className="size-3.5" />}
              {row.blocked ? "Unblock withdrawer" : "Block withdrawer"}
            </Menu.Item>
            <Menu.Item onClick={() => copy(row.wallet)} className={item}>
              <CopyIcon className="size-3.5" />
              Copy user ID
            </Menu.Item>
            <Menu.Item render={<Link href={withdrawsHref(row.wallet)} />} className={item}>
              <ReceiptTextIcon className="size-3.5" />
              View withdrawals
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function LoadingBody() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function without<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

export function WithdrawerDrawer({
  withdrawer,
  timeZone,
  showMerchant = false,
  container,
  onClose,
  onPrevious,
  onNext,
}: {
  withdrawer: WithdrawerRow | null;
  timeZone: string;
  showMerchant?: boolean;
  container: RefObject<HTMLElement | null>;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const [profiles, setProfiles] = useState<Record<string, WithdrawerProfile>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("overview");
  const [blocking, setBlocking] = useState(false);
  const [realPayout, setRealPayout] = useState<RealPayoutStatus | null>(null);
  const [pendingPayout, setPendingPayout] = useState<{ title: string; subtitle: string } | null>(null);
  const router = useRouter();

  // Fetch the real-payout status once per drawer open. Cached across renders.
  useEffect(() => {
    if (realPayout) return;
    let active = true;
    realPayoutStatusAction().then((status) => {
      if (active) setRealPayout(status);
    });
    return () => {
      active = false;
    };
  }, [realPayout]);

  const id = withdrawer?.id;
  const profile = id ? profiles[id] : undefined;
  const error = id ? errors[id] : undefined;
  const needsFetch = !!id && !profile && !error;

  useEffect(() => {
    if (!id || !needsFetch) return;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/withdrawers/${encodeURIComponent(id)}`, { signal: controller.signal });
        const body = await response.json();
        if (response.ok) setProfiles((current) => ({ ...current, [id]: body as WithdrawerProfile }));
        else setErrors((current) => ({ ...current, [id]: body.error ?? "This withdrawer couldn't be loaded." }));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[withdrawers] profile failed", err);
        setErrors((current) => ({ ...current, [id]: "This withdrawer couldn't be loaded." }));
      }
    })();
    return () => controller.abort();
  }, [id, needsFetch]);

  const forget = (key: string) => {
    setProfiles((current) => without(current, key));
    setErrors((current) => without(current, key));
  };

  const activityCount = profile ? profile.payouts.length + profile.paymentsCount : undefined;
  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "activity", label: activityCount === undefined ? "Activity" : `Activity (${activityCount})` },
    { value: "methods", label: profile ? `Methods (${profile.methodCount})` : "Methods" },
    { value: "verification", label: "Verification" },
    { value: "audit", label: "Audit Log" },
  ];

  return (
    <>
      <Dialog.Root
        open={withdrawer !== null}
        onOpenChange={(open) => !open && onClose()}
        modal={false}
        disablePointerDismissal
      >
        <Dialog.Portal container={container}>
          <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto bg-background/95 text-sm shadow-2xl ring-1 ring-foreground/10 backdrop-blur-xl outline-none sm:max-w-[34rem] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
            {withdrawer && (
              <>
                <header className="sticky top-0 z-10 flex flex-col gap-3 bg-background/95 px-5 pt-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <ScrollTextIcon className="size-3.5" />
                      Withdrawer
                      <span aria-hidden>·</span>
                      <CopyableId value={withdrawer.wallet} label="withdrawer ID" />
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={onPrevious} disabled={!onPrevious} aria-label="Previous withdrawer" className={ICON_BUTTON}>
                        <ChevronLeftIcon className="size-4" />
                      </button>
                      <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next withdrawer" className={ICON_BUTTON}>
                        <ChevronRightIcon className="size-4" />
                      </button>
                      <Dialog.Close aria-label="Close" className={ICON_BUTTON}>
                        <XIcon className="size-4" />
                      </Dialog.Close>
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-2">
                      <Dialog.Title className="flex min-w-0 flex-col gap-0.5 font-heading text-shop-ink">
                        <span className="flex min-w-0 items-center gap-2 text-xl font-semibold">
                          <UserRoundIcon className="size-5 shrink-0 fill-current" />
                          <span className="truncate">{withdrawer.name ?? withdrawer.email ?? withdrawer.wallet}</span>
                        </span>
                        {withdrawer.name && withdrawer.email && (
                          <span className="truncate pl-7 text-xs font-normal text-muted-foreground">{withdrawer.email}</span>
                        )}
                      </Dialog.Title>
                      <span className="flex items-center gap-2">
                        <BlockedPill blocked={withdrawer.blocked} override={withdrawer.override} reason={withdrawer.blockReason} />
                        <VerificationPill
                          status={withdrawer.verification.status}
                          reasons={withdrawer.verification.rejectionReasons}
                        />
                      </span>
                    </div>
                    <ManageMenu row={withdrawer} onBlock={() => setBlocking(true)} />
                  </div>
                  <Tabs.Root value={tab} onValueChange={(value) => setTab(value as Tab)}>
                    <Tabs.List className="relative -mx-5 flex gap-1 overflow-x-auto border-b border-foreground/10 px-4">
                      {tabs.map((item) => (
                        <Tabs.Tab
                          key={item.value}
                          value={item.value}
                          className="shrink-0 px-2.5 py-2.5 text-sm whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground data-active:font-medium data-active:text-shop-ink"
                        >
                          {item.label}
                        </Tabs.Tab>
                      ))}
                      <Tabs.Indicator className="absolute bottom-0 left-[var(--active-tab-left)] h-0.5 w-[var(--active-tab-width)] rounded-full bg-shop-accent transition-all duration-200" />
                    </Tabs.List>
                  </Tabs.Root>
                </header>
                <div className="flex-1 px-5 pt-5 pb-8">
                  {error ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                      <ScrollTextIcon className="size-6" />
                      {error}
                      <Button type="button" variant="outline" size="sm" onClick={() => forget(withdrawer.id)}>
                        Try again
                      </Button>
                    </div>
                  ) : tab === "verification" ? (
                    <VerificationTab row={withdrawer} />
                  ) : !profile ? (
                    <LoadingBody />
                  ) : tab === "overview" ? (
                    <OverviewTab row={withdrawer} profile={profile} timeZone={timeZone} showMerchant={showMerchant} onTab={setTab} />
                  ) : tab === "activity" ? (
                    <ActivityTab row={withdrawer} profile={profile} timeZone={timeZone} />
                  ) : tab === "methods" ? (
                    <MethodsTab
                      profile={profile}
                      onSendPayout={
                        realPayout?.enabled && withdrawer.wallet === realPayout.userId
                          ? (method) => setPendingPayout(method)
                          : undefined
                      }
                    />
                  ) : (
                    <AuditTab profile={profile} timeZone={timeZone} />
                  )}
                </div>
                <BlockDialog
                  row={withdrawer}
                  open={blocking}
                  onOpenChange={setBlocking}
                  container={container}
                  onSaved={() => {
                    forget(withdrawer.id);
                    router.refresh();
                  }}
                />
                {realPayout?.enabled && (
                  <SendPayoutDialog
                    open={pendingPayout !== null}
                    onOpenChange={(open) => !open && setPendingPayout(null)}
                    container={container}
                    method={pendingPayout ?? { title: "", subtitle: "" }}
                    sandboxUserId={realPayout.userId}
                    onSent={() => router.refresh()}
                  />
                )}
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <Toaster theme="light" position="bottom-right" />
    </>
  );
}
