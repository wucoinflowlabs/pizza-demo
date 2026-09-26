import type { FormValues } from "@/lib/onboarding-form";
import { customerPrefill, type AdoraCustomer } from "./adora-customers";
import stores from "./adora-stores.json";

/** One restaurant location on Adora. Static data: not a payments account until onboarded. */
export type AdoraStore = {
  id: string;
  customerId: string;
  street: string;
  city: string;
  state: string;
  phone: string | null;
};

export const ADORA_STORES = stores as AdoraStore[];

export function findAdoraStore(customerId: string, storeId: string | string[] | undefined) {
  if (typeof storeId !== "string") return undefined;
  return ADORA_STORES.find((store) => store.customerId === customerId && store.id === storeId);
}

/** Same slug rules as a payments account id: lowercase, and only letters, numbers, and hyphens. */
function emailSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** These brands use the wu inbox. Everyone else stays on chris@. */
const WU_INBOX_CUSTOMERS = new Set([
  "pizzaguys",
  "woodstocks",
  "pizzamyheart",
  "freshbrothers",
  "toppers",
]);

/** Inbox for one location. Mountain Mike's KJT3Q is chris+mmp-kjt3q@coinflowlabs.app. Pizza Guys KLGQM is wu+pizzaguys-klgqm@coinflowlabs.app. */
export function shopDemoEmail(customerId: string, storeId: string): string {
  const local = WU_INBOX_CUSTOMERS.has(customerId) ? "wu" : "chris";
  return `${local}+${emailSlug(customerId)}-${emailSlug(storeId)}@coinflowlabs.app`;
}

export function storePrefill(customer: AdoraCustomer, store: AdoraStore): FormValues {
  const place = `${store.street}, ${store.city}, ${store.state}`;
  const email = shopDemoEmail(customer.id, store.id);
  return {
    ...customerPrefill(customer),
    businessEmail: email,
    billingEmail: email,
    ...(store.phone ? { businessPhoneNumber: store.phone } : {}),
    whatDoesYourBusinessDo: `${customer.name} at ${place}. Guests order in the store and through Adora online ordering.`,
  };
}
