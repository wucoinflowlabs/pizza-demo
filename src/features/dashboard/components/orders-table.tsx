"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import {
  ActivityIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CoinsIcon,
  CopyIcon,
  CreditCardIcon,
  EllipsisIcon,
  FunnelIcon,
  LandmarkIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShieldXIcon,
  Undo2Icon,
  UserRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ORDER_WINDOWS, type Order, type OrderMethod, type OrderWindow } from "../orders";
import { PAYMENT_METHODS } from "../payments-series";

const PAGE_SIZE = 50;
const NONE = "None";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

type SortKey = "date" | "subtotal";
type Sort = { key: SortKey; dir: "asc" | "desc" };
type TextColumn = "id" | "customer";
type ValueColumn = "method" | "status" | "code" | "protection";
type Filters = Record<TextColumn, string> & Record<ValueColumn, string[]>;

const NO_FILTERS: Filters = {
  id: "",
  customer: "",
  method: [],
  status: [],
  code: [],
  protection: [],
};

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

/** "SETTLED" → "Settled", "PENDING_REVIEW" → "Pending review". */
function humanize(value: string) {
  const words = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function cardBrand(brand: string) {
  return brand.length <= 4 ? brand.toUpperCase() : humanize(brand);
}

function methodLabel(method: OrderMethod) {
  if (method.wallet === "apple-pay") return "Apple Pay";
  if (method.wallet === "google-pay") return "Google Pay";
  if (method.key === "card") return method.brand ? cardBrand(method.brand) : "Card";
  return PAYMENT_METHODS.find((item) => item.key === method.key)?.label ?? "Other";
}

/** Relative to the server's clock so the server and client render the same text. */
function timeAgo(at: Date, now: Date) {
  const seconds = Math.round((at.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  return relative.format(Math.round(seconds / (30 * 86_400)), "month");
}

function formatRange(days: number, now: Date, timeZone: string) {
  const day = (at: Date, withYear: boolean) =>
    at.toLocaleDateString("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return `${day(new Date(now.getTime() - days * 86_400_000), false)} – ${day(now, true)}`;
}

function valueOf(order: Order, column: ValueColumn) {
  if (column === "method") return methodLabel(order.method);
  const value = order[column];
  return value ? humanize(value) : NONE;
}

type Tone = "green" | "amber" | "red" | "gray" | "indigo" | "lime" | "sky";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  gray: "bg-white text-foreground/80 ring-foreground/10",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  lime: "bg-lime-50 text-lime-800 ring-lime-600/25",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

function Pill({ tone, icon: Icon, children }: { tone: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 384 512" aria-hidden className="size-3.5 shrink-0 fill-current">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function MethodPill({ method }: { method: OrderMethod }) {
  if (method.wallet === "apple-pay") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset", TONES.gray)}>
        <AppleLogo />
        Apple Pay
      </span>
    );
  }
  if (method.wallet === "google-pay") return <Pill tone="gray" icon={WalletIcon}>Google Pay</Pill>;
  if (method.key === "card") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset">
        {method.brand ? (
          <span className="font-extrabold tracking-tight text-blue-900 italic">{cardBrand(method.brand)}</span>
        ) : (
          <CreditCardIcon className="size-3.5" />
        )}
        {method.last4 ?? (method.brand ? null : "Card")}
      </span>
    );
  }
  const icon = method.key === "ach" ? LandmarkIcon : method.key === "crypto" ? CoinsIcon : WalletIcon;
  return <Pill tone="gray" icon={icon}>{methodLabel(method)}</Pill>;
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const label = humanize(status);
  if (/settled|complete|success|captured|paid/i.test(status))
    return <Pill tone="green" icon={CircleCheckIcon}>{label}</Pill>;
  if (/fail|declin|reject|error|chargeback|fraud/i.test(status))
    return <Pill tone="red" icon={CircleXIcon}>{label}</Pill>;
  if (/refund|cancel|void|expire|revers/i.test(status))
    return <Pill tone="gray" icon={Undo2Icon}>{label}</Pill>;
  return <Pill tone="amber" icon={ClockIcon}>{label}</Pill>;
}

function ProtectionPill({ decision }: { decision?: string }) {
  if (!decision) return <span className="text-muted-foreground">—</span>;
  const label = humanize(decision);
  if (/approv|accept|protect|pass/i.test(decision))
    return <Pill tone="indigo" icon={ShieldCheckIcon}>{label}</Pill>;
  if (/reject|declin|den|fail/i.test(decision))
    return <Pill tone="red" icon={ShieldXIcon}>{label}</Pill>;
  return <Pill tone="gray" icon={ShieldIcon}>{label}</Pill>;
}

function ThreeDsPill({ result }: { result?: string }) {
  if (!result) return <Pill tone="gray" icon={ShieldIcon}>N/A</Pill>;
  const label = humanize(result);
  if (/challeng/i.test(result)) return <Pill tone="lime" icon={ActivityIcon}>{label}</Pill>;
  if (/fail|reject|declin/i.test(result)) return <Pill tone="red" icon={ShieldXIcon}>{label}</Pill>;
  if (/frictionless|success|authenticat|pass|approv/i.test(result))
    return <Pill tone="sky" icon={ShieldCheckIcon}>{label}</Pill>;
  return <Pill tone="gray" icon={ShieldIcon}>{label}</Pill>;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      // Clipboard access can be blocked; the full value is still in the cell's title.
    }
  };
  return { copied, copy };
}

