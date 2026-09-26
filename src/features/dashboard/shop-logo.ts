import { ADORA_CUSTOMERS } from "@/features/operator/adora-customers";

const EXTRA_LOGOS: Record<string, string> = {
  "lamonica's ny pizza": "/shops/lamonicas.png",
};

/** Logo for a signed-in shop. Store logins carry the brand in the plus-address. */
export function shopLogo({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}): string | undefined {
  const slug = email?.toLowerCase().match(/\+([a-z0-9]+)-/)?.[1];
  const fromSlug = slug
    ? ADORA_CUSTOMERS.find((customer) => customer.id === slug)?.logo
    : undefined;
  if (fromSlug) return fromSlug;

  const key = name?.trim().toLowerCase();
  if (!key) return undefined;
  return (
    ADORA_CUSTOMERS.find((customer) => customer.name.toLowerCase() === key)?.logo ??
    EXTRA_LOGOS[key]
  );
}
