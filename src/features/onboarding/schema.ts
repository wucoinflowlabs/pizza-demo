import { z } from "zod";
import {
  INDUSTRY_OPTIONS,
  JURISDICTION_OPTIONS,
  PAYIN_METHOD_OPTIONS,
  PAYOUT_METHOD_OPTIONS,
  valuesOf,
} from "./options";

// Mirrors the provider's URL rules: http(s) only, and the host needs a dot.
const VALID_HOSTNAME = /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("://")) return trimmed;
  return `https://${trimmed}`;
}

export function isValidUrl(raw: string): boolean {
  try {
    const url = new URL(normalizeUrl(raw));
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return VALID_HOSTNAME.test(url.hostname);
  } catch {
    return false;
  }
}

const URL_MESSAGE = "Enter a valid web address, like thezapizza.com";

const requiredUrl = (message: string) =>
  z.string().trim().min(1, message).refine(isValidUrl, URL_MESSAGE);

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => !value || isValidUrl(value), URL_MESSAGE);

const email = (message: string) =>
  z.string().trim().min(1, message).pipe(z.email("Enter a valid email address"));

// The provider rejects repeated or sequential digit runs as fake numbers.
function isFakePhoneNumber(digits: string): boolean {
  if (digits.length < 7) return false;
  if (/^(\d)\1+$/.test(digits)) return true;
  for (let i = 0; i <= digits.length - 7; i++) {
    const chunk = digits.slice(i, i + 7);
    if ("01234567890".includes(chunk) || "09876543210".includes(chunk))
      return true;
  }
  return false;
}

export const accountSchema = z.object({
  email: email("Email is required"),
  dba: z.string().trim().min(1, "Business name is required").max(100),
  industry: z.enum(valuesOf(INDUSTRY_OPTIONS), "Choose an industry"),
});

export const contactSchema = z
  .object({
    businessEmail: email("Business email is required"),
    businessPhoneCountryCode: z
      .string()
      .trim()
      .regex(/^\+\d{1,4}$/, "Use a code like +1"),
    businessPhoneNumber: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .refine(
        (value) => value.replace(/\D/g, "").length >= 7,
        "Enter a full phone number",
      )
      .refine(
        (value) => !isFakePhoneNumber(value.replace(/\D/g, "")),
        "Enter a real phone number",
      ),
    billingEmailSameAsBusinessEmail: z.boolean(),
    billingEmail: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (values.billingEmailSameAsBusinessEmail) return;
    if (z.email().safeParse(values.billingEmail).success) return;
    ctx.addIssue({
      code: "custom",
      path: ["billingEmail"],
      message: values.billingEmail
        ? "Enter a valid email address"
        : "Billing email is required",
    });
  });

export const MAX_WEBSITE_URLS = 5;

export const onlinePresenceSchema = z.object({
  websiteUrls: z
    .array(z.object({ value: requiredUrl("Website is required") }))
    .min(1, "Add at least one website")
    .max(MAX_WEBSITE_URLS, `Add up to ${MAX_WEBSITE_URLS} websites`),
  privacyPolicyUrl: requiredUrl("Privacy policy link is required"),
  termsOfServiceUrl: requiredUrl("Terms of service link is required"),
  returnPolicyUrl: optionalUrl,
});

export const paymentsSchema = z.object({
  payinMethods: z
    .array(z.enum(valuesOf(PAYIN_METHOD_OPTIONS)))
    .min(1, "Choose at least one way for customers to pay"),
  payoutMethods: z
    .array(z.enum(valuesOf(PAYOUT_METHOD_OPTIONS)))
    .min(1, "Choose at least one way to get paid"),
  endUserJurisdictions: z
    .array(z.enum(valuesOf(JURISDICTION_OPTIONS)))
    .min(1, "Choose at least one region"),
});

export const applicationSchema = z.object({
  account: accountSchema,
  contact: contactSchema,
  onlinePresence: onlinePresenceSchema,
  payments: paymentsSchema,
});

export type AccountValues = z.infer<typeof accountSchema>;
export type ContactValues = z.infer<typeof contactSchema>;
export type OnlinePresenceValues = z.infer<typeof onlinePresenceSchema>;
export type PaymentsValues = z.infer<typeof paymentsSchema>;
export type ApplicationValues = z.infer<typeof applicationSchema>;