function CopyableId({ value, label }: { value?: string; label: string }) {
  const { copied, copy } = useCopy();
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span title={value} className="tabular-nums">
        {shortId(value)}
      </span>
      <button
        type="button"
        onClick={() => copy(value)}
        aria-label={`Copy ${label}`}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none"
      >
        {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
      </button>
    </span>
  );
}

const POPUP =
  "z-50 rounded-lg bg-popover p-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0";

function FilterPopover({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Filter ${label}`}
        className={cn(
          "rounded p-0.5 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none",
          active ? "text-shop-accent" : "text-muted-foreground/70",
        )}
      >
        <FunnelIcon className={cn("size-3.5", active && "fill-current")} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className={cn(POPUP, "w-56")}>{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TextFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <FilterPopover label={label} active={value.trim() !== ""}>
      <Input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`Search ${label.toLowerCase()}`}
        aria-label={`Search ${label.toLowerCase()}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </FilterPopover>
  );
}

function ValueFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <FilterPopover label={label} active={selected.length > 0}>
      {options.length === 0 ? (
        <p className="px-1 py-1.5 text-muted-foreground">Nothing to filter in this window.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <li key={option}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      onChange(next ? [...selected, option] : selected.filter((item) => item !== option))
                    }
                  />
                  <span className={cn(option === NONE && "text-muted-foreground")}>{option}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 px-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </FilterPopover>
  );
}

function ColumnHead({
  label,
  sort,
  sortKey,
  onSort,
  filter,
  className,
}: {
  label: string;
  sort?: Sort;
  sortKey?: SortKey;
  onSort?: (key: SortKey) => void;
  filter?: ReactNode;
  className?: string;
}) {
  const sorted = sortKey && sort?.key === sortKey ? sort.dir : undefined;
  const SortIcon = sorted === "asc" ? ChevronUpIcon : sorted === "desc" ? ChevronDownIcon : ChevronsUpDownIcon;
  return (
    <TableHead
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
      className={cn("h-12 px-4 text-xs font-medium tracking-wide text-muted-foreground uppercase", className)}
    >
      <span className="inline-flex items-center gap-1.5">
        {sortKey && onSort ? (
          <button
            type="button"
            onClick={() => onSort(sortKey)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none",
              sorted && "text-shop-accent",
            )}
          >
            {label}
            <SortIcon className="size-3.5" />
          </button>
        ) : (
          label
        )}
        {filter}
      </span>
    </TableHead>
  );
}

