import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Product Category Detection ──────────────────────────────────────────
// Helps users understand what product type they're viewing

export type ProductCategory =
  | "Flower"
  | "Pre-Roll"
  | "Cartridge"
  | "Concentrate"
  | "Edible"
  | "Topical"
  | "Other";

export function getProductCategory(name: string): ProductCategory {
  const n = name.toLowerCase();
  if (/pre[-\s]?roll|preroll|\bblunt\b|\bjoint\b/.test(n)) return "Pre-Roll";
  if (/\bcart\b|cartridge|\bvape\b|510|disposable|pod\b/.test(n)) return "Cartridge";
  if (/\bwax\b|\bdab\b|shatter|budder|badder|batter|rosin|resin|distillate|concentrate|extract|hash\b|kief|crumble|diamonds?|sauce|rso|oil\b|tincture|live\s+sugar/.test(n)) return "Concentrate";
  if (/\bgummy|gummies|chocolate|brownie|cookie|candy|edible|drink\b|beverage|soda\b|lozenge|capsule|\btablet\b|syrup|infused\s+(honey|butter|oil)/.test(n)) return "Edible";
  if (/topical|cream\b|lotion|balm|patch\b|salve|gel\b|spray\b/.test(n)) return "Topical";
  return "Flower";
}

export const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Flower: "bg-emerald-500/15 text-emerald-400",
  "Pre-Roll": "bg-orange-500/15 text-orange-400",
  Cartridge: "bg-sky-500/15 text-sky-400",
  Concentrate: "bg-violet-500/15 text-violet-400",
  Edible: "bg-pink-500/15 text-pink-400",
  Topical: "bg-teal-500/15 text-teal-400",
  Other: "bg-zinc-500/15 text-zinc-400",
};

// ── Buy Link Resolution ─────────────────────────────────────────────────
// Prioritizes direct ordering links (Dutchie/Weedmaps menus) over generic websites

export function getBuyLink(
  strain: { ordering_links?: Record<string, string | { dutchie?: string; weedmaps?: string }>; dispensary_links?: Record<string, string> },
  dispensaryName: string
): string | null {
  const ordering = strain.ordering_links?.[dispensaryName];
  if (ordering) {
    if (typeof ordering === "string") return ordering;
    if (ordering.dutchie) return ordering.dutchie;
    if (ordering.weedmaps) return ordering.weedmaps;
  }
  const website = strain.dispensary_links?.[dispensaryName];
  if (website) return website;
  return null;
}
