"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InfoIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { Chargeback } from "../chargebacks";
import { ORDER_WINDOWS, type OrderWindow } from "../orders";
import { ChargebackDrawer } from "./chargeback-drawer";
import {
  ChargebackStatusPill,
  CopyableId,
  MethodPill,
  ProtectionPill,
  ThreeDsPill,
  humanize,
  methodLabel,
} from "./payment-pills";
import {
  ColumnHead,
  FailedLocations,
  LocationPicker,
  NONE,
  ValueFilter,
  WindowToggle,
  formatRange,
  timeAgo,
  type LocationOption,
  type Sort as SortOf,
} from "./table-controls";

const PAGE_SIZE = 50;

type SortKey = "loaded" | "updated" | "total" | "due";
type Sort = SortOf<SortKey>;
type ValueColumn = "method" | "status" | "protection" | "threeDs" | "code";
type Filters = Record<ValueColumn, string[]>;

const VALUE_COLUMNS: ValueColumn[] = ["method", "status", "protection", "threeDs", "code"];
const NO_FILTERS: Filters = { method: [], status: [], protection: [], threeDs: [], code: [] };

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function valueOf(chargeback: Chargeback, column: ValueColumn) {
  if (column === "method") return methodLabel(chargeback.method);
  if (column === "status") return chargeback.status;
  if (column === "code") return chargeback.reasonCode ?? NONE;
  const value = chargeback[column];
  return value ? humanize(value) : NONE;
}

function time(value?: string) {
  const at = value ? Date.parse(value) : NaN;
  return Number.isNaN(at) ? undefined : at;
}

