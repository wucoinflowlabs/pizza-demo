import { FIELD_DEFINITIONS, FIELD_NAMES } from "./definitions";
import type {
  ConditionalRule,
  FieldDefinition,
  FieldErrors,
  FieldValue,
  FormValues,
  GeoDistributionEntry,
  MoneyAmount,
} from "./types";

// Same semantics as the provider's ZodHelpers.conditionMet for the rules used here.
function conditionMet({
  value,
  rule,
}: {
  value: FieldValue;
  rule: ConditionalRule;
}): boolean {
  if (rule.value === true) return hasValue(value);
  if (typeof value !== "string") return false;
  if (value === rule.value) return true;
  return value.split(",").filter(Boolean).includes(rule.value as string);
}

export function isFieldVisible({
  field,
  values,
}: {
  field: FieldDefinition;
  values: FormValues;
}): boolean {
  if (!field.conditional) return true;
  return conditionMet({ value: values[field.conditional.dependsOn], rule: field.conditional });
}

export function hasValue(value: FieldValue): boolean {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return Number.isFinite(value.amount);
}

export type FormSection = { header?: string; fields: FieldDefinition[] };

export function groupIntoSections(fields: readonly FieldDefinition[]): FormSection[] {
  const sections: FormSection[] = [];
  for (const field of fields) {
    if (field.sectionHeader || sections.length === 0)
      sections.push({ header: field.sectionHeader, fields: [field] });
    else sections[sections.length - 1].fields.push(field);
  }
  return sections;
}

// Provider URL rules: http(s) only, host must contain a dot; bare hosts get https://.
const VALID_HOSTNAME = /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("://")) return trimmed;
  return `https://${trimmed}`;
}

function isValidUrl(raw: string): boolean {
  try {
    const url = new URL(normalizeUrl(raw));
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return VALID_HOSTNAME.test(url.hostname);
  } catch {
    return false;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The provider rejects repeated or sequential digit runs as fake numbers.
function isFakePhoneNumber(digits: string): boolean {
  if (digits.length < 7) return false;
  if (/^(\d)\1+$/.test(digits)) return true;
  for (let i = 0; i <= digits.length - 7; i++) {
    const chunk = digits.slice(i, i + 7);
    if ("01234567890".includes(chunk) || "09876543210".includes(chunk)) return true;
  }
  return false;
}

export function geoTotal(entries: GeoDistributionEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.percentage || 0), 0);
}

function formatError({
  field,
  value,
}: {
  field: FieldDefinition;
  value: FieldValue;
}): string | undefined {
  if (field.type === "email" && typeof value === "string" && !EMAIL.test(value.trim()))
    return "Invalid email address";
  if (field.type === "url" && typeof value === "string" && !isValidUrl(value))
    return "Must be a valid URL";
  if (field.type === "tel" && typeof value === "string") {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 4) return "Phone number must be at least 4 digits";
    if (isFakePhoneNumber(digits)) return "Please enter a valid phone number";
  }
  if (field.type === "money-amount" && value && typeof value === "object" && !Array.isArray(value)) {
    if (value.amount < 0) return "Amount can't be negative";
  }
  if (field.type === "geo-distribution" && Array.isArray(value)) {
    if (Math.abs(geoTotal(value) - 100) >= 0.01) return "Percentages must sum to 100";
  }
  return undefined;
}

/**
 * Validates visible fields. `requireAll` enforces required fields (the final
 * submit); without it only filled-in values are format-checked (drafts,
 * operator prefill).
 */
export function validateForm({
  values,
  fields = FIELD_DEFINITIONS,
  requireAll,
}: {
  values: FormValues;
  fields?: readonly FieldDefinition[];
  requireAll: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    if (!isFieldVisible({ field, values })) continue;
    const value = values[field.name];
    if (!hasValue(value)) {
      if (requireAll && field.required) errors[field.name] = "This field is required";
      continue;
    }
    const error = formatError({ field, value });
    if (error) errors[field.name] = error;
  }
  return errors;
}

function sanitizeValue(value: unknown): FieldValue {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .filter(
        (entry): entry is GeoDistributionEntry =>
          !!entry &&
          typeof entry === "object" &&
          typeof (entry as GeoDistributionEntry).region === "string" &&
          Number.isFinite((entry as GeoDistributionEntry).percentage),
      )
      .map(({ region, percentage }) => ({ region, percentage }));
  }
  if (value && typeof value === "object" && Number.isFinite((value as MoneyAmount).amount))
    return { currency: "usd", amount: (value as MoneyAmount).amount };
  return undefined;
}

/** Keeps only known fields with well-formed values; URLs are normalized. */
export function sanitizeFormValues(input: unknown): FormValues {
  if (!input || typeof input !== "object") return {};
  const source = input as Record<string, unknown>;
  const urlFields = new Set(
    FIELD_DEFINITIONS.filter((field) => field.type === "url").map((field) => field.name),
  );
  const result: FormValues = {};
  for (const name of FIELD_NAMES) {
    const value = sanitizeValue(source[name]);
    if (value === undefined) continue;
    result[name] =
      urlFields.has(name) && typeof value === "string" ? normalizeUrl(value) : value;
  }
  return result;
}

/** Drops empty strings/arrays so drafts don't overwrite stored answers with blanks. */
export function withoutEmptyValues(values: FormValues): FormValues {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => hasValue(value)),
  );
}

export function withoutKey(errors: FieldErrors, name: string): FieldErrors {
  if (!(name in errors)) return errors;
  const next = { ...errors };
  delete next[name];
  return next;
}
