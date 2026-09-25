import "server-only";
import { randomBytes } from "node:crypto";

const MAX_LENGTH = 50;
const SUFFIX_LENGTH = 6;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(): string {
  return Array.from(
    randomBytes(SUFFIX_LENGTH),
    (byte) => ALPHABET[byte % ALPHABET.length],
  ).join("");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** e.g. "Joe's Pizza" → "joes-pizza-a8k2m1". 3–50 chars of [a-z0-9-]. */
export function generateAccountId(businessName: string): string {
  const maxSlugLength = MAX_LENGTH - SUFFIX_LENGTH - 1;
  const slug =
    slugify(businessName).slice(0, maxSlugLength).replace(/-+$/, "") ||
    "business";
  return `${slug}-${randomSuffix()}`;
}
