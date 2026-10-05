import "server-only";
import { cache } from "react";
import { findAdoraCustomer, type AdoraCustomer } from "@/features/operator/adora-customers";
import { ADORA_STORES } from "@/features/operator/adora-stores";
import { indexApplicationsByStore, storeApplicationKey } from "@/features/operator/store-account";
import { listSubmerchants } from "@/lib/payments/submerchants";
import { getCurrentFranchiseId } from "@/lib/session";

/** One restaurant under a franchise. Coinflow only knows it as a flat sub-merchant under Adora. */
export type FranchiseLocation = {
  /** Adora's store id, e.g. WESTWOOD. */
  id: string;
  label: string;
  city: string;
  state: string;
  /** Null until the location has a Coinflow account. */
  submerchantId: string | null;
};

export type EnrolledLocation = FranchiseLocation & { submerchantId: string };

export type SessionFranchise = {
  customer: AdoraCustomer;
  locations: FranchiseLocation[];
};

type ListedSubmerchant = { merchantId: string; users?: { email?: string }[] };

/**
 * The signed-in franchise owner and every location under their brand.
 * Coinflow has no nested sub-merchants, so each location's account is matched
 * the same way the operator console matches stores. Cached per request so the
 * layout and page share one lookup.
 */
export const getSessionFranchise = cache(async (): Promise<SessionFranchise | undefined> => {
  const customer = findAdoraCustomer(await getCurrentFranchiseId());
  if (!customer) return undefined;

  const stores = ADORA_STORES.filter((store) => store.customerId === customer.id);
  const listed = (await listSubmerchants({ limit: 100 })) as unknown as ListedSubmerchant[];
  const byStore = indexApplicationsByStore(
    listed.map((row) => ({ merchantId: row.merchantId, email: row.users?.[0]?.email })),
    stores,
  );

  return {
    customer,
    locations: stores.map((store) => ({
      id: store.id,
      label: store.street,
      city: store.city,
      state: store.state,
      submerchantId: byStore.get(storeApplicationKey(store.customerId, store.id))?.merchantId ?? null,
    })),
  };
});

export function enrolledLocations(locations: FranchiseLocation[]): EnrolledLocation[] {
  return locations.filter((location): location is EnrolledLocation => location.submerchantId !== null);
}

/** The enrolled location named by `?location=`, or undefined for all locations. */
export function parseLocation(value: unknown, locations: FranchiseLocation[]) {
  return enrolledLocations(locations).find((location) => location.id === value);
}

/** "3 locations", for the sidebar and home card. */
export function franchiseSummary({ locations }: SessionFranchise) {
  return `${locations.length} ${locations.length === 1 ? "location" : "locations"}`;
}
