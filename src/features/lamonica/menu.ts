export const LAMONICA_MERCHANT_ID = "adora-lamonica-westwood";

export type LamonicaCoinflowEnv = "sandbox" | "prod" | "staging";

export const SHOP = {
  name: "Lamonica's NY Pizza",
  phone: "(310) 208-8671",
  phoneHref: "tel:+13102088671",
  address: "1066 Gayley Avenue",
  city: "Los Angeles, CA 90024",
  email: "hello@lamonicasnypizza.com",
  hours: "Open daily, 11am – 2am",
} as const;

export const TAX_RATE = 0.095;

export type MenuSection = "Campus favorites" | "Slices" | "Pies" | "Sides" | "Drinks";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  section: MenuSection;
  /** Shown struck through when this item is priced below its parts. */
  compareAtCents?: number;
};

export const MENU_SECTIONS: MenuSection[] = ["Campus favorites", "Slices", "Pies", "Sides", "Drinks"];

export const MENU: MenuItem[] = [
  {
    id: "combo-game-day",
    name: "Big Ten Combo",
    description: "Eight Clap pie, Pauley knots, and four fountain sodas. Packed for the couch before kickoff.",
    priceCents: 4600,
    compareAtCents: 5200,
    section: "Campus favorites",
  },
  {
    id: "slice-bruin",
    name: "Bruin slice",
    description: "Pepperoni, hot honey, and a rim that stays crisp on the walk down Gayley.",
    priceCents: 625,
    section: "Campus favorites",
  },
  {
    id: "pie-eight-clap",
    name: "Eight Clap pie",
    description: "Pepperoni, fennel sausage, and mushrooms. Eight slices, named for the chant.",
    priceCents: 3200,
    section: "Campus favorites",
  },
  {
    id: "knots-pauley",
    name: "Pauley knots",
    description: "The garlic knots, extra butter, for the crowd leaving the arena.",
    priceCents: 800,
    section: "Campus favorites",
  },
  {
    id: "slice-cheese",
    name: "Cheese slice",
    description: "A wide fold, a little flop, and a blistered rim.",
    priceCents: 450,
    section: "Slices",
  },
  {
    id: "slice-pepperoni",
    name: "Pepperoni slice",
    description: "Cupped pepperoni and a slick of oil on the cheese.",
    priceCents: 525,
    section: "Slices",
  },
  {
    id: "slice-grandma",
    name: "Grandma slice",
    description: "Square, thick, and sauce-forward, cut from the sheet pan.",
    priceCents: 575,
    section: "Slices",
  },
  {
    id: "slice-white",
    name: "White slice",
    description: "Ricotta, mozzarella, garlic, and a pinch of black pepper.",
    priceCents: 550,
    section: "Slices",
  },
  {
    id: "pie-cheese",
    name: "Cheese pie",
    description: "An 18-inch round. Eight slices, one box.",
    priceCents: 2200,
    section: "Pies",
  },
  {
    id: "pie-pepperoni",
    name: "Pepperoni pie",
    description: "The cheese pie, covered edge to edge.",
    priceCents: 2600,
    section: "Pies",
  },
  {
    id: "pie-sausage",
    name: "Sausage & peppers pie",
    description: "Fennel sausage and roasted peppers on the regular pie.",
    priceCents: 2800,
    section: "Pies",
  },
  {
    id: "pie-grandma",
    name: "Grandma pie",
    description: "The sheet-pan square, cut into twelve.",
    priceCents: 2700,
    section: "Pies",
  },
  {
    id: "pie-white",
    name: "White pie",
    description: "No red sauce. Ricotta, mozzarella, and garlic.",
    priceCents: 2600,
    section: "Pies",
  },
  {
    id: "knots",
    name: "Garlic knots",
    description: "Six knots, tossed in garlic butter and parsley.",
    priceCents: 700,
    section: "Sides",
  },
  {
    id: "salad",
    name: "House salad",
    description: "Romaine, tomato, red onion, and a sharp vinaigrette.",
    priceCents: 1100,
    section: "Sides",
  },
  {
    id: "cannoli",
    name: "Cannoli",
    description: "A shell filled when you order, so it stays crisp.",
    priceCents: 500,
    section: "Sides",
  },
  {
    id: "soda",
    name: "Fountain soda",
    description: "Coke, Diet Coke, Sprite, or ginger ale.",
    priceCents: 300,
    section: "Drinks",
  },
  {
    id: "pellegrino",
    name: "San Pellegrino",
    description: "A cold can, 11 ounces.",
    priceCents: 400,
    section: "Drinks",
  },
];

const MENU_BY_ID = new Map(MENU.map((item) => [item.id, item]));

export function findMenuItem(id: string) {
  return MENU_BY_ID.get(id);
}

export function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function orderTotals(lines: { id: string; qty: number }[]) {
  const subtotalCents = lines.reduce((sum, line) => {
    const item = findMenuItem(line.id);
    return item ? sum + item.priceCents * line.qty : sum;
  }, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
