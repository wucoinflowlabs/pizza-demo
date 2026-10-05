"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, DownloadIcon, EyeIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WithdrawRange } from "../withdraw-range";
import type { WithdrawRow } from "../withdrawals";
import { CopyableId, humanize } from "./payment-pills";
import { ColumnHead, ServerSearch, ValueFilter, timeAgo, type Sort } from "./table-controls";
import { WithdrawDrawer } from "./withdraw-drawer";
import { SpeedPill, WithdrawStatusPill, WithdrawerId, compactDate, money, speedLabel } from "./withdrawal-pills";

const PAGE_SIZE = 50;

type DateFormat = "fromNow" | "local" | "utc";
const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "fromNow", label: "From Now" },
  { value: "local", label: "Local" },
  { value: "utc", label: "UTC" },
];

type SortKey = "date" | "amount";
type Filters = { status: string[]; speed: string[] };
const NO_FILTERS: Filters = { status: [], speed: [] };

const statusLabel = (row: WithdrawRow) => humanize(row.status);

function formatDate(iso: string, format: DateFormat, timeZone: string, now: Date) {
  if (format === "fromNow") {
    const at = new Date(iso);
    return Number.isNaN(at.getTime()) ? "—" : timeAgo(at, now);
  }
  return compactDate(iso, format === "utc" ? "UTC" : timeZone);
}

