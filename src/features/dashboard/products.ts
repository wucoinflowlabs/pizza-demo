export const MERCHANT_PRODUCTS = [
  {
    slug: "point-of-sale",
    title: "Point of Sale",
    body: "A POS as dynamic as a Friday-night rush. It runs in the browser on whatever hardware is already in the store, so the counter can be tailored to how this pizzeria actually works.",
  },
  {
    slug: "online-ordering",
    title: "Online Ordering",
    body: "Native ordering that acts as its own POS. Tickets go straight to the kitchen, with menu control at the store and across the chain.",
  },
  {
    slug: "kitchen-display",
    title: "Kitchen Display",
    body: "Prep List, Make Line, and Cut & Wrap screens, plus production-time reporting so the kitchen can see what's falling behind.",
  },
  {
    slug: "delivery",
    title: "Delivery",
    body: "Integrated maps with color-coded order timing, routing, and driver regrouping, so dispatch can watch deliveries as they happen.",
  },
  {
    slug: "loyalty",
    title: "Loyalty",
    body: "Rewards points customers can earn and spend at one store or across the chain — extra points for a holiday, a free pie on a birthday.",
  },
] as const;

export type MerchantProduct = (typeof MERCHANT_PRODUCTS)[number];

export function findMerchantProduct(slug: string) {
  return MERCHANT_PRODUCTS.find((product) => product.slug === slug);
}
