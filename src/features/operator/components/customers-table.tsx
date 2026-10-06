"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  ChevronRightIcon,
  CreditCardIcon,
  Loader2Icon,
  LogInIcon,
  MapPinIcon,
  SearchIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { signInAsFranchise, signInAsStore } from "../actions";
import type { AdoraStore } from "../adora-stores";
import {
  revealApproval,
  storeOnboardingLabel,
  type OnboardingCompletedAt,
  type StoreOnboardingStatus,
} from "../store-status";
import { OnboardingChart } from "./onboarding-chart";
import { StoreProgress, useApprovalClock } from "./store-progress";

export type CustomerStore = AdoraStore & {
  status: StoreOnboardingStatus;
  label: string;
  completedAt: OnboardingCompletedAt;
  /** Coinflow account for this store, once onboarding has started. */
  merchantId: string | null;
};

function brandSummary(stores: CustomerStore[]) {
  if (stores.length === 0) return "No locations";
  const onboarded = stores.filter((store) => store.status === "approved").length;
  return `${onboarded}/${stores.length} onboarded`;
}

function SignInButton({ primary, label = "Sign in as restaurant" }: { primary: boolean; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={primary ? "default" : "outline"} disabled={pending}>
      {pending ? (
        <Loader2Icon data-icon="inline-start" className="animate-spin" />
      ) : (
        <LogInIcon data-icon="inline-start" />
      )}
      {label}
    </Button>
  );
}

function SignInAsStore({ store }: { store: CustomerStore }) {
  return (
    <form action={signInAsStore}>
      <input type="hidden" name="customerId" value={store.customerId} />
      <input type="hidden" name="storeId" value={store.id} />
      {store.merchantId && <input type="hidden" name="merchantId" value={store.merchantId} />}
      <SignInButton primary={store.status !== "not-started"} />
    </form>
  );
}

function SignInAsFranchise({ customerId }: { customerId: string }) {
  return (
    <form action={signInAsFranchise}>
      <input type="hidden" name="customerId" value={customerId} />
      <SignInButton primary={false} label="Sign in as franchise owner" />
    </form>
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
      <StoreProgress status={store.status} completedAt={store.completedAt} />
      <div className="flex flex-wrap justify-end gap-2">
        <SignInAsStore store={store} />
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The open brand lives in the URL so a hard refresh (and the sweep's
  // router.refresh) keeps whatever the operator was looking at expanded.
  const openId = searchParams.get("brand");
  const now = useApprovalClock(stores.map((store) => store.completedAt.approved));
  const liveStores = useMemo(
    () =>
      stores.map((store) => {
        const status = revealApproval(store.status, store.completedAt, now);
        return { ...store, status, label: storeOnboardingLabel(status) };
      }),
    [stores, now],
  );

  const byCustomer = useMemo(() => {
    const map = new Map<string, CustomerStore[]>();
    for (const store of liveStores) {
      const list = map.get(store.customerId) ?? [];
      list.push(store);
      map.set(store.customerId, list);
    }
    return map;
  }, [liveStores]);

  const visible = customers.filter((customer) =>
    customer.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const visibleIds = new Set(visible.map((customer) => customer.id));
  const visibleStores = liveStores.filter((store) => visibleIds.has(store.customerId));

  const toggleBrand = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams);
      if (openId === id) params.delete("brand");
      else params.set("brand", id);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [openId, pathname, router, searchParams],
  );

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
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          {brandSummary(customerStores)}
                          {count > 1 && <SignInAsFranchise customerId={customer.id} />}
                        </div>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow key={`${customer.id}-stores`}>
                        <TableCell colSpan={3} className="bg-muted/40">
                          {customerStores.length === 0 ? (
                            <p className="py-2 text-sm text-muted-foreground">
                              No locations listed for this customer.
                            </p>
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
