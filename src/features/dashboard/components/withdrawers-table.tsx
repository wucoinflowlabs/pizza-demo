"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { WithdrawerRow } from "../withdrawals";
import { ColumnHead, FailedLocations, LocationPicker, ServerSearch, ValueFilter, type LocationOption, type Sort } from "./table-controls";
import {
  BlockedPill,
  CopyText,
  PayoutMethodChips,
  CurrencyChip,
  VerificationPill,
  WithdrawerId,
  compactDate,
  shortKey,
  verificationLabel,
} from "./withdrawal-pills";
import { TipsDrawer } from "./tips-drawer";

const PAGE_SIZE = 50;

type Filters = { blocked: string[]; status: string[] };
const NO_FILTERS: Filters = { blocked: [], status: [] };

const blockedLabel = (row: WithdrawerRow) => (row.blocked ? "Blocked" : "Functional");

function WithdrawersCard({
  search,
  total,
  locations,
  location,
  failedLocations = [],
  children,
}: {
  search: string;
  total?: string;
  locations?: LocationOption[];
  location?: string;
  failedLocations?: string[];
  children: ReactNode;
}) {
  const picked = locations?.find((option) => option.id === location);
  const scope = picked ? `${picked.label}, ${picked.city}` : locations ? "All locations" : "View staff and their information";
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-shop-ink">Staff</CardTitle>
        <CardDescription>{scope}</CardDescription>
        {total !== undefined && (
          <CardAction className="font-heading text-2xl font-semibold text-shop-ink sm:text-3xl">{total}</CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ServerSearch value={search} placeholder="Search by email, user ID, or verification reference…" />
          {locations && <LocationPicker locations={locations} value={location} />}
        </div>
        <FailedLocations names={failedLocations} noun="Staff" />
        {children}
      </CardContent>
    </Card>
  );
}

export function WithdrawersTable({
  search,
  withdrawers,
  timeZone,
  locations,
  location,
  failedLocations = [],
  error,
}: {
  search: string;
  withdrawers?: WithdrawerRow[];
  timeZone: string;
  /** Set for a franchise owner: adds the location picker and column. */
  locations?: LocationOption[];
  /** The picked store, or undefined for all locations. */
  location?: string;
  /** Stores whose list failed. The others are shown. */
  failedLocations?: string[];
  error?: string;
}) {
  const [sort, setSort] = useState<Sort<"created">>({ key: "created", dir: "desc" });
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("withdrawer"));
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("withdrawer", selectedId);
    else url.searchParams.delete("withdrawer");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [selectedId]);

  const options = useMemo(() => {
    const rows = withdrawers ?? [];
    return {
      blocked: [...new Set(rows.map(blockedLabel))].sort(),
      status: [...new Set(rows.map((row) => verificationLabel(row.verification.status)))].sort(),
    };
  }, [withdrawers]);

  const rows = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1;
    return (withdrawers ?? [])
      .filter(
        (row) =>
          (filters.blocked.length === 0 || filters.blocked.includes(blockedLabel(row))) &&
          (filters.status.length === 0 || filters.status.includes(verificationLabel(row.verification.status))),
      )
      .sort((a, b) => direction * (Date.parse(a.createdAt ?? "") - Date.parse(b.createdAt ?? "")));
  }, [withdrawers, filters, sort]);

  if (!withdrawers) {
    return (
      <WithdrawersCard search={search} locations={locations} location={location} failedLocations={failedLocations}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {error ?? "Staff couldn't be loaded right now."}
        </p>
      </WithdrawersCard>
    );
  }

  if (withdrawers.length === 0) {
    return (
      <WithdrawersCard search={search} total="0 staff" locations={locations} location={location} failedLocations={failedLocations}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {search ? `No staff matches “${search}”.` : "No staff yet."}
        </p>
      </WithdrawersCard>
    );
  }

  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const total = `${rows.length.toLocaleString()} staff`;
  const setFilter = (column: keyof Filters, value: string[]) => {
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
  const valueFilter = (column: keyof Filters, label: string) => (
    <ValueFilter
      label={label}
      options={options[column]}
      selected={filters[column]}
      onChange={(next) => setFilter(column, next)}
    />
  );

  const index = rows.findIndex((row) => row.id === selectedId);
  const selected = index >= 0 ? rows[index] : withdrawers.find((row) => row.id === selectedId);

  return (
    <WithdrawersCard search={search} total={total} locations={locations} location={location} failedLocations={failedLocations}>
      <div className="-mx-4 border-t border-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {locations && <ColumnHead label="Location" />}
              <ColumnHead label="Name" className="pl-6" />
              <ColumnHead label="Email" />
              <ColumnHead label="Currency" />
              <ColumnHead label="Payout methods" className="pr-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((row) => (
              <TableRow
                key={row.id}
                tabIndex={0}
                aria-label={`Withdrawer ${row.email ?? row.wallet}`}
                data-state={row.id === selectedId ? "selected" : undefined}
                onClick={() => setSelectedId(row.id)}
                onKeyDown={(event) => openOnKey(event, row.id)}
                className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                {locations && (
                  <TableCell className="px-4 text-foreground/80">
                    {row.location ? (
                      <>
                        <div className="font-medium text-foreground/90">{row.location.label}</div>
                        {row.location.city && (
                          <div className="text-xs text-muted-foreground">{row.location.city}</div>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                <TableCell className="py-3 pl-6 font-medium text-foreground">
                  {row.name ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="max-w-56 px-4 text-[11px] text-foreground/80">
                  <CopyText value={row.email} label="email" />
                </TableCell>
                <TableCell className="px-4">
                  <CurrencyChip currency={row.currency} />
                </TableCell>
                <TableCell className="px-4 pr-6">
                  <PayoutMethodChips methods={row.payoutMethods} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            No staff match these filters.
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
            {filtered && ` (filtered from ${withdrawers.length.toLocaleString()})`}
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
      <TipsDrawer
        withdrawer={selected ?? null}
        locationId={selected?.location?.id ?? location}
        container={portalRef}
        onClose={() => setSelectedId(null)}
      />
    </WithdrawersCard>
  );
}
