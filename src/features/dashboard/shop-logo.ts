import { ADORA_CUSTOMERS, type AdoraCustomer } from "@/features/operator/adora-customers";

const EXTRA_LOGOS: Record<string, string> = {
  "lamonica's ny pizza": "/shops/lamonicas.png",
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
    ADORA_CUSTOMERS.find((customer) => customer.logo === EXTRA_LOGOS[key])
  );
}

/** Logo for a signed-in shop. */
export function shopLogo(shop: {
  name?: string | null;
  email?: string | null;
}): string | undefined {
  return findShopBrand(shop)?.logo ?? EXTRA_LOGOS[shop.name?.trim().toLowerCase() ?? ""];
}
