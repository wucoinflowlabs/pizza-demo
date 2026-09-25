import type { FieldDefinition, SelectOption } from "./types";

// Mirrors the provider's LEGACY v2 onboarding form (labels, order, sections
// and show/hide rules) for the industries this app supports. Deliberate
// differences: crypto and third-party-branded payment options are omitted,
// settlement is always to a bank account, and provider names are reworded.

export const SUPPORTED_INDUSTRY_OPTIONS: readonly SelectOption[] = [
  { label: "Education & Training", value: "educationTraining" },
  { label: "Food & Beverage", value: "foodBeverage" },
  { label: "Healthcare & Wellness", value: "healthcareWellness" },
  { label: "Non-Profit", value: "nonProfit" },
  { label: "Professional Services", value: "professionalServices" },
  { label: "Technology & Digital Services", value: "technologyDigitalServices" },
  { label: "Travel & Hospitality", value: "travelHospitality" },
  { label: "Other", value: "other" },
];

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
  { value: "card", label: "Credit & Debit Cards" },
  { value: "applePay", label: "Apple Pay" },
  { value: "googlePay", label: "Google Pay" },
  { value: "ach", label: "ACH (Automated Clearing House) - US Bank Pay-In" },
  { value: "fasterPayments", label: "UK Faster Payments - UK Bank Pay-In" },
  { value: "sepa", label: "SEPA (Single Euro Payments Area) - Euro Bank Pay-In" },
  { value: "pix", label: "PIX - Brazil Bank Pay-In" },
  { value: "cashApp", label: "Pay with CashApp" },
  { value: "interac", label: "Interac e-Transfer - Canada Bank Pay-In" },
  { value: "paypal", label: "Pay with PayPal" },
  { value: "venmo", label: "Pay with Venmo" },
];

const PAYOUT_METHOD_OPTIONS: readonly SelectOption[] = [
  { value: "standard", label: "ACH (Automated Clearing House) - US Bank Pay-Outs" },
  { value: "asap", label: "RTP (Real-Time Payments) - Instant US Bank Pay-Outs" },
  {
    value: "iban",
    label:
      "SEPA (Single Euro Payments Area) & UK Faster Payments - Euro Bank Pay-Outs & Instant UK Bank Pay-Outs",
  },
  { value: "eft", label: "EFT (Electronic Funds Transfer) - Canada Bank Pay-Outs" },
  { value: "pix", label: "PIX - Instant Brazil Bank Pay-Outs" },
  { value: "card", label: "Push to Card - Instant Debit Card Pay-Outs" },
  { value: "venmo", label: "Venmo - Venmo Account Pay-Outs" },
  { value: "paypal", label: "PayPal - PayPal Account Pay-Outs" },
  { value: "wire", label: "US Domestic Wire Transfers" },
  { value: "interac", label: "Interac - Canadian Interac Account Pay-Outs" },
  { value: "swift", label: "SWIFT - International Wire Pay-Outs" },
];

/** Always sent: this app only offers settlement to a bank account. */
export const FIXED_FIELDS = { settlementMethods: "bankAccountSettlement" } as const;

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

const money = ({
  name,
  label,
  placeholder,
  product,
}: {
  name: string;
  label: string;
  placeholder: string;
  product: "checkout" | "userPayouts";
}): FieldDefinition => ({
  name,
  type: "money-amount",
  label,
  placeholder,
  required: true,
  audience: "platform",
  conditional: { dependsOn: "products", value: product },
});

