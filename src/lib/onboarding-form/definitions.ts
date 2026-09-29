import type { FieldDefinition, FormValues, SelectOption } from "./types";

// Visible questions are the Adora peel-back of Coinflow's legacy v2 form.
// Everything else Coinflow still requires is filled in with HIDDEN_DEFAULTS
// at submit time and never shown to the merchant.

const YES_NO: readonly SelectOption[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

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

const PAYOUT_METHOD_OPTIONS: readonly SelectOption[] = [
  { value: "standard", label: "ACH" },
  { value: "asap", label: "RTP" },
  { value: "card", label: "Push-to-Card" },
  { value: "venmo", label: "Venmo" },
  { value: "paypal", label: "PayPal" },
];

/** Sent on every application and never asked. Fills only keys the merchant left empty. */
export const FIXED_FIELDS = {
  industry: "foodBeverage",
  products: "checkout,userPayouts",
  settlementMethods: "bankAccountSettlement",
  bankSettlementMethods: "ach,wire",
  businessCountryOfIncorporation: "US",
  endUserGeoDistribution: [{ region: "US", percentage: 100 }],
  activeCustomers: "10,000 - 100,000",
  customerSupportMethods: "live",
  payinsAverageTransactionSize: { currency: "usd", amount: 60 },
  payinsMaximumTransactionSize: { currency: "usd", amount: 1_000 },
  payoutsAverageTransactionSize: { currency: "usd", amount: 40 },
  payoutsMaximumTransactionSize: { currency: "usd", amount: 1_000 },
  pciComplianceStatus: "no",
  historicalChargebackRate: "<0.25%",
  averageDollarValueChargeback: "25",
  paymentProcessingAgreementTerminated: "no",
  // Coinflow requires a non-empty string once acceptedPaymentsBefore is yes.
  // Not a file key (those start with merchants/), so review won't try to download it.
  processingStatements: "Collected by Adora",
} satisfies FormValues;

/** Answers Adora already knows. Method checkboxes are intentionally absent. */
export const ADORA_PREFILL: FormValues = {
  acceptedPaymentsBefore: "yes",
  currentRunway: ">18 months/profitable",
  payinsMonthlyVolume: { currency: "usd", amount: 10_000 },
  payoutsMonthlyVolume: { currency: "usd", amount: 10_000 },
  cardNotPresentPercent: "40",
};

/** UI-only. Drives whether the website question is shown, then stripped before Coinflow. */
export const UI_ONLY_FIELDS = ["cardNotPresentPercent"] as const;

/** Also never asked: the testing URL and every policy link are the business's website. */
export const WEBSITE_URL_COPIES = [
  "developmentUrl",
  "privacyPolicyUrl",
  "termsOfServiceUrl",
  "returnPolicyUrl",
] as const;

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
    name: "acceptedPaymentsBefore",
    type: "select",
    label: "Has your business accepted payments before?",
    placeholder: "Select whether your business accepted payments before?",
    required: true,
    audience: "platform",
    sectionHeader: "Historical Payment Information",
    options: YES_NO,
  },
  {
    name: "currentRunway",
    type: "select",
    label: "How many months can your business operate with its current cash balance?",
    placeholder: "Select your current runway",
    required: true,
    audience: "platform",
    options: [
      { label: "< 6 months", value: "< 6 months" },
      { label: "6 - 12 months", value: "6 - 12 months" },
      { label: "13 - 18 months", value: "13 - 18 months" },
      { label: ">18 months/profitable", value: ">18 months/profitable" },
    ],
  },
  {
    name: "payinMethods",
    type: "multiselect",
    label: "Which pay-in methods will you utilize?",
    placeholder: "Select pay-in methods",
    required: true,
    audience: "business",
    sectionHeader: "Pay-in",
    options: PAYIN_METHOD_OPTIONS,
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
  {
    name: "payoutMethods",
    type: "multiselect",
    label: "Which payout methods will you utilize?",
    placeholder: "Select payout methods",
    required: true,
    audience: "business",
    sectionHeader: "Payout",
    options: PAYOUT_METHOD_OPTIONS,
  },
  {
    name: "payoutsMonthlyVolume",
    type: "money-amount",
    label: "Estimated monthly payout volume across end-user payout products",
    placeholder: "Estimated monthly payout volume",
    required: true,
    audience: "platform",
  },
];

/** Stored with the form but never rendered on its own. */
export const HIDDEN_FIELD_NAMES = [
  "businessPhoneCountryCode",
  "whatDoesYourBusinessDo",
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