function WindowToggle({ value }: { value: OrderWindow }) {
  return (
    <nav
      aria-label="Time window"
      className="inline-flex w-fit rounded-lg bg-muted p-1 ring-1 ring-foreground/5"
    >
      {ORDER_WINDOWS.map((option) => (
        <Link
          key={option.key}
          href={`?window=${option.key}`}
          scroll={false}
          aria-current={value === option.key ? "page" : undefined}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm transition-colors",
            value === option.key
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

function RowActions({ order, onCustomer }: { order: Order; onCustomer: (customer: string) => void }) {
  const { copy } = useCopy();
  const iconButton =
    "rounded-md p-1.5 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={!order.customer}
        onClick={() => order.customer && onCustomer(order.customer)}
        aria-label="Show this customer's payments"
        title="Show this customer's payments"
        className={iconButton}
      >
        <UserRoundIcon className="size-4 fill-current" />
      </button>
      <Menu.Root>
        <Menu.Trigger aria-label="More actions" className={iconButton}>
          <EllipsisIcon className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end" className="z-50">
            <Menu.Popup className={cn(POPUP, "min-w-44 p-1")}>
              <Menu.Item
                onClick={() => copy(order.id)}
                className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none data-highlighted:bg-muted"
              >
                <CopyIcon className="size-3.5" />
                Copy payment ID
              </Menu.Item>
              <Menu.Item
                disabled={!order.customer}
                onClick={() => order.customer && copy(order.customer)}
                className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none data-disabled:opacity-40 data-highlighted:bg-muted"
              >
                <CopyIcon className="size-3.5" />
                Copy customer ID
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </span>
  );
}

function OrdersCard({
  subtitle,
  total,
  window,
  children,
}: {
  subtitle: string;
  total?: string;
  window: OrderWindow;
  children: ReactNode;
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-shop-ink">Payments</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
        {total !== undefined && (
          <CardAction className="font-heading text-2xl font-semibold text-shop-ink sm:text-3xl">
            {total}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <WindowToggle value={window} />
        {children}
      </CardContent>
    </Card>
  );
}

export function OrdersTable({
  window,
  orders,
  timeZone = "America/Los_Angeles",
  now: nowIso,
  error,
}: {
  window: OrderWindow;
  orders?: Order[];
  timeZone?: string;
  now?: string;
  error?: string;
}) {
  const [sort, setSort] = useState<Sort>({ key: "date", dir: "desc" });
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const options = useMemo(() => {
    const collect = (column: ValueColumn) => {
      const values = [...new Set((orders ?? []).map((order) => valueOf(order, column)))];
      // Sorted, with "None" last.
      return values.sort((a, b) => Number(a === NONE) - Number(b === NONE) || a.localeCompare(b));
    };
    return {
      method: collect("method"),
      status: collect("status"),
      code: collect("code"),
      protection: collect("protection"),
    };
  }, [orders]);

  const rows = useMemo(() => {
    const needle = (value: string) => value.trim().toLowerCase();
    const matches = (order: Order) =>
      (["id", "customer"] as const).every(
        (column) => !needle(filters[column]) || (order[column] ?? "").toLowerCase().includes(needle(filters[column])),
      ) &&
      (["method", "status", "code", "protection"] as const).every(
        (column) => filters[column].length === 0 || filters[column].includes(valueOf(order, column)),
      );
    const direction = sort.dir === "asc" ? 1 : -1;
    return (orders ?? [])
      .filter(matches)
      .sort((a, b) =>
        sort.key === "date"
          ? direction * (Date.parse(a.createdAt) - Date.parse(b.createdAt))
          : direction * (a.subtotalCents - b.subtotalCents),
      );
  }, [orders, filters, sort]);

  if (!orders || !nowIso) {
    return (
      <OrdersCard subtitle="All payments" window={window}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {error ?? "Payments couldn't be loaded right now."}
        </p>
      </OrdersCard>
    );
  }

  const now = new Date(nowIso);
  const days = ORDER_WINDOWS.find((option) => option.key === window)?.days ?? 30;
  const subtitle = `All payments · ${formatRange(days, now, timeZone)}`;
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const total = `${rows.length.toLocaleString()} ${rows.length === 1 ? "payment" : "payments"}`;

  const setFilter = <K extends keyof Filters>(column: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [column]: value }));
    setLimit(PAGE_SIZE);
  };
  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );

  if (orders.length === 0) {
    return (
      <OrdersCard subtitle={subtitle} total="0 payments" window={window}>
        <p className="py-10 text-center text-sm text-muted-foreground">No payments in this window.</p>
      </OrdersCard>
    );
  }

  const valueFilter = (column: ValueColumn, label: string) => (
    <ValueFilter
      label={label}
      options={options[column]}
      selected={filters[column]}
      onChange={(next) => setFilter(column, next)}
    />
  );
  const textFilter = (column: TextColumn, label: string) => (
    <TextFilter label={label} value={filters[column]} onChange={(next) => setFilter(column, next)} />
  );

  return (
    <OrdersCard subtitle={subtitle} total={total} window={window}>
      <div className="-mx-4 border-t border-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <ColumnHead label="Date (local)" sort={sort} sortKey="date" onSort={toggleSort} className="pl-6" />
              <ColumnHead label="Payment ID" filter={textFilter("id", "Payment ID")} />
              <ColumnHead label="Method" filter={valueFilter("method", "Method")} />
              <ColumnHead label="Subtotal" sort={sort} sortKey="subtotal" onSort={toggleSort} />
              <ColumnHead label="Customer" filter={textFilter("customer", "Customer")} />
              <ColumnHead label="Status" filter={valueFilter("status", "Status")} />
              <ColumnHead label="Code" filter={valueFilter("code", "Code")} />
              <ColumnHead label="Protection" filter={valueFilter("protection", "Protection")} />
              <ColumnHead label="3D Secure" />
              <TableHead className="pr-6">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((order) => {
              const created = new Date(order.createdAt);
              const valid = !Number.isNaN(created.getTime());
              return (
                <TableRow key={order.id}>
                  <TableCell className="py-5 pl-6 text-foreground/80">
                    {valid ? (
                      <time
                        dateTime={order.createdAt}
                        title={created.toLocaleString("en-US", {
                          timeZone,
                          // dateStyle/timeStyle can't be combined with timeZoneName.
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZoneName: "short",
                        })}
                      >
                        {timeAgo(created, now)}
                      </time>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80">
                    <CopyableId value={order.id} label="payment ID" />
                  </TableCell>
                  <TableCell className="px-4">
                    <MethodPill method={order.method} />
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80 tabular-nums">
                    {usd.format(order.subtotalCents / 100)}
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80">
                    <CopyableId value={order.customer} label="customer ID" />
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusPill status={order.status} />
                  </TableCell>
                  <TableCell className="px-4 font-mono text-xs text-foreground/80">{order.code}</TableCell>
                  <TableCell className="px-4">
                    <ProtectionPill decision={order.protection} />
                  </TableCell>
                  <TableCell className="px-4">
                    <ThreeDsPill result={order.threeDs} />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <RowActions order={order} onCustomer={(customer) => setFilter("customer", customer)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            No payments match these filters.
            <Button type="button" variant="outline" size="sm" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {Math.min(limit, rows.length).toLocaleString()} of {rows.length.toLocaleString()}
            {filtered && ` (filtered from ${orders.length.toLocaleString()})`}
          </span>
          <span className="flex items-center gap-2">
            {filtered && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setFilters(NO_FILTERS)}>
                Clear filters
              </Button>
            )}
            {rows.length > limit && (
              <Button type="button" variant="outline" size="sm" onClick={() => setLimit(limit + PAGE_SIZE)}>
                Show more
              </Button>
            )}
          </span>
        </div>
      )}
    </OrdersCard>
  );
}
