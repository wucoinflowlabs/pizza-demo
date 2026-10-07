import type { FormValues } from "@/lib/onboarding-form";

/**
 * Onboarding form field → Persona inquiry template field key. Keys must match
 * the KYB template exactly: the `field` on each input component in the
 * inquiry response. The `persona` SDK kebab-cases keys before sending them
 * (`business_name` → `business-name`); `withPersonaFields` sends them as-is.
 */
export const PERSONA_FIELD_KEYS: Record<string, string> = {
  dba: "business_name",
};

/** Answers we already have, keyed for Persona's `fields` prefill. */
export function personaPrefill(values: FormValues): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [name, key] of Object.entries(PERSONA_FIELD_KEYS)) {
    const value = values[name];
    if (typeof value === "string" && value.trim()) fields[key] = value.trim();
  }
  return fields;
}

/** Appends `fields[key]=value` (URL-encoded) to a hosted Persona link. */
export function withPersonaFields(link: string, fields: Record<string, string>): string {
  try {
    const url = new URL(link);
    for (const [key, value] of Object.entries(fields)) url.searchParams.set(`fields[${key}]`, value);
    return url.toString();
  } catch {
    return link;
  }
}
