import { brand } from "@/config/brand";
import { shopDemoEmail } from "@/features/operator/adora-stores";

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

export function storeApplicationKey(customerId: string, storeId: string): string {
  return `${customerId}:${storeId}`;
}

/**
 * Ties each payments account to one location. The store id on the account wins.
 * An account created under a different id is still tied to the location by the
 * plus-address generated for that store.
 */
export function indexApplicationsByStore<T extends { merchantId: string; email?: string }>(
  applications: T[],
  stores: { customerId: string; id: string }[],
): Map<string, T> {
  const byStore = new Map<string, T>();
  const used = new Set<string>();

  for (const store of stores) {
    const match = applications.find(
      (application) =>
        !used.has(application.merchantId) &&
        applicationMatchesStore(application.merchantId, store.customerId, store.id),
    );
    if (!match) continue;
    used.add(match.merchantId);
    byStore.set(storeApplicationKey(store.customerId, store.id), match);
  }

  for (const store of stores) {
    const key = storeApplicationKey(store.customerId, store.id);
    if (byStore.has(key)) continue;
    const email = shopDemoEmail(store.customerId, store.id);
    const match = applications.find((application) => {
      if (used.has(application.merchantId)) return false;
      return application.email?.trim().toLowerCase() === email;
    });
    if (!match) continue;
    used.add(match.merchantId);
    byStore.set(key, match);
  }

  return byStore;
}
