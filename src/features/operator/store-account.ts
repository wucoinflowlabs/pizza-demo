import { brand } from "@/config/brand";

const MAX_LENGTH = 50;

/** Stable payments account id for one Adora location, so status can be matched later. */
export function storeAccountId(customerId: string, storeId: string): string {
  const id = `${brand.accountIdPrefix}-${customerId}-${storeId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id.slice(0, MAX_LENGTH).replace(/-+$/g, "");
}

export function applicationMatchesStore(
  merchantId: string,
  customerId: string,
  storeId: string,
): boolean {
  const base = storeAccountId(customerId, storeId);
  return merchantId === base || merchantId.startsWith(`${base}-`);
}
