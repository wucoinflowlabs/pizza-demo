import { ADORA_CUSTOMERS, type AdoraCustomer } from "@/features/operator/adora-customers";

/**
 * Store names saved before a brand was renamed. Supabase still holds
 * "Lamonica's NY Pizza" for the Westwood login; it now displays as Woodstock's.
 */
const LEGACY_NAMES: Record<string, string> = {
  "lamonica's ny pizza": "lamonica",
};

/** Store logins carry the brand in the plus-address: chris+mmp-kjt3q@… */
const BRAND_FROM_EMAIL = /\+([a-z0-9]+)-/;

export function findShopBrand({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}): AdoraCustomer | undefined {
  const slug = email?.toLowerCase().match(BRAND_FROM_EMAIL)?.[1];
  const fromSlug = slug ? ADORA_CUSTOMERS.find((customer) => customer.id === slug) : undefined;
  if (fromSlug) return fromSlug;

  const key = name?.trim().toLowerCase();
  if (!key) return undefined;
  return (
    ADORA_CUSTOMERS.find((customer) => customer.name.toLowerCase() === key) ??
    ADORA_CUSTOMERS.find((customer) => customer.id === LEGACY_NAMES[key])
  );
}

/** Logo for a signed-in shop. */
export function shopLogo(shop: {
  name?: string | null;
  email?: string | null;
}): string | undefined {
  return findShopBrand(shop)?.logo;
}

/** Name to show for a signed-in shop. A renamed brand shows its current name, not the stored one. */
export function displayShopName(shop: { name?: string | null; email?: string | null }): string | null {
  const key = shop.name?.trim().toLowerCase();
  if (key && LEGACY_NAMES[key]) return findShopBrand(shop)?.name ?? shop.name ?? null;
  return shop.name ?? null;
}