/** "09-25-26 15:58" in the shop's time zone. */
function shortDateTime(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.month}-${parts.day}-${parts.year} ${parts.hour}:${parts.minute}`;
}

function DateCell({ value, timeZone }: { value?: string; timeZone: string }) {
  const at = time(value);
  if (at === undefined) return <span className="text-muted-foreground">—</span>;
  const date = new Date(at);
  return (
    <time
      dateTime={value}
      title={date.toLocaleString("en-US", {
        timeZone,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })}
      className="whitespace-nowrap tabular-nums"
    >
      {shortDateTime(date, timeZone)}
    </time>
  );
}

/** A response is only due while the chargeback is still open. */
function DueCell({ chargeback, now }: { chargeback: Chargeback; now: Date }) {
  const at = time(chargeback.respondBy);
  const open = chargeback.status === "Needs Response" || chargeback.status === "Under Review";
  if (at === undefined || !open) return <span className="text-muted-foreground">—</span>;
  const overdue = chargeback.status === "Needs Response" && at < now.getTime();
  return (
    <time
      dateTime={chargeback.respondBy}
      title={new Date(at).toLocaleString("en-US")}
      className={cn("whitespace-nowrap", overdue ? "font-medium text-red-600" : "text-foreground/80")}
    >
      {timeAgo(new Date(at), now)}
    </time>
  );
}

function ChargebacksCard({
  subtitle,
  total,
  window,
  locations,
  location,
  search,
  children,
}: {
  subtitle: string;
  total?: string;
  window: OrderWindow;
  locations?: LocationOption[];
  location?: string;
  search?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-shop-ink">Payment disputes</CardTitle>
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
          {search}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function ChargebacksTable({
  window,
  chargebacks,
  timeZone = "America/Los_Angeles",
  now: nowIso,
  error,
  locations,
  location,
  failedLocations = [],
}: {
  window: OrderWindow;
  chargebacks?: Chargeback[];
  timeZone?: string;
  now?: string;
  error?: string;
  /** Set for a franchise owner: adds the location picker and column. */
  locations?: LocationOption[];
  /** The picked store, or undefined for all locations. */
  location?: string;
  /** Stores whose chargebacks couldn't be loaded. */
  failedLocations?: string[];
}) {
  const [sort, setSort] = useState<Sort>({ key: "loaded", dir: "desc" });
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchParams = useSearchParams();
  const router = useRouter();
  // Chargebacks are keyed by their payment id, the id every chargeback endpoint takes.
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("chargeback"));
  const portalRef = useRef<HTMLDivElement>(null);
  const card = { window, locations, location };

  // Keeps ?chargeback= in the address bar so a chargeback can be linked to. `window` is the
  // time-window prop here, so the browser globals go through globalThis.
  useEffect(() => {
    const url = new URL(globalThis.location.href);
    if (selectedId) url.searchParams.set("chargeback", selectedId);
    else url.searchParams.delete("chargeback");
    if (url.href !== globalThis.location.href) globalThis.history.replaceState(null, "", url);
  }, [selectedId, window]);

  const options = useMemo(() => {
    const collect = (column: ValueColumn) => {
      const values = [...new Set((chargebacks ?? []).map((chargeback) => valueOf(chargeback, column)))];
      // Sorted, with "None" last.
      return values.sort((a, b) => Number(a === NONE) - Number(b === NONE) || a.localeCompare(b));
    };
    return Object.fromEntries(VALUE_COLUMNS.map((column) => [column, collect(column)])) as Record<
      ValueColumn,
      string[]
    >;
  }, [chargebacks]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (chargeback: Chargeback) =>
      (!needle ||
        [chargeback.id, chargeback.chargebackId, chargeback.arn, chargeback.customer, chargeback.reasonCode].some(
          (value) => value?.toLowerCase().includes(needle),
        )) &&
      VALUE_COLUMNS.every(
        (column) => filters[column].length === 0 || filters[column].includes(valueOf(chargeback, column)),
      );
    const key = (chargeback: Chargeback) => {
      if (sort.key === "total") return chargeback.totalCents;
      const value = { loaded: chargeback.loadedAt, updated: chargeback.updatedAt, due: chargeback.respondBy }[
        sort.key
      ];
      return time(value) ?? 0;
    };
    const direction = sort.dir === "asc" ? 1 : -1;
    return (chargebacks ?? []).filter(matches).sort((a, b) => direction * (key(a) - key(b)));
  }, [chargebacks, filters, query, sort]);

  const searchBox = (
    <div className="relative min-w-56 flex-1 sm:max-w-sm">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(PAGE_SIZE);
        }}
        placeholder="Search for a record"
        aria-label="Search chargebacks"
        className="h-10 bg-background pl-9"
      />
    </div>
  );

  if (!chargebacks || !nowIso) {
    return (
      <ChargebacksCard subtitle="View & fight chargebacks" {...card}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {error ?? "Chargebacks couldn't be loaded right now."}
        </p>
      </ChargebacksCard>
    );
  }

  const now = new Date(nowIso);
  const days = ORDER_WINDOWS.find((option) => option.key === window)?.days ?? 30;
  const picked = locations?.find((option) => option.id === location);
  const scope = picked ? `${picked.label}, ${picked.city}` : locations ? "All locations" : "View & fight chargebacks";
  const subtitle = `${scope} · ${formatRange(days, now, timeZone)}`;
  const filtered = query.trim() !== "" || JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const total = `${rows.length.toLocaleString()} ${rows.length === 1 ? "chargeback" : "chargebacks"}`;

  const setFilter = (column: ValueColumn, value: string[]) => {
    setFilters((current) => ({ ...current, [column]: value }));
    setLimit(PAGE_SIZE);
  };
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setQuery("");
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

  if (chargebacks.length === 0) {
    return (
      <ChargebacksCard subtitle={subtitle} total="0 chargebacks" {...card}>
        <FailedLocations names={failedLocations} noun="Chargebacks" />
        <p className="py-10 text-center text-sm text-muted-foreground">No chargebacks in this window.</p>
      </ChargebacksCard>
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

  return (
    <ChargebacksCard subtitle={subtitle} total={total} search={searchBox} {...card}>
      <FailedLocations names={failedLocations} noun="Chargebacks" />
      <div className="-mx-4 border-t border-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <ColumnHead label="Loaded" sort={sort} sortKey="loaded" onSort={toggleSort} className="pl-6" />
              <ColumnHead label="Updated" sort={sort} sortKey="updated" onSort={toggleSort} />
              {locations && <ColumnHead label="Location" />}
              <ColumnHead label="Payment ID" />
              <ColumnHead label="ARN" />
              <ColumnHead label="Customer" />
              <ColumnHead label="Method" filter={valueFilter("method", "Method")} />
              <ColumnHead label="Total" sort={sort} sortKey="total" onSort={toggleSort} />
              <ColumnHead label="Fee" />
              <ColumnHead label="Status" filter={valueFilter("status", "Status")} />
              <ColumnHead label="Protection" filter={valueFilter("protection", "Protection")} />
              <ColumnHead label="3D Secure" filter={valueFilter("threeDs", "3D Secure")} />
              <ColumnHead label="Code" filter={valueFilter("code", "Code")} />
              <ColumnHead label="Due" sort={sort} sortKey="due" onSort={toggleSort} className="pr-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((chargeback) => (
              <TableRow
                key={`${chargeback.location?.id ?? ""}:${chargeback.chargebackId ?? chargeback.id}`}
                tabIndex={0}
                aria-label={`Chargeback on payment ${chargeback.id}`}
                data-state={chargeback.id === selectedId ? "selected" : undefined}
                onClick={() => setSelectedId(chargeback.id)}
                onKeyDown={(event) => openOnKey(event, chargeback.id)}
                className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <TableCell className="py-5 pl-6 text-foreground/80">
                  <DateCell value={chargeback.loadedAt} timeZone={timeZone} />
                </TableCell>
                <TableCell className="px-4 text-foreground/80">
                  <DateCell value={chargeback.updatedAt} timeZone={timeZone} />
                </TableCell>
                {locations && (
                  <TableCell className="px-4">
                    <div className="font-medium text-foreground/90">{chargeback.location?.label ?? "—"}</div>
                    {chargeback.location?.city && (
                      <div className="text-xs text-muted-foreground">{chargeback.location.city}</div>
                    )}
                  </TableCell>
                )}
                <TableCell className="px-4 text-foreground/80">
                  <CopyableId value={chargeback.id} label="payment ID" />
                </TableCell>
                <TableCell className="px-4 text-foreground/80">
                  <CopyableId value={chargeback.arn} label="ARN" />
                </TableCell>
                <TableCell className="px-4 text-foreground/80">
                  <CopyableId value={chargeback.customer} label="customer ID" />
                </TableCell>
                <TableCell className="px-4">
                  <MethodPill method={chargeback.method} />
                </TableCell>
                <TableCell className="px-4 text-foreground/80 tabular-nums">
                  {money(chargeback.totalCents, chargeback.currency)}
                </TableCell>
                <TableCell className="px-4 text-foreground/80 tabular-nums">
                  {chargeback.feeCents === undefined ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    money(chargeback.feeCents, chargeback.currency)
                  )}
                </TableCell>
                <TableCell className="px-4">
                  <ChargebackStatusPill status={chargeback.status} />
                </TableCell>
                <TableCell className="px-4">
                  <ProtectionPill decision={chargeback.protection} />
                </TableCell>
                <TableCell className="px-4">
                  <ThreeDsPill result={chargeback.threeDs} />
                </TableCell>
                <TableCell className="px-4 text-foreground/80">
                  {chargeback.reasonCode ? (
                    <span className="inline-flex items-center gap-1.5" title={chargeback.reasonDescription}>
                      {chargeback.reasonCode}
                      {chargeback.reasonDescription && (
                        <InfoIcon className="size-3.5 text-muted-foreground" aria-label={chargeback.reasonDescription} />
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-6">
                  <DueCell chargeback={chargeback} now={now} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            No chargebacks match these filters.
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {Math.min(limit, rows.length).toLocaleString()} of {rows.length.toLocaleString()}
            {filtered && ` (filtered from ${chargebacks.length.toLocaleString()})`}
          </span>
          <span className="flex items-center gap-2">
            {filtered && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
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
      <ChargebackDrawer
        chargeback={chargebacks.find((chargeback) => chargeback.id === selectedId)}
        timeZone={timeZone}
        container={portalRef}
        onClose={() => setSelectedId(null)}
        onChanged={() => router.refresh()}
      />
    </ChargebacksCard>
  );
}
