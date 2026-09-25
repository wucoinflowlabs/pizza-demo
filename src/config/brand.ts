// Swap these (plus public/brand/logo.svg and the tokens in globals.css) to rebrand.
export const brand = {
  name: "The Za",
  tagline: "Payments built for pizzerias",
  description:
    "Accept cards, wallets and bank payments, and get paid out fast — all from The Za.",
  logoPath: "/brand/logo.svg",
  supportEmail: "support@theza.example",
  legalName: "The Za, Inc.",
  /** Prepended to every sub-merchant ID, e.g. "theza-tonys-brick-oven". */
  accountIdPrefix: "theza",
} as const;
