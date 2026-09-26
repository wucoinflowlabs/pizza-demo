"use client";

import { useState } from "react";
import { FileTextIcon, StoreIcon } from "lucide-react";
import { cn } from "cn";
import type { AdoraCustomer } from "../adora-customers";
import { ApplicationsTable, type ListedApplication } from "./applications-table";
import { CustomersTable, type CustomerStore } from "./customers-table";

const VIEWS = [
  {
    id: "customers",
    label: "Adora customers",
    icon: StoreIcon,
    description:
      "Restaurants running on Adora. Enable payment processing to move them onto Adora Payments.",
  },
  {
    id: "applications",
    label: "Coinflow applications",
    icon: FileTextIcon,
    description: "Search a store to see where it is in Coinflow onboarding.",
  },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function OperatorConsole({
  customers,
  stores,
  applications,
}: {
  customers: AdoraCustomer[];
  stores: CustomerStore[];
  applications: ListedApplication[];
}) {
  const [view, setView] = useState<ViewId>("customers");
  const current = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Operator views"
          className="inline-grid w-max max-w-full grid-flow-col auto-cols-fr self-start rounded-full bg-adora-surface p-1 ring-1 ring-adora-navy/10"
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none col-start-1 row-start-1 rounded-full bg-adora-navy shadow-[0_8px_16px_-10px_rgba(13,61,133,0.9)] transition-[translate] duration-300 ease-out",
              view === "applications" && "translate-x-full",
            )}
          />
          {VIEWS.map((item, index) => {
            const selected = item.id === view;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`operator-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`operator-panel-${item.id}`}
                onClick={() => setView(item.id)}
                className={cn(
                  "relative z-10 row-start-1 inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adora-blue focus-visible:ring-offset-2 sm:px-4",
                  index === 0 ? "col-start-1" : "col-start-2",
                  selected
                    ? "text-white"
                    : "text-muted-foreground hover:text-adora-navy",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{current.label}</h1>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>
      </div>
      <div
        role="tabpanel"
        id={`operator-panel-${view}`}
        aria-labelledby={`operator-tab-${view}`}
      >
        {view === "customers" ? (
          <CustomersTable customers={customers} stores={stores} />
        ) : (
          <ApplicationsTable applications={applications} />
        )}
      </div>
    </div>
  );
}
