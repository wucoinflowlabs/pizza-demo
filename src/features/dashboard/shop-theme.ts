import type { CSSProperties } from "react";
import { findShopBrand } from "@/features/dashboard/shop-logo";

/** Colors sampled from a shop logo. `ink` and `accent` stay dark enough for text. */
export type ShopTheme = {
  /** Large fills: hero, active nav, panels. */
  fill: string;
  /** Headings, white buttons, and primary actions. */
  ink: string;
  /** Small accents and the payments nav item. */
  accent: string;
  /** Soft glow on filled surfaces. */
  highlight: string;
  /** Sidebar and page wash. */
  surface: string;
  /** Text and icons that sit on `fill`. */
  onFill: string;
  /** Drop shadow on the home card. Defaults to `ink`. */
  shadow?: string;
  /** Soft wash in the top-right of the home card. Defaults to `accent`. */
  glow?: string;
  /** Home-card side panel. Defaults to a bright white card. */
  panel?: string;
  panelHover?: string;
};

/** Warm neutral, used when a login isn't one of the logo brands. */
export const DEFAULT_SHOP_THEME: ShopTheme = {
  fill: "#3E3832",
  ink: "#3E3832",
  accent: "#9A4E24",
  highlight: "#E7B089",
  surface: "#F7F3EE",
  onFill: "#FFFFFF",
};

const THEMES: Record<string, ShopTheme> = {
  lamonica: {
    fill: "#F0A020",
    ink: "#181848",
    accent: "#181848",
    highlight: "#FFE08A",
    surface: "#FFF6E2",
    onFill: "#181848",
    shadow: "transparent",
    glow: "#FFE08A",
  },
  mmp: {
    fill: "#0E5A42",
    ink: "#0C4E3A",
    accent: "#B02020",
    highlight: "#E8C547",
    surface: "#F0F6F3",
    onFill: "#FFFFFF",
  },
  marcos: {
    fill: "#D00020",
    ink: "#A80018",
    accent: "#8A6500",
    highlight: "#F0B010",
    surface: "#FFF3F1",
    onFill: "#FFFFFF",
  },
  romeos: {
    fill: "#2E7A48",
    ink: "#1E5C34",
    accent: "#C01020",
    highlight: "#F0C84A",
    surface: "#F2F7F3",
    onFill: "#FFFFFF",
  },
  pizzaguys: {
    fill: "#1A1A1A",
    ink: "#1A1A1A",
    accent: "#C02828",
    highlight: "#109848",
    surface: "#F4F4F4",
    onFill: "#FFFFFF",
  },
  woodstocks: {
    fill: "#F09A0A",
    ink: "#503818",
    accent: "#503818",
    highlight: "#F0D040",
    surface: "#FFF5E6",
    onFill: "#503818",
  },
  pizzamyheart: {
    fill: "#8E1A28",
    ink: "#8E1A28",
    accent: "#1A1A1A",
    highlight: "#E08A90",
    surface: "#FBF3F4",
    onFill: "#FFFFFF",
  },
  freshbrothers: {
    fill: "#F0C820",
    ink: "#A81218",
    accent: "#A81218",
    highlight: "#5C8A38",
    surface: "#FFFBE8",
    onFill: "#8E1020",
  },
  toppers: {
    fill: "#E01010",
    ink: "#B00C0C",
    accent: "#146B38",
    highlight: "#F2D06B",
    surface: "#FFF4F2",
    onFill: "#FFFFFF",
  },
};

export function shopTheme(shop: {
  name?: string | null;
  email?: string | null;
}): ShopTheme {
  const brand = findShopBrand(shop);
  return (brand && THEMES[brand.id]) || DEFAULT_SHOP_THEME;
}

export function shopThemeStyle(theme: ShopTheme): CSSProperties {
  return {
    "--shop-fill": theme.fill,
    "--shop-ink": theme.ink,
    "--shop-accent": theme.accent,
    "--shop-highlight": theme.highlight,
    "--shop-surface": theme.surface,
    "--shop-on-fill": theme.onFill,
    "--shop-shadow": theme.shadow ?? theme.ink,
    "--shop-glow": theme.glow ?? theme.accent,
    "--shop-panel": theme.panel ?? "#ffffff",
    "--shop-panel-hover": theme.panelHover ?? "#ffffff",
    "--primary": theme.ink,
    "--primary-foreground": "#ffffff",
    "--ring": theme.accent,
  } as CSSProperties;
}
