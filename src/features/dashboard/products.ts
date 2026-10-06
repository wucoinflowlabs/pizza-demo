export const MERCHANT_PRODUCTS = [
  {
    slug: "online-ordering",
    title: "Online Ordering",
    summary: "Tickets from the web land in the kitchen as their own POS.",
    body: "Native ordering that acts as its own POS. Tickets go straight to the kitchen, with menu control at the store and across the chain.",
  },
] as const;

export function findMerchantProduct(slug: string) {
  return MERCHANT_PRODUCTS.find((product) => product.slug === slug);
}
