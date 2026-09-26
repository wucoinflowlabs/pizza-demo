// Swap these (plus the files in public/brand/ and the tokens in globals.css) to rebrand.
export const brand = {
  name: "Adora × Coinflow",
  description:
    "Adora runs the point of sale, online ordering, kitchen and delivery for the country's best pizzerias. With Coinflow, Adora Payments adds card, wallet and bank acceptance with fast payouts — right inside the platform.",
  logos: {
    adora: "/brand/adora-mark.png",
    coinflow: "/brand/coinflow-logo.png",
  },
  legalName: "Adora × Coinflow",
  /** Prepended to every sub-merchant ID, e.g. "adora-tonys-brick-oven". */
  accountIdPrefix: "adora",
} as const;
