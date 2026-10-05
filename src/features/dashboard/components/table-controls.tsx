"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon, FunnelIcon, MapPinIcon } from "lucide-react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";
import { ORDER_WINDOWS, type OrderWindow } from "../orders";

/** Shared by the Payments and Chargebacks tables. */

export const NONE = "None";
const ALL_LOCATIONS = "all";

/** One store a franchise owner can narrow the table to. */
export type LocationOption = { id: string; label: string; city: string; enrolled: boolean };

export type Sort<K extends string> = { key: K; dir: "asc" | "desc" };

const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** Relative to the server's clock so the server and client render the same text. */
export function timeAgo(at: Date, now: Date) {
  const seconds = Math.round((at.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  return relative.format(Math.round(seconds / (30 * 86_400)), "month");
}

export function formatRange(days: number, now: Date, timeZone: string) {
  const day = (at: Date, withYear: boolean) =>
    at.toLocaleDateString("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return `${day(new Date(now.getTime() - days * 86_400_000), false)} – ${day(now, true)}`;
}

export const POPUP =
  "z-50 rounded-lg bg-popover p-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0";

export function FilterPopover({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
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

export function TextFilter({
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

export function ValueFilter({
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

export function ColumnHead<K extends string>({
  label,
  sort,
  sortKey,
  onSort,
  filter,
  className,
}: {
  label: string;
  sort?: Sort<K>;
  sortKey?: K;
  onSort?: (key: K) => void;
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

/** Keeps the window and location together, so changing one doesn't drop the other. */
function ordersHref({ window, location }: { window: OrderWindow; location?: string }) {
  const params = new URLSearchParams({ window });
  if (location) params.set("location", location);
  return `?${params.toString()}`;
}

export function WindowToggle({ value, location }: { value: OrderWindow; location?: string }) {
  return (
    <nav
      aria-label="Time window"
      className="inline-flex w-fit rounded-lg bg-muted p-1 ring-1 ring-foreground/5"
    >
      {ORDER_WINDOWS.map((option) => (
        <Link
          key={option.key}
          href={ordersHref({ window: option.key, location })}
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

/** Picking a store reloads the page so only that store's sub-merchant is asked for data. */
export function LocationPicker({
  locations,
  value,
  window,
}: {
  locations: LocationOption[];
  value?: string;
  window: OrderWindow;
}) {
  const router = useRouter();
  const items = [
    { value: ALL_LOCATIONS, label: "All locations" },
    ...locations.map((location) => ({ value: location.id, label: `${location.label}, ${location.city}` })),
  ];
  return (
    <Select
      items={items}
      value={value ?? ALL_LOCATIONS}
      onValueChange={(next) => {
        if (!next) return;
        const location = next === ALL_LOCATIONS ? undefined : String(next);
        router.push(ordersHref({ window, location }), { scroll: false });
      }}
    >
      <SelectTrigger aria-label="Location" className="h-10 min-w-56 bg-background">
        <MapPinIcon className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_LOCATIONS}>All locations</SelectItem>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id} disabled={!location.enrolled}>
            {location.label}
            <span className="text-muted-foreground">
              {location.enrolled ? location.city : "Not enrolled"}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FailedLocations({ names, noun = "Payments" }: { names: string[]; noun?: string }) {
  if (names.length === 0) return null;
  return (
    <p className="text-sm text-muted-foreground">
      {noun} couldn&apos;t be loaded for {names.join(", ")}. Other locations are shown.
    </p>
  );
}
