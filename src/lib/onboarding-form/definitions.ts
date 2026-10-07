import type { FieldDefinition, FormValues, SelectOption } from "./types";

// SDD (Simplified Due Diligence) onboarding — the lightweight schema Coinflow
// uses for ISV sub-merchants. Visible questions stay minimal; every other
// SDD-required field is filled in from FIXED_FIELDS / ADORA_PREFILL and
// never shown to the merchant.

export const REGION_OPTIONS: readonly SelectOption[] = [
  "US",
  "EU",
  "UK",
  "Canada",
  "Latin America",
  "Brazil",
  "Australia",
  "Asia",
  "Middle East",
  "Africa",
].map((region) => ({ label: region, value: region }));

const PAYIN_METHOD_OPTIONS: readonly SelectOption[] = [
  { value: "card", label: "Credit & Debit" },
  { value: "applePay", label: "Apple Pay" },
  { value: "googlePay", label: "Google Pay" },
  { value: "cashApp", label: "Cash App" },
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
];

/** Sent on every application and never asked. Fills only keys the merchant left empty. */
export const FIXED_FIELDS = {
  industry: "foodBeverage",
  payinsAverageTransactionSize: { currency: "usd", amount: 60 },
  payinsMaximumTransactionSize: { currency: "usd", amount: 1_000 },
} satisfies FormValues;

/** Answers Adora already knows. Every pay-in method starts checked. */
export const ADORA_PREFILL: FormValues = {
  currentRunway: ">18 months/profitable",
  payinsMonthlyVolume: { currency: "usd", amount: 10_000 },
  cardNotPresentPercent: "40",
  payinMethods: PAYIN_METHOD_OPTIONS.map((option) => option.value).join(","),
};

/** UI-only. Drives whether the website question is shown, then stripped before Coinflow. */
export const UI_ONLY_FIELDS = ["cardNotPresentPercent"] as const;

/** The business website doubles as the dev URL and the checkout URL for SDD. */
export const WEBSITE_URL_COPIES = ["developmentUrl", "checkoutUrl"] as const;

export function businessOverview({ name, place }: { name: string; place: string }): string {
  return `${name}, based in ${place}, runs on Adora. Guests order in the store and through Adora online ordering.`;
}

export const FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  {
    name: "dba",
    type: "text",
    label: "DBA (or business legal name)",
    placeholder: "Enter your Doing Business as Name if you have one",
    required: true,
    audience: "platform",
    sectionHeader: "Business Information",
  },
  {
    name: "businessPhoneNumber",
    type: "tel",
    label: "Business Phone Number",
    placeholder: "(555) 555-5555",
    required: true,
    audience: "platform",
    countryCodeField: "businessPhoneCountryCode",
  },
  {
    name: "businessEmail",
    type: "email",
    label: "Business Email",
    placeholder: "contact@yourbusiness.com",
    required: true,
    audience: "platform",
  },
  {
    name: "billingEmail",
    type: "email",
    label: "Billing Email",
    placeholder: "billing@yourbusiness.com",
    required: false,
    audience: "platform",
    sameAsField: {
      field: "businessEmail",
      label: "My Billing Email is the same as my Business Email",
    },
  },
  {
    name: "payinsMonthlyVolume",
    type: "money-amount",
    label: "Estimated monthly pay-in volume across all pay-in products",
    placeholder: "Estimated monthly pay-in volume",
    required: true,
    audience: "platform",
  },
  {
    name: "cardNotPresentPercent",
    type: "percent",
    label: "What percentage of your volume will be card-not-present?",
    placeholder: "0–100",
    required: true,
    audience: "platform",
  },
  {
    name: "websiteUrl",
    type: "url",
    label: "Website URL",
    placeholder: "Enter your website URL",
    required: true,
    audience: "platform",
    sectionHeader: "Production Website URLs",
    conditional: { dependsOn: "cardNotPresentPercent", value: 0, compare: "gt" },
  },
];

/** Stored with the form but never rendered on its own. */
export const HIDDEN_FIELD_NAMES = [
  "businessPhoneCountryCode",
  "whatDoesYourBusinessDo",
  // Submitted with every form as a pre-checked value from ADORA_PREFILL,
  // never rendered as a UI control for the merchant to toggle.
  "payinMethods",
  "currentRunway",
  ...Object.keys(FIXED_FIELDS),
  ...WEBSITE_URL_COPIES,
] as const;

export const FIELD_NAMES: readonly string[] = [
  ...FIELD_DEFINITIONS.map((field) => field.name),
  ...HIDDEN_FIELD_NAMES,
];

export const PLATFORM_FIELDS = FIELD_DEFINITIONS.filter(
  (field) => field.audience === "platform",
);
