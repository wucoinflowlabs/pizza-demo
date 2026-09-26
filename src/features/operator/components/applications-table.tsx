"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApplicationSummary } from "../actions";
import { storeOnboardingStatus } from "../store-status";
import { InviteActions } from "./invite-actions";
import { StoreProgress } from "./store-progress";

export type ListedApplication = ApplicationSummary & {
  store?: {
    name: string;
    street: string;
    city: string;
    state: string;
    phone: string | null;
  };
};

function matchesQuery(application: ListedApplication, query: string) {
  const store = application.store;
  const haystack = [
    store?.name,
    store?.street,
    store?.city,
    store?.state,
    store?.phone,
    application.merchantId,
    application.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function ApplicationsTable({ applications }: { applications: ListedApplication[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? applications.filter((application) => matchesQuery(application, needle))
    : applications;

  if (!applications.length)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted-foreground">
            No applications yet. Enable payment processing from Adora customers to start one.
          </p>
        </CardContent>
      </Card>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search stores"
          aria-label="Search stores"
          className="pl-9"
        />
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead className="text-right">Invite</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  No stores match that search.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((application) => {
                const status = storeOnboardingStatus(application);
                const store = application.store;
                const place = store
                  ? `${store.street}, ${store.city}, ${store.state}`
                  : undefined;
                return (
                  <TableRow key={application.merchantId}>
                    <TableCell>
                      <div className="font-medium">{store?.name ?? application.merchantId}</div>
                      <div className="text-xs text-muted-foreground">
                        {place ?? application.email}
                      </div>
                      {place && (
                        <div className="text-xs text-muted-foreground">{application.email}</div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <StoreProgress status={status} />
                    </TableCell>
                    <TableCell>
                      <InviteActions merchantId={application.merchantId} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
