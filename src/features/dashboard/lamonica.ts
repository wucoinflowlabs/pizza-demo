import { ADORA_PREFILL, businessOverview, type FormValues } from "@/lib/onboarding-form";

/** Login for Lamonica's. This address is not a sub-merchant until they submit Adora Pay. */
export const LAMONICA_EMAIL = "hello@lamonicasnypizza.com";

/** What Adora already knows about the Westwood shop, shown in the onboarding form. */
export const LAMONICA_PREFILL: FormValues = {
  ...ADORA_PREFILL,
  dba: "Lamonica's NY Pizza",
  businessPhoneCountryCode: "+1",
  businessPhoneNumber: "(310) 208-8671",
  businessEmail: LAMONICA_EMAIL,
  billingEmail: LAMONICA_EMAIL,
  whatDoesYourBusinessDo: businessOverview({
    name: "Lamonica's NY Pizza",
    place: "Los Angeles, CA",
  }),
  websiteUrl: "https://lamonicasnypizza.com/",
};
