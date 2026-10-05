"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { CopyIcon, EllipsisIcon, PanelRightOpenIcon, UserRoundIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ORDER_WINDOWS, type Order, type OrderWindow } from "../orders";
import { PaymentDrawer } from "./payment-drawer";
import {
  CopyableId,
  MethodPill,
  ProtectionPill,
  StatusPill,
  ThreeDsPill,
  humanize,
  methodLabel,
  useCopy,
} from "./payment-pills";
import {
  ColumnHead,
  FailedLocations,
  LocationPicker,
  NONE,
  POPUP,
  TextFilter,
  ValueFilter,
  WindowToggle,
  formatRange,
  timeAgo,
  type LocationOption,
  type Sort as SortOf,
} from "./table-controls";

export type { LocationOption };

const PAGE_SIZE = 50;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type SortKey = "date" | "subtotal";
type Sort = SortOf<SortKey>;
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

function valueOf(order: Order, column: ValueColumn) {
  if (column === "method") return methodLabel(order.method);
  const value = order[column];
  return value ? humanize(value) : NONE;
}


function RowActions({
  order,
  onCustomer,
  onOpen,
}: {
  order: Order;
  onCustomer: (customer: string) => void;
  onOpen: () => void;
}) {
  const { copy } = useCopy();
  const iconButton =
    "rounded-md p-1.5 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30";
  return (
    // Clicks here (and in the portaled menu, which bubbles through React) shouldn't also open the row.
    <span className="inline-flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
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
                onClick={onOpen}
                className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none data-highlighted:bg-muted"
              >
                <PanelRightOpenIcon className="size-3.5" />
                View details
              </Menu.Item>
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
  locations,
  location,
  children,
}: {
  subtitle: string;
  total?: string;
  window: OrderWindow;
  locations?: LocationOption[];
  location?: string;
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
        <div className="flex flex-wrap items-center gap-3">
          <WindowToggle value={window} location={location} />
          {locations && <LocationPicker locations={locations} value={location} window={window} />}
        </div>
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
  locations,
  location,
  failedLocations = [],
}: {
  window: OrderWindow;
  orders?: Order[];
  timeZone?: string;
  now?: string;
  error?: string;
  /** Set for a franchise owner: adds the location picker and column. */
  locations?: LocationOption[];
  /** The picked store, or undefined for all locations. */
  location?: string;
  /** Stores whose payments couldn't be loaded. */
  failedLocations?: string[];
}) {
  const [sort, setSort] = useState<Sort>({ key: "date", dir: "desc" });
  const searchParams = useSearchParams();
  // ?customer= arrives from a link elsewhere (e.g. a chargeback) and seeds the customer filter.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...NO_FILTERS,
    customer: searchParams.get("customer") ?? "",
  }));
  const [limit, setLimit] = useState(PAGE_SIZE);
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("payment"));
  const portalRef = useRef<HTMLDivElement>(null);
  const card = { window, locations, location };

  // Keeps ?payment= in the address bar so a payment can be linked to. `window` is the
  // time-window prop here, so the browser globals go through globalThis.
  useEffect(() => {
    const url = new URL(globalThis.location.href);
    if (selectedId) url.searchParams.set("payment", selectedId);
    else url.searchParams.delete("payment");
    // The filter now lives in state; clearing it shouldn't come back on reload.
    url.searchParams.delete("customer");
    if (url.href !== globalThis.location.href) globalThis.history.replaceState(null, "", url);
  }, [selectedId, window]);

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
      <OrdersCard subtitle="All payments" {...card}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {error ?? "Payments couldn't be loaded right now."}
        </p>
      </OrdersCard>
    );
  }

  const now = new Date(nowIso);
  const days = ORDER_WINDOWS.find((option) => option.key === window)?.days ?? 30;
  const picked = locations?.find((option) => option.id === location);
  const scope = picked ? `${picked.label}, ${picked.city}` : locations ? "All locations" : "All payments";
  const subtitle = `${scope} · ${formatRange(days, now, timeZone)}`;
  // A payment linked from elsewhere may be outside the window; the picked store still owns it.
  const selectedLocation = orders.find((order) => order.id === selectedId)?.location?.id ?? location;
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const total = `${rows.length.toLocaleString()} ${rows.length === 1 ? "payment" : "payments"}`;

  const setFilter = <K extends keyof Filters>(column: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [column]: value }));
    setLimit(PAGE_SIZE);
  };
  const openOnKey = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(id);
    }
  };
  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );

  if (orders.length === 0) {
    return (
      <OrdersCard subtitle={subtitle} total="0 payments" {...card}>
        <FailedLocations names={failedLocations} />
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
    <OrdersCard subtitle={subtitle} total={total} {...card}>
      <FailedLocations names={failedLocations} />
      <div className="-mx-4 border-t border-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <ColumnHead label="Date (local)" sort={sort} sortKey="date" onSort={toggleSort} className="pl-6" />
              {locations && <ColumnHead label="Location" />}
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
                <TableRow
                  key={order.id}
                  tabIndex={0}
                  aria-label={`Payment ${order.id}`}
                  data-state={order.id === selectedId ? "selected" : undefined}
                  onClick={() => setSelectedId(order.id)}
                  onKeyDown={(event) => openOnKey(event, order.id)}
                  className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                >
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
                  {locations && (
                    <TableCell className="px-4">
                      <div className="font-medium text-foreground/90">{order.location?.label ?? "—"}</div>
                      {order.location?.city && (
                        <div className="text-xs text-muted-foreground">{order.location.city}</div>
                      )}
                    </TableCell>
                  )}
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
                    <RowActions
                      order={order}
                      onCustomer={(customer) => setFilter("customer", customer)}
                      onOpen={() => setSelectedId(order.id)}
                    />
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
      <div ref={portalRef} />
      <PaymentDrawer
        paymentId={selectedId}
        locationId={selectedLocation}
        timeZone={timeZone}
        container={portalRef}
        onClose={() => setSelectedId(null)}
        onCustomer={(customer) => setFilter("customer", customer)}
        onRefunded={() => router.refresh()}
      />
    </OrdersCard>
  );
}
