import type { FieldDefinition, FormValues, SelectOption } from "./types";

// Mirrors the provider's LEGACY v2 onboarding form (labels, order, sections
// and show/hide rules). Deliberate differences: crypto and third-party-branded
// payment options are omitted, provider names are reworded, and answers that
// are the same for every pizzeria are hardcoded in FIXED_FIELDS instead of asked.

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

/** Always sent and never asked: the same for every pizzeria on The Za. */
export const FIXED_FIELDS = {
  settlementMethods: "bankAccountSettlement",
  industry: "foodBeverage",
  products: "checkout,userPayouts",
  bankSettlementMethods: "ach",
  businessCountryOfIncorporation: "US",
  endUserGeoDistribution: [{ region: "US", percentage: 100 }],
  activeCustomers: "<10,000",
  customerSupportMethods: "live",
  payinMethods: "card,googlePay,applePay,venmo,paypal,cashApp",
  payinsMonthlyVolume: { currency: "usd", amount: 10_000 },
  payinsAverageTransactionSize: { currency: "usd", amount: 60 },
  payinsMaximumTransactionSize: { currency: "usd", amount: 5_000 },
  // Venmo, PayPal, push to card, ACH and RTP.
  payoutMethods: "venmo,paypal,card,standard,asap",
  payoutsMonthlyVolume: { currency: "usd", amount: 10_000 },
  payoutsAverageTransactionSize: { currency: "usd", amount: 60 },
  payoutsMaximumTransactionSize: { currency: "usd", amount: 5_000 },
} satisfies FormValues;

/** Also never asked: the testing URL and every policy link are the business's website. */
export const WEBSITE_URL_COPIES = [
  "developmentUrl",
  "privacyPolicyUrl",
  "termsOfServiceUrl",
  "returnPolicyUrl",
] as const;

