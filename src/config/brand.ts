// Swap these (plus the files in public/brand/ and the tokens in globals.css) to rebrand.
export const brand = {
  name: "Adora × Coinflow",
  tagline: "The pizza POS, now with payments built in",
  description:
    "Adora runs the point of sale, online ordering, kitchen and delivery for the country's best pizzerias. With Coinflow, Adora Payments adds card, wallet and bank acceptance with fast payouts — right inside the platform.",
  logos: {
    adora: "/brand/adora-mark.png",
    /** Drop the official file here; the lockup falls back to a text wordmark until it exists. */
    coinflow: "/brand/coinflow-logo.svg",
  },
  supportEmail: "payments@adora.example",
  legalName: "Adora × Coinflow",
  /** Prepended to every sub-merchant ID, e.g. "adora-tonys-brick-oven". */
  accountIdPrefix: "adora",
} as const;