export const FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  {
    name: "industry",
    type: "select",
    label: "Industry",
    placeholder: "Select your industry",
    required: true,
    audience: "platform",
    options: SUPPORTED_INDUSTRY_OPTIONS,
  },
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
  ...chainedUrls({
    prefix: "developmentUrl",
    firstName: "developmentUrl",
    firstLabel: "Development URL for Testing",
    nextLabel: "Additional Development URL (If available)",
    placeholder: "Enter your Development URL for testing",
    sectionHeader: "Development Website URLs",
    firstRequired: false,
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
    name: "products",
    type: "multiselect",
    label: "Which products will you utilize?",
    placeholder: "Select your products",
    required: true,
    audience: "platform",
    sectionHeader: "Product Selections",
    options: [
      { label: '"Checkout" product ("Pay-Ins")', value: "checkout" },
      { label: '"Withdrawals" product ("Pay-outs") to end users', value: "userPayouts" },
    ],
  },
  {
    name: "bankSettlementMethods",
    type: "multiselect",
    label: "Which Bank Settlement Methods will you utilize?",
    placeholder: "Select your bank settlement methods",
    required: true,
    audience: "platform",
    sectionHeader: "Settlement Selections",
    options: [
      { label: "ACH", value: "ach" },
      { label: "Wire", value: "wire" },
      { label: "SEPA", value: "sepa" },
      { label: "UK Faster Payments", value: "ukFasterPayments" },
      { label: "PIX", value: "pix" },
    ],
  },
  {
    name: "payinMethods",
    type: "multiselect",
    label: "Which Pay In Methods will you utilize?",
    placeholder: "Select the Payment Methods you want to enable for your customers",
    required: true,
    audience: "platform",
    options: PAYIN_METHOD_OPTIONS,
    conditional: { dependsOn: "products", value: "checkout" },
  },
  money({
    name: "payinsMonthlyVolume",
    label: "Estimated monthly Pay-Ins Volume (in USD) across all Pay-In products",
    placeholder: "Estimated monthly Pay-Ins Volume (in USD) across all Pay-In products",
    product: "checkout",
  }),
  money({
    name: "payinsAverageTransactionSize",
    label: "Pay-Ins Average Transaction Size (In USD)",
    placeholder: "Enter average Pay-Ins transaction size in USD",
    product: "checkout",
  }),
  money({
    name: "payinsMaximumTransactionSize",
    label: "Pay-Ins Maximum Transaction Size (In USD)",
    placeholder: "Enter maximum Pay-Ins transaction size in USD",
    product: "checkout",
  }),
  {
    name: "payoutMethods",
    type: "multiselect",
    label: "Which pay-out Methods will you utilize?",
    placeholder: "Select the Pay-Out Methods you want to enable for your customers",
    required: true,
    audience: "platform",
    options: PAYOUT_METHOD_OPTIONS,
    conditional: { dependsOn: "products", value: "userPayouts" },
  },
  money({
    name: "payoutsMonthlyVolume",
    label:
      "Estimated monthly Pay-Outs Volume (in USD) across all end-user Pay-Outs products",
    placeholder: "Enter monthly Pay-Outs volume in USD",
    product: "userPayouts",
  }),
  money({
    name: "payoutsAverageTransactionSize",
    label: "Pay-Outs Average Transaction Size (In USD)",
    placeholder: "Enter average Pay-Outs transaction size in USD",
    product: "userPayouts",
  }),
  money({
    name: "payoutsMaximumTransactionSize",
    label: "Pay-Outs Maximum Transaction Size (In USD)",
    placeholder: "Enter maximum Pay-Outs transaction size in USD",
    product: "userPayouts",
  }),
  {
    name: "businessCountryOfIncorporation",
    type: "select",
    label: "Where is your business incorporated?",
    placeholder: "Select where your business is incorporated",
    required: true,
    audience: "platform",
    sectionHeader: "User Location Information",
    options: REGION_OPTIONS,
  },
  {
    name: "endUserGeoDistribution",
    type: "geo-distribution",
    label: "Describe the geographical distribution of your customers",
    placeholder: "What percentage of your users are in each jurisdiction?",
    required: true,
    audience: "platform",
  },
  {
    name: "activeCustomers",
    type: "select",
    label: "How many active customers do you currently serve?",
    placeholder: "Select the number of active customers",
    required: true,
    audience: "platform",
    options: [
      { label: "<10,000", value: "<10,000" },
      { label: "10,000 - 100,000", value: "10,000 - 100,000" },
      { label: ">100,000", value: ">100,000" },
    ],
  },
  {
    name: "customerSupportMethods",
    type: "multiselect",
    label: "What type of customer support is available for your customers?",
    placeholder: "Select your customer support methods",
    required: true,
    audience: "platform",
    sectionHeader: "User Support Information",
    options: [
      { label: "Live Support", value: "live" },
      { label: "Chatbot", value: "chatbot" },
      { label: "Email", value: "email" },
      { label: "Other", value: "other" },
    ],
  },
  {
    name: "privacyPolicyUrl",
    type: "url",
    label: "Please add a link to your Privacy Policy",
    placeholder: "Link to your Privacy Policy",
    required: true,
    audience: "platform",
  },
  {
    name: "termsOfServiceUrl",
    type: "url",
    label: "Please add a link to your Terms of Service",
    placeholder: "Link to your Terms of Service",
    required: true,
    audience: "platform",
  },
  {
    name: "returnPolicyUrl",
    type: "url",
    label: "Please add a link to your Return Policy",
    placeholder: "Link to your Return Policy",
    required: false,
    audience: "platform",
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
