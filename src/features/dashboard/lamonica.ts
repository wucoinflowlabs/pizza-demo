import { findShopBrand } from "@/features/dashboard/shop-logo";
import { ADORA_STORES } from "@/features/operator/adora-stores";
import { storeAccountId } from "@/features/operator/store-account";
import type { MerchantLogin } from "@/lib/merchant-logins";
import { ADORA_PREFILL, businessOverview, type FormValues } from "@/lib/onboarding-form";

/** Login for Lamonica's, shown as Woodstock's. The address can't change: it is the Coinflow user. */
export const LAMONICA_EMAIL = "hello@lamonicasnypizza.com";

/** Shown in the sidebar in place of LAMONICA_EMAIL. */
export const LAMONICA_DISPLAY_EMAIL = "hello@woodstocksdavis.com";

/** What Adora already knows about the Westwood shop, shown in the onboarding form. */
export const LAMONICA_PREFILL: FormValues = {
  ...ADORA_PREFILL,
  dba: "Woodstock's Pizza",
  businessPhoneCountryCode: "+1",
  businessPhoneNumber: "(530) 757-2525",
  businessEmail: LAMONICA_EMAIL,
  billingEmail: LAMONICA_EMAIL,
  whatDoesYourBusinessDo: businessOverview({
    name: "Woodstock's Pizza",
    place: "Davis, CA",
  }),
  websiteUrl: "https://woodstocksdavis.com/",
};

/**
 * Sidebar line for a Lamonica's store login, shown as Woodstock's. Their emails
 * (hello@lamonicasnypizza.com, chris+lamonica-westwood@…) are Coinflow users and
 * can't be renamed, so the store address is shown in their place.
 */
export function lamonicaSidebarSubtitle(login: MerchantLogin): string | undefined {
  if (findShopBrand(login)?.id !== "lamonica") return undefined;
  const store = ADORA_STORES.find(
    (item) =>
      item.customerId === "lamonica" &&
      storeAccountId(item.customerId, item.id) === login.cfSubmerchantId,
  );
  return store ? `${store.street} · ${store.city}, ${store.state}` : LAMONICA_DISPLAY_EMAIL;
}
