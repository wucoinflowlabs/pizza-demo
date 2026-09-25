export type Option<V extends string = string> = {
  value: V;
  label: string;
  description?: string;
};

export const INDUSTRY_OPTIONS = [
  { value: "foodBeverage", label: "Food & Beverage" },
  { value: "retailEcommerce", label: "Retail & E-commerce" },
  { value: "professionalServices", label: "Professional Services" },
  { value: "healthcareWellness", label: "Healthcare & Wellness" },
  { value: "educationTraining", label: "Education & Training" },
  { value: "technologyDigitalServices", label: "Technology & Digital Services" },
  { value: "travelHospitality", label: "Travel & Hospitality" },
  { value: "Sports / Recreation", label: "Sports & Recreation" },
  { value: "nonProfit", label: "Non-profit" },
  { value: "supplements", label: "Supplements" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option[];

export const PAYIN_METHOD_OPTIONS = [
  { value: "card", label: "Credit & debit cards" },
  { value: "applePay", label: "Apple Pay" },
  { value: "googlePay", label: "Google Pay" },
  { value: "ach", label: "US bank transfer (ACH)" },
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
  { value: "cashApp", label: "Cash App" },
  { value: "interac", label: "Interac e-Transfer", description: "Canada" },
  { value: "sepa", label: "SEPA bank transfer", description: "Europe" },
  { value: "fasterPayments", label: "Faster Payments", description: "UK" },
  { value: "pix", label: "PIX", description: "Brazil" },
] as const satisfies readonly Option[];

export const PAYOUT_METHOD_OPTIONS = [
  { value: "standard", label: "Bank payout (ACH)", description: "US, 1–3 days" },
  { value: "asap", label: "Instant bank payout", description: "US, real-time" },
  { value: "card", label: "Push to debit card", description: "Instant" },
  { value: "wire", label: "US domestic wire" },
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
  { value: "iban", label: "SEPA & UK Faster Payments", description: "Europe & UK" },
  { value: "eft", label: "EFT", description: "Canada" },
  { value: "interac", label: "Interac", description: "Canada" },
  { value: "pix", label: "PIX", description: "Brazil" },
  { value: "swift", label: "International wire (SWIFT)" },
] as const satisfies readonly Option[];

export const JURISDICTION_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "UK", label: "United Kingdom" },
  { value: "EU", label: "European Union" },
  { value: "Latin America", label: "Latin America" },
  { value: "Brazil", label: "Brazil" },
  { value: "Australia", label: "Australia" },
  { value: "Asia", label: "Asia" },
  { value: "Middle East", label: "Middle East" },
  { value: "Africa", label: "Africa" },
] as const satisfies readonly Option[];

type Values<T extends readonly Option[]> = T[number]["value"];

export type Industry = Values<typeof INDUSTRY_OPTIONS>;
export type PayinMethod = Values<typeof PAYIN_METHOD_OPTIONS>;
export type PayoutMethod = Values<typeof PAYOUT_METHOD_OPTIONS>;
export type Jurisdiction = Values<typeof JURISDICTION_OPTIONS>;

export function valuesOf<T extends readonly Option[]>(options: T) {
  return options.map((option) => option.value) as [Values<T>, ...Values<T>[]];
}

export function labelFor({
  options,
  value,
}: {
  options: readonly Option[];
  value: string;
}): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
