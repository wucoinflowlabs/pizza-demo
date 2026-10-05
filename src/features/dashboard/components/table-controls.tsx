"use client";

import { useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon, FunnelIcon, LoaderIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TableHead } from "@/components/ui/table";

export const NONE = "None";

const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export type Sort<K extends string> = { key: K; dir: "asc" | "desc" };

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


/**
 * Writes `?search=` on Enter so the server runs the provider's search.
 * The provider matches exact values, so there's no search-as-you-type.
 */
export function ServerSearch({ value, placeholder }: { value: string; placeholder: string }) {
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const submit = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next.trim()) params.set("search", next.trim());
    else params.delete("search");
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  return (
    <form
      role="search"
      className="relative w-full sm:max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        submit(draft);
      }}
    >
      {pending ? (
        <LoaderIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 pr-9 pl-9"
      />
      {draft && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setDraft("");
            submit("");
          }}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </form>
  );
}
