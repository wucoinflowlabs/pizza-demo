export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "tel"
  | "date"
  | "select"
  | "multiselect"
  | "file"
  | "money-amount"
  | "geo-distribution";

export type SelectOption = { label: string; value: string };

export type ConditionalRule = {
  dependsOn: string;
  /** `true` means "has any value"; a string matches exactly or inside a comma-joined multiselect. */
  value: string | boolean;
};

/** Who is expected to answer: The Za (prefilled for the business) or the business itself. */
export type FieldAudience = "platform" | "business";

export type FieldDefinition = {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  audience: FieldAudience;
  sectionHeader?: string;
  options?: readonly SelectOption[];
  conditional?: ConditionalRule;
  tip?: string;
  accept?: string;
  maxSizeMb?: number;
  /** For `tel`: the field holding the dialing code. */
  countryCodeField?: string;
  /** For emails that can mirror another field, e.g. billing = business email. */
  sameAsField?: { field: string; label: string };
};

export type MoneyAmount = { currency: "usd"; amount: number };
export type GeoDistributionEntry = { region: string; percentage: number };

export type FieldValue = string | MoneyAmount | GeoDistributionEntry[] | undefined;
export type FormValues = Record<string, FieldValue>;
export type FieldErrors = Record<string, string>;
