import type { FormValues } from "@/lib/onboarding-form";

/** Login for Lamonica's. This address is not a sub-merchant until they submit Adora Pay. */
export const LAMONICA_EMAIL = "hello@lamonicasnypizza.com";

/** What Adora already knows about the Westwood shop, shown in the onboarding form. */
export const LAMONICA_PREFILL: FormValues = {
  dba: "Lamonica's NY Pizza",
  businessPhoneCountryCode: "+1",
  businessPhoneNumber: "(310) 208-8671",
  businessEmail: LAMONICA_EMAIL,
  billingEmail: LAMONICA_EMAIL,
  whatDoesYourBusinessDo:
    "Westwood pizzeria at 1066 Gayley Ave, Los Angeles, serving New York slices since 1980. Dough is made in Brooklyn with New York City tap water. Guests order in the shop and for delivery through Adora.",
  websiteUrl: "https://lamonicasnypizza.com/",
  acceptedPaymentsBefore: "yes",
  currentRunway: ">18 months/profitable",
  historicalChargebackRate: "<0.25%",
  averageDollarValueChargeback: "25",
  paymentProcessingAgreementTerminated: "no",
};
