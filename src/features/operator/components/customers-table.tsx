"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, CreditCardIcon, MapPinIcon, SearchIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdoraCustomer } from "../adora-customers";
import type { AdoraStore } from "../adora-stores";
import type { StoreOnboardingStatus } from "../store-status";
import { OnboardingChart } from "./onboarding-chart";
import { StoreProgress } from "./store-progress";

/** Brands with more locations than this open as city groups, so a 300-store chain stays collapsed. */
const GROUP_AT = 12;

export type CustomerStore = AdoraStore & {
  status: StoreOnboardingStatus;
  label: string;
};

function brandSummary(stores: CustomerStore[]) {
  if (stores.length === 0) return "No locations";
  const onboarded = stores.filter((store) => store.status !== "not-started").length;
  return `${onboarded}/${stores.length} onboarded`;
}

function groupByCity(stores: CustomerStore[]) {
  const groups = new Map<string, CustomerStore[]>();
  for (const store of stores) {
    const key = `${store.city}, ${store.state}`;
    const list = groups.get(key) ?? [];
    list.push(store);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
}

function StoreLine({ store }: { store: CustomerStore }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 py-3 whitespace-normal">
      <div className="min-w-0 text-sm">
        <div className="font-medium">{store.street}</div>
        <div className="text-muted-foreground">
          {store.city}, {store.state}
          {store.phone ? ` · ${store.phone}` : ""}
        </div>
      </div>
      <StoreProgress status={store.status} />
      <div className="flex justify-end">
        {store.status === "not-started" && (
          <Link
            href={`/operator/new?customer=${store.customerId}&store=${store.id}`}
            className={buttonVariants({ size: "sm" })}
          >
            <CreditCardIcon data-icon="inline-start" />
            Enroll with Coinflow
          </Link>
        )}
      </div>
    </div>
  );
}

export function CustomersTable({
  customers,
  stores,
}: {
  customers: AdoraCustomer[];
  stores: CustomerStore[];
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openCities, setOpenCities] = useState<Set<string>>(new Set());

  const byCustomer = useMemo(() => {
    const map = new Map<string, CustomerStore[]>();
    for (const store of stores) {
      const list = map.get(store.customerId) ?? [];
      list.push(store);
      map.set(store.customerId, list);
    }
    return map;
  }, [stores]);

  const visible = customers.filter((customer) =>
    customer.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const visibleIds = new Set(visible.map((customer) => customer.id));
  const visibleStores = stores.filter((store) => visibleIds.has(store.customerId));

  const toggleBrand = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
    setOpenCities(new Set());
  };

  const toggleCity = (key: string) => {
    setOpenCities((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <OnboardingChart stores={visibleStores} />
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search customers"
          aria-label="Search customers"
          className="pl-9"
        />
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead className="hidden sm:table-cell">Location</TableHead>
              <TableHead className="text-right">Onboarding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  No customers match that name.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((customer) => {
                const customerStores = byCustomer.get(customer.id) ?? [];
                const count = customerStores.length;
                const open = openId === customer.id;
                const grouped = customerStores.length > GROUP_AT;
                const cities = grouped ? groupByCity(customerStores) : [];
                return (
                  <Fragment key={customer.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          onClick={() => toggleBrand(customer.id)}
                          aria-expanded={open}
                          className="flex items-center gap-2 text-left"
                        >
                          <ChevronRightIcon
                            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
                          />
                          {customer.name}
                        </button>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <MapPinIcon className="size-3.5 text-muted-foreground" />
                          {customer.location.city}, {customer.location.state}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {count} {count === 1 ? "store" : "stores"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {brandSummary(customerStores)}
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow key={`${customer.id}-stores`}>
                        <TableCell colSpan={3} className="bg-muted/40">
                          {customerStores.length === 0 ? (
                            <p className="py-2 text-sm text-muted-foreground">
                              No locations listed for this customer.
                            </p>
                          ) : grouped ? (
                            <div className="flex flex-col">
                              {cities.map(([city, cityStores]) => {
                                const cityKey = `${customer.id}:${city}`;
                                const cityOpen = openCities.has(cityKey);
                                return (
                                  <div key={cityKey} className="border-b border-border/60 last:border-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleCity(cityKey)}
                                      aria-expanded={cityOpen}
                                      className="flex w-full items-center gap-2 py-2 text-left text-sm"
                                    >
                                      <ChevronRightIcon
                                        className={`size-3.5 text-muted-foreground transition-transform ${cityOpen ? "rotate-90" : ""}`}
                                      />
                                      <span className="font-medium">{city}</span>
                                      <span className="text-muted-foreground">
                                        {cityStores.length}{" "}
                                        {cityStores.length === 1 ? "location" : "locations"}
                                      </span>
                                    </button>
                                    {cityOpen && (
                                      <div className="divide-y pl-6">
                                        {cityStores.map((store) => (
                                          <StoreLine key={store.id} store={store} />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="divide-y pl-6">
                              {customerStores.map((store) => (
                                <StoreLine key={store.id} store={store} />
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
