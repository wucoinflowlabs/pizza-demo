import "server-only";
import { randomBytes } from "node:crypto";
import { brand } from "@/config/brand";

// Provider rule: 3–50 chars of [a-zA-Z0-9-], unique across all merchants, never renamable.
const MAX_LENGTH = 50;
const NUMBERED_ATTEMPTS = 5;
const RANDOM_SUFFIX_LENGTH = 6;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomSuffix(): string {
  return Array.from(
    randomBytes(RANDOM_SUFFIX_LENGTH),
    (byte) => ALPHABET[byte % ALPHABET.length],
  ).join("");
}

/**
 * IDs to try in order: "theza-tonys-brick-oven", then "-2" … "-5", then a
 * random suffix as a last resort.
 */
export function accountIdCandidates(businessName: string): string[] {
  const reserved = 1 + RANDOM_SUFFIX_LENGTH;
  const slug =
    slugify(businessName)
      .slice(0, MAX_LENGTH - brand.accountIdPrefix.length - 1 - reserved)
      .replace(/-+$/, "") || "business";
  const base = `${brand.accountIdPrefix}-${slug}`;

  return [
    base,
    ...Array.from({ length: NUMBERED_ATTEMPTS - 1 }, (_, i) => `${base}-${i + 2}`),
    `${base}-${randomSuffix()}`,
  ];
}
