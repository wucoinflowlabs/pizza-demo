import type { FormValues } from "@/lib/onboarding-form";

/** An existing Adora POS customer. Static list: these aren't payments accounts until onboarded. */
export type AdoraCustomer = {
  id: string;
  name: string;
  location: { city: string; state: string };
  phone?: string;
  websiteUrl?: string;
  logo: string;
};

// The brands Adora features on adorapos.com. The demo inbox is used because
// those pages don't publish a business email. A specific store replaces this
// with its own plus-address.
const DEMO_EMAIL = "chris@coinflowlabs.app";

export const ADORA_CUSTOMERS: AdoraCustomer[] = [
  {
    id: "mmp",
    name: "Mountain Mike's Pizza",
    location: { city: "San Jose", state: "CA" },
    phone: "(669) 499-4800",
    websiteUrl: "https://mountainmikespizza.com/",
    logo: "/shops/mountain-mikes.png",
  },
  {
    id: "marcos",
    name: "Marco's Pizza",
    location: { city: "Toledo", state: "OH" },
    websiteUrl: "https://marcos.com/",
    logo: "/shops/marcos.png",
  },
  {
    id: "romeos",
    name: "Romeo's Pizza",
    location: { city: "Columbus", state: "OH" },
    phone: "(614) 869-3200",
    logo: "/shops/romeos.png",
  },
  {
    id: "pizzaguys",
    name: "Pizza Guys",
    location: { city: "Sacramento", state: "CA" },
    phone: "(916) 419-6666",
    websiteUrl: "https://pizzaguys.com/",
    logo: "/shops/pizza-guys.png",
  },
  {
    id: "woodstocks",
    name: "Woodstock's Pizza",
    location: { city: "San Diego", state: "CA" },
    phone: "(619) 265-0999",
    websiteUrl: "https://woodstocksca.com/",
    logo: "/shops/woodstocks.png",
  },
  {
    id: "pizzamyheart",
    name: "Pizza My Heart",
    location: { city: "San Jose", state: "CA" },
    phone: "(408) 226-9100",
    logo: "/shops/pizza-my-heart.png",
  },
  {
    id: "freshbrothers",
    name: "Fresh Brothers",
    location: { city: "Los Angeles", state: "CA" },
    phone: "(323) 831-0100",
    websiteUrl: "https://freshbrothers.com/",
    logo: "/shops/fresh-brothers.png",
  },
  {
    id: "toppers",
    name: "Toppers Pizza",
    location: { city: "Oxnard", state: "CA" },
    phone: "(805) 385-4444",
    logo: "/shops/toppers.png",
  },
];

export function findAdoraCustomer(id: string | string[] | undefined) {
  return typeof id === "string" ? ADORA_CUSTOMERS.find((customer) => customer.id === id) : undefined;
}

/** Brand-level answers, used when onboarding isn't tied to one location. */
export function customerPrefill(customer: AdoraCustomer): FormValues {
  const place = `${customer.location.city}, ${customer.location.state}`;
  return {
    dba: customer.name,
    businessPhoneCountryCode: "+1",
    ...(customer.phone ? { businessPhoneNumber: customer.phone } : {}),
    businessEmail: DEMO_EMAIL,
    billingEmail: DEMO_EMAIL,
    whatDoesYourBusinessDo: `${customer.name}, based in ${place}, runs on Adora. Guests order in the store and through Adora online ordering.`,
    ...(customer.websiteUrl ? { websiteUrl: customer.websiteUrl } : {}),
  };
}