const chainedUrls = ({
  prefix,
  firstName,
  firstLabel,
  nextLabel,
  placeholder,
  sectionHeader,
  firstRequired,
}: {
  prefix: string;
  firstName: string;
  firstLabel: string;
  nextLabel: string;
  placeholder: string;
  sectionHeader: string;
  firstRequired: boolean;
}): FieldDefinition[] => {
  const names = [firstName, `${prefix}2`, `${prefix}3`, `${prefix}4`, `${prefix}5`];
  return names.map((name, index) => ({
    name,
    type: "url",
    label: index === 0 ? firstLabel : nextLabel,
    placeholder,
    required: index === 0 && firstRequired,
    audience: "platform",
    sectionHeader: index === 0 ? sectionHeader : undefined,
    conditional: index === 0 ? undefined : { dependsOn: names[index - 1], value: true },
  }));
};

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
    required: true,
    audience: "platform",
    sameAsField: {
      field: "businessEmail",
      label: "My Billing Email is the same as my Business Email",
    },
  },
  {
    name: "whatDoesYourBusinessDo",
    type: "textarea",
    label: "Business Overview",
    placeholder:
      "Please provide an overview of what your business does, and describe the products or services your business will be accepting payments for.",
    required: true,
    audience: "platform",
  },
  ...chainedUrls({
    prefix: "websiteUrl",
    firstName: "websiteUrl",
    firstLabel: "Website URL",
    nextLabel: "Additional Website URL (If available)",
    placeholder: "Enter your website URL",
    sectionHeader: "Production Website URLs",
    firstRequired: true,
  }),
  {
    name: "acceptedPaymentsBefore",
    type: "select",
    label: "Has your business accepted payments before?",
    placeholder: "Select whether your business accepted payments before?",
    required: true,
    audience: "business",
    sectionHeader: "Historical Payment Information",
    options: YES_NO,
  },
  {
    name: "processingStatements",
    type: "file",
    label:
      "Please upload 3 or more months of recent processing statements. These statements should include total dollar amount and count of card transactions, refunds, and chargebacks.",
    placeholder:
      "Upload your business processing statements, including transaction volumes, chargeback rates, and dispute resolutions",
    required: true,
    audience: "business",
    accept: ".pdf,.png,.jpg,.jpeg,.docx,.csv,.xlsx",
    maxSizeMb: 5,
    conditional: { dependsOn: "acceptedPaymentsBefore", value: "yes" },
  },
  {
    name: "currentRunway",
    type: "select",
    label: "How many months can your business operate with its current cash balance?",
    placeholder: "Select your current runway",
    required: true,
    audience: "business",
    options: [
      { label: "< 6 months", value: "< 6 months" },
      { label: "6 - 12 months", value: "6 - 12 months" },
      { label: "13 - 18 months", value: "13 - 18 months" },
      { label: ">18 months/profitable", value: ">18 months/profitable" },
    ],
  },
  {
    name: "historicalChargebackRate",
    type: "select",
    label: "What is your historical chargeback rate?",
    placeholder: "Select your historical chargeback rate",
    required: true,
    audience: "business",
    options: [
      { label: "<0.25%", value: "<0.25%" },
      { label: "0.25% - 0.5%", value: " 0.25% - 0.5%" },
      { label: "0.51% - 0.9%", value: "0.51% - 0.9%" },
      { label: ">0.9%", value: ">0.9%" },
    ],
    conditional: { dependsOn: "acceptedPaymentsBefore", value: "yes" },
  },
  {
    name: "averageDollarValueChargeback",
    type: "textarea",
    label: "What is the average value (USD) of your historical disputes?",
    placeholder:
      "This would be on average the disputed amount for an individual dispute. For example if you have 100 disputes for a total of $10,000 your average dispute amount is $10,000/100 = $100",
    required: true,
    audience: "business",
    conditional: { dependsOn: "acceptedPaymentsBefore", value: "yes" },
  },
  {
    name: "paymentProcessingAgreementTerminated",
    type: "select",
    label:
      "Have the merchant owners or principals ever had a payment processing agreement terminated?",
    placeholder:
      "Select if the merchant owners or principals ever had a payment processing agreement terminated",
    required: true,
    audience: "business",
    options: YES_NO,
    conditional: { dependsOn: "acceptedPaymentsBefore", value: "yes" },
  },
  {
    name: "terminationDate",
    type: "date",
    label: "Date of termination",
    placeholder: "Select the date of termination",
    required: true,
    audience: "business",
    conditional: { dependsOn: "paymentProcessingAgreementTerminated", value: "yes" },
  },
  {
    name: "terminationReason",
    type: "textarea",
    label: "Reason for termination",
    placeholder: "Please describe the reason for termination",
    required: true,
    audience: "business",
    conditional: { dependsOn: "paymentProcessingAgreementTerminated", value: "yes" },
  },
  {
    name: "bankStatements",
    type: "file",
    label: "Bank Statements",
    placeholder:
      "Please provide 3 or more months of recent Bank Statements. If you have multiple bank accounts, please provide the account(s) that show the majority of your Cash and/or Cash Equivalents Balance. If Bank Statements are not available for your business yet, please provide a Confirmation Letter from your bank.",
    required: false,
    audience: "business",
    sectionHeader: "Financial Documentation",
    accept: ".pdf,.png,.jpg,.jpeg,.docx,.csv",
    maxSizeMb: 10,
  },
  {
    name: "pciComplianceStatus",
    type: "select",
    label: "Enable Server-to-Server Tokenization (PCI Compliant Merchants)",
    placeholder: "Select Yes or No",
    required: false,
    audience: "business",
    sectionHeader: "PCI Compliance",
    tip: "Server-to-server tokenization lets you send raw card data directly to our API. This requires PCI DSS Level 1 or 2 compliance — you'll need to upload your current AOC for verification.",
    options: YES_NO,
  },
  {
    name: "pciComplianceAocFile",
    type: "file",
    label:
      "Upload your PCI AOC (Attestation of Compliance). This document must be signed off by a PCI Qualified Security Assessor (QSA).",
    placeholder: "Upload your PCI AOC document",
    required: true,
    audience: "business",
    accept: ".pdf,.png,.jpg,.jpeg,.docx",
    maxSizeMb: 10,
    conditional: { dependsOn: "pciComplianceStatus", value: "yes" },
  },
];

/** Stored alongside a `tel` field but never rendered on its own. */
export const HIDDEN_FIELD_NAMES = ["businessPhoneCountryCode"] as const;

export const FIELD_NAMES: readonly string[] = [
  ...FIELD_DEFINITIONS.map((field) => field.name),
  ...HIDDEN_FIELD_NAMES,
];

export const PLATFORM_FIELDS = FIELD_DEFINITIONS.filter(
  (field) => field.audience === "platform",
);
