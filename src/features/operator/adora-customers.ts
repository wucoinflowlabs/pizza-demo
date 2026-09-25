import type { FormValues } from "@/lib/onboarding-form";

export type AdoraProduct = "POS" | "Online Ordering" | "KDS" | "Delivery" | "Loyalty";

/** An existing Adora POS customer. Mock data: these aren't payments accounts until onboarded. */
export type AdoraCustomer = {
  id: string;
  name: string;
  location: { city: string; state: string; stores: number };
  products: AdoraProduct[];
  /** What Adora already knows, used to prefill the onboarding form. */
  prefill: FormValues;
};

export const ADORA_CUSTOMERS: AdoraCustomer[] = [
  {
    id: "giordanos",
    name: "Giordano's",
    location: { city: "Chicago", state: "IL", stores: 12 },
    products: ["POS", "Online Ordering", "KDS", "Delivery"],
    prefill: {
      dba: "Giordano's Pizza",
      businessPhoneCountryCode: "+1",
      businessPhoneNumber: "(312) 555-0147",
      businessEmail: "chris@coinflowlabs.app",
      billingEmail: "chris@coinflowlabs.app",
      whatDoesYourBusinessDo:
        "Chicago stuffed deep dish pizza for dine-in, pickup and delivery. Customers order in store and through Adora online ordering.",
      websiteUrl: "https://giordanos.com/",
    },
  },
  {
    id: "lou-malnatis",
    name: "Lou Malnati's",
    location: { city: "Northbrook", state: "IL", stores: 8 },
    products: ["POS", "Online Ordering", "KDS", "Loyalty"],
    prefill: {
      dba: "Lou Malnati's Pizzeria",
      businessPhoneCountryCode: "+1",
      businessPhoneNumber: "(847) 555-0182",
      businessEmail: "chris@coinflowlabs.app",
      billingEmail: "chris@coinflowlabs.app",
      whatDoesYourBusinessDo:
        "Chicago deep dish pizza with a buttercrust, served for dine-in, carryout and delivery. Customers order in store and through Adora online ordering.",
      websiteUrl: "https://www.loumalnatis.com/",
    },
  },
];

export function findAdoraCustomer(id: string | string[] | undefined) {
  return typeof id === "string" ? ADORA_CUSTOMERS.find((customer) => customer.id === id) : undefined;
}