function csvCell(value: string | number | undefined) {
  const text = value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: WithdrawRow[], range: WithdrawRange) {
  const header = ["Date", "Merchant", "Transfer ID", "Signature", "Account ID", "Withdrawer", "Amount", "Currency", "Status", "Method", "Estimated arrival"];
  const lines = rows.map((row) =>
    [
      row.createdAt,
      row.merchantId,
      row.id,
      row.transaction,
      row.accountId,
      row.wallet,
      (row.amountCents / 100).toFixed(2),
      row.currency,
      row.status,
      speedLabel(row.speed),
      row.expectedDeliveryDate,
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `withdraws-${range.from}-to-${range.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function DateRangeFilter({ range, searching }: { range: WithdrawRange; searching: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (next: Partial<WithdrawRange>) => {
    const merged = { ...range, ...next };
    if (!merged.from || !merged.to) return;
    const params = new URLSearchParams(searchParams);
    params.set("from", merged.from);
    params.set("to", merged.to);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div
      className={cn(
        "relative flex h-10 items-center gap-2 rounded-lg px-2 ring-1 ring-foreground/10",
        pending && "opacity-60",
      )}
    >
      <Input
        type="date"
        aria-label="From date"
        value={range.from}
        max={range.to}
        onChange={(event) => update({ from: event.target.value })}
        className="h-8 w-36 border-0 px-1 shadow-none focus-visible:ring-0"
      />
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      <Input
        type="date"
        aria-label="To date"
        value={range.to}
        min={range.from}
        onChange={(event) => update({ to: event.target.value })}
        className="h-8 w-36 border-0 px-1 shadow-none focus-visible:ring-0"
      />
      {searching && (
        <span
          title="Searches cover every date"
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/90 text-sm font-medium text-muted-foreground"
        >
          All dates
        </span>
      )}
    </div>
  );
}

function WithdrawsCard({
  search,
  range,
  dateFormat,
  onDateFormat,
  total,
  onDownload,
  children,
}: {
  search: string;
  range: WithdrawRange;
  dateFormat: DateFormat;
  onDateFormat: (format: DateFormat) => void;
  total?: string;
  onDownload?: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-shop-ink">Withdraws</CardTitle>
        <CardDescription>
          Withdrawal dates displayed in {dateFormat === "utc" ? "UTC" : "your shop's local time"}
        </CardDescription>
        {total !== undefined && (
          <CardAction className="font-heading text-2xl font-semibold text-shop-ink sm:text-3xl">{total}</CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ServerSearch value={search} placeholder="Search by transfer ID, signature, or user ID…" />
          <DateRangeFilter range={range} searching={search !== ""} />
          <Select value={dateFormat} onValueChange={(value) => onDateFormat(value as DateFormat)}>
            <SelectTrigger aria-label="Date format" className="h-10 w-32">
              <SelectValue>{DATE_FORMATS.find((option) => option.value === dateFormat)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10"
            disabled={!onDownload}
            onClick={onDownload}
            aria-label="Download CSV"
            title="Download CSV"
          >
            <DownloadIcon />
          </Button>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function WithdrawsTable({
  search,
  range,
  timeZone,
  withdraws,
  now: nowIso,
  error,
}: {
  search: string;
  range: WithdrawRange;
  timeZone: string;
  withdraws?: WithdrawRow[];
  now?: string;
  error?: string;
}) {
  const [sort, setSort] = useState<Sort<SortKey>>({ key: "date", dir: "desc" });
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [dateFormat, setDateFormat] = useState<DateFormat>("fromNow");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("withdraw"));
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("withdraw", selectedId);
    else url.searchParams.delete("withdraw");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [selectedId]);

  const options = useMemo(() => {
    const rows = withdraws ?? [];
    return {
      status: [...new Set(rows.map(statusLabel))].sort(),
      speed: [...new Set(rows.map((row) => speedLabel(row.speed)))].sort(),
    };
  }, [withdraws]);

  const rows = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1;
    return (withdraws ?? [])
      .filter(
        (row) =>
          (filters.status.length === 0 || filters.status.includes(statusLabel(row))) &&
          (filters.speed.length === 0 || filters.speed.includes(speedLabel(row.speed))),
      )
      .sort((a, b) =>
        sort.key === "date"
          ? direction * (Date.parse(a.createdAt) - Date.parse(b.createdAt))
          : direction * (a.amountCents - b.amountCents),
      );
  }, [withdraws, filters, sort]);

  const card = { search, range, dateFormat, onDateFormat: setDateFormat };

  if (!withdraws || !nowIso) {
    return (
      <WithdrawsCard {...card}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {error ?? "Withdrawals couldn't be loaded right now."}
        </p>
      </WithdrawsCard>
    );
  }

  if (withdraws.length === 0) {
    return (
      <WithdrawsCard {...card} total="0 withdrawals">
        <p className="py-10 text-center text-sm text-muted-foreground">
          {search ? `No withdrawal matches “${search}”.` : "No withdrawals in this date range."}
        </p>
      </WithdrawsCard>
    );
  }

  const now = new Date(nowIso);
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const total = `${rows.length.toLocaleString()} ${rows.length === 1 ? "withdrawal" : "withdrawals"}`;
  const setFilter = (column: keyof Filters, value: string[]) => {
    setFilters((current) => ({ ...current, [column]: value }));
    setLimit(PAGE_SIZE);
  };
  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  const openOnKey = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(id);
    }
  };
  const valueFilter = (column: keyof Filters, label: string) => (
    <ValueFilter
      label={label}
      options={options[column]}
      selected={filters[column]}
      onChange={(next) => setFilter(column, next)}
    />
  );

  return (
    <WithdrawsCard {...card} total={total} onDownload={() => downloadCsv(rows, range)}>
      <div className="-mx-4 border-t border-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <ColumnHead
                label={dateFormat === "utc" ? "Date (UTC)" : "Date (local)"}
                sort={sort}
                sortKey="date"
                onSort={toggleSort}
                className="pl-6"
              />
              <ColumnHead label="Transfer ID" />
              <ColumnHead label="Account ID" />
              <ColumnHead label="Withdrawer" />
              <ColumnHead label="Amount" sort={sort} sortKey="amount" onSort={toggleSort} />
              <ColumnHead label="Status" filter={valueFilter("status", "Status")} />
              <ColumnHead label="Speed" filter={valueFilter("speed", "Speed")} />
              <ColumnHead label="Estimated arrival" />
              <ColumnHead label="Type" />
              <TableHead className="pr-6">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((row) => {
              const arrival = row.expectedDeliveryDate ? new Date(row.expectedDeliveryDate) : undefined;
              return (
                <TableRow
                  key={row.id}
                  tabIndex={0}
                  aria-label={`Withdrawal ${row.id}`}
                  data-state={row.id === selectedId ? "selected" : undefined}
                  onClick={() => setSelectedId(row.id)}
                  onKeyDown={(event) => openOnKey(event, row.id)}
                  className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <TableCell className="py-5 pl-6 text-foreground/80 tabular-nums">
                    <time dateTime={row.createdAt} title={compactDate(row.createdAt, timeZone)}>
                      {formatDate(row.createdAt, dateFormat, timeZone, now)}
                    </time>
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80">
                    <CopyableId value={row.id} label="transfer ID" />
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80">
                    <CopyableId value={row.accountId} label="account ID" />
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80">
                    <WithdrawerId value={row.wallet} isUser={row.isUser} />
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80 tabular-nums">
                    {money(row.amountCents, row.currency)}
                  </TableCell>
                  <TableCell className="px-4">
                    <WithdrawStatusPill status={row.status} returnStatus={row.returnStatus} />
                  </TableCell>
                  <TableCell className="px-4">
                    <SpeedPill speed={row.speed} />
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80">
                    {arrival && !Number.isNaN(arrival.getTime()) ? timeAgo(arrival, now) : "—"}
                  </TableCell>
                  <TableCell className="px-4 text-foreground/80">
                    {row.isFirstParty ? (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium ring-1 ring-foreground/10">
                        First party
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(row.id);
                      }}
                      aria-label="View withdrawal"
                      className="rounded-md p-1.5 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none"
                    >
                      <EyeIcon className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            No withdrawals match these filters.
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
            {filtered && ` (filtered from ${withdraws.length.toLocaleString()})`}
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
      <WithdrawDrawer
        transferId={selectedId}
        timeZone={timeZone}
        container={portalRef}
        onClose={() => setSelectedId(null)}
      />
    </WithdrawsCard>
  );
}
