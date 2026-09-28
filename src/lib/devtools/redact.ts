const MASK = "••••";
const MAX_DEPTH = 8;
const MAX_SERIALIZED = 20_000;

// Tried in order until the result fits, so big payloads stay readable JSON.
const LIMITS = [
  { maxString: 2_000, maxArray: 50, maxKeys: Infinity },
  { maxString: 300, maxArray: 10, maxKeys: Infinity },
  { maxString: 120, maxArray: 5, maxKeys: 40 },
  { maxString: 80, maxArray: 3, maxKeys: 15 },
];

// Compared against the key lowercased with punctuation stripped.
const EXACT_KEYS = new Set(["tin", "itin", "ein", "dob", "cvv", "cvc", "pin"]);
const PARTIAL_KEYS = [
  "key",
  "token",
  "secret",
  "password",
  "seed",
  "credential",
  "signature",
  "authorization",
  "ssn",
  "taxid",
  "dateofbirth",
  "birthdate",
  "accountnumber",
  "routingnumber",
  "cardnumber",
  "uploadurl",
];

function isSensitive(key: string, value: unknown) {
  // Flags like `disableForgotPassword: true` reveal nothing.
  if (value === null || value === "" || typeof value === "boolean") return false;
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return EXACT_KEYS.has(normalized) || PARTIAL_KEYS.some((part) => normalized.includes(part));
}

type Limits = (typeof LIMITS)[number];

function scrub(value: unknown, depth: number, limits: Limits): unknown {
  if (typeof value === "string")
    return value.length > limits.maxString
      ? `${value.slice(0, limits.maxString)}… (truncated)`
      : value;
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "… (nested too deep)";

  if (Array.isArray(value)) {
    const items = value.slice(0, limits.maxArray).map((item) => scrub(item, depth + 1, limits));
    if (value.length > limits.maxArray) items.push(`… ${value.length - limits.maxArray} more`);
    return items;
  }

  const entries = Object.entries(value);
  const kept = entries.slice(0, limits.maxKeys).map(([key, entry]) => [
    key,
    isSensitive(key, entry) ? MASK : scrub(entry, depth + 1, limits),
  ]);
  if (entries.length > limits.maxKeys)
    kept.push(["…", `${entries.length - limits.maxKeys} more fields`]);
  return Object.fromEntries(kept);
}

/** A copy that is safe to show on screen: secrets masked, size capped. */
export function redact(value: unknown): unknown {
  if (value === undefined) return undefined;
  let serialized = "";
  for (const limits of LIMITS) {
    const scrubbed = scrub(value, 0, limits);
    serialized = JSON.stringify(scrubbed) ?? "";
    if (serialized.length <= MAX_SERIALIZED) return scrubbed;
  }
  return `${serialized.slice(0, MAX_SERIALIZED)}… (truncated, ${serialized.length} chars)`;
}
