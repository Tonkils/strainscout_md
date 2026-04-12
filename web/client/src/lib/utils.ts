import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Product Category Detection ──────────────────────────────────────────

export type ProductCategory =
  | "Flower"
  | "Pre-Roll"
  | "Vape"
  | "Concentrate"
  | "Edible"
  | "Other";

export function getProductCategory(name: string): ProductCategory {
  const n = name.toLowerCase();
  if (/pre[-\s]?roll|preroll|\bblunt\b|\bjoint\b/.test(n)) return "Pre-Roll";
  if (/\bcart\b|cartridge|\bvape\b|510|disposable|pod\b/.test(n)) return "Vape";
  if (/\bwax\b|\bdab\b|shatter|budder|badder|batter|rosin|resin|distillate|concentrate|extract|hash\b|kief|crumble|diamonds?|sauce|rso|oil\b|tincture|live\s+sugar|stiiizy|stizzy/.test(n)) return "Concentrate";
  if (/\bgummy|gummies|chocolate|brownie|cookie|candy|edible|drink\b|beverage|soda\b|lozenge|capsule|\btablet\b|syrup|infused\s+(honey|butter|oil)/.test(n)) return "Edible";
  if (/topical|cream\b|lotion|balm|patch\b|salve|gel\b|spray\b/.test(n)) return "Other";
  return "Flower";
}

export const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Flower: "bg-emerald-500/15 text-emerald-400",
  "Pre-Roll": "bg-orange-500/15 text-orange-400",
  Vape: "bg-sky-500/15 text-sky-400",
  Concentrate: "bg-violet-500/15 text-violet-400",
  Edible: "bg-pink-500/15 text-pink-400",
  Other: "bg-zinc-500/15 text-zinc-400",
};

export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  Flower: "Leaf",
  "Pre-Roll": "Cigarette",
  Vape: "Wind",
  Concentrate: "Droplets",
  Edible: "Cookie",
  Other: "Package",
};

// ── Product Metadata Extraction ─────────────────────────────────────────
// Parses weight, quantity, sub-type, and freshness from product name + data

export function extractWeight(name: string): string | null {
  const n = name.toLowerCase();
  // Match patterns like "3.5g", "1g", "0.5g", "1/8", "1/4", "1/2 oz", "14g", "28g"
  const gMatch = n.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (gMatch) return `${gMatch[1]}g`;
  const ozMatch = n.match(/(\d+(?:\.\d+)?)\s*oz\b/);
  if (ozMatch) return `${ozMatch[1]}oz`;
  if (/\b(?:1\/8|eighth)\b/.test(n)) return "3.5g";
  if (/\b(?:1\/4|quarter)\b/.test(n)) return "7g";
  if (/\bhalf\s*(?:oz|ounce)\b|1\/2\s*oz/.test(n)) return "14g";
  if (/\b(?:full\s*)?(?:oz|ounce)\b/.test(n)) return "28g";
  return null;
}

export function extractQuantity(name: string): string | null {
  const n = name.toLowerCase();
  const packMatch = n.match(/(\d+)\s*(?:pack|pk|ct|count|pc|piece)/);
  if (packMatch) return packMatch[1];
  const xMatch = n.match(/(\d+)\s*x\s/);
  if (xMatch) return xMatch[1];
  return null;
}

export function extractConcentrateType(name: string): string | null {
  const n = name.toLowerCase();
  if (/stiiizy|stizzy/.test(n)) return "Stiiizy";
  if (/\bpod\b/.test(n)) return "Pod";
  if (/disposable/.test(n)) return "Disposable";
  if (/shatter/.test(n)) return "Shatter";
  if (/\bwax\b/.test(n)) return "Wax";
  if (/budder|badder|batter/.test(n)) return "Budder";
  if (/rosin/.test(n)) return "Rosin";
  if (/resin/.test(n)) return "Live Resin";
  if (/diamonds?/.test(n)) return "Diamonds";
  if (/sauce/.test(n)) return "Sauce";
  if (/crumble/.test(n)) return "Crumble";
  if (/distillate/.test(n)) return "Distillate";
  if (/rso/.test(n)) return "RSO";
  if (/kief/.test(n)) return "Kief";
  if (/hash/.test(n)) return "Hash";
  return null;
}

export function extractEdibleType(name: string): string | null {
  const n = name.toLowerCase();
  if (/drink|beverage|soda|liquid|elixir|tonic|shot/.test(n)) return "Liquid";
  if (/gummy|gummies/.test(n)) return "Gummy";
  if (/chocolate/.test(n)) return "Chocolate";
  if (/cookie|brownie/.test(n)) return "Baked";
  if (/candy|lozenge|mint/.test(n)) return "Candy";
  if (/capsule|tablet|pill/.test(n)) return "Capsule";
  if (/syrup/.test(n)) return "Syrup";
  if (/tincture/.test(n)) return "Tincture";
  return null;
}

export function extractPreRollType(name: string): string | null {
  const n = name.toLowerCase();
  const qty = extractQuantity(name);
  if (qty && parseInt(qty) > 1) return "Pack";
  if (/\bpack\b|\bpk\b/.test(n)) return "Pack";
  return "Single";
}

export function getDaysSinceScraped(lastVerified: string | null | undefined): number | null {
  if (!lastVerified) return null;
  const scraped = new Date(lastVerified);
  if (isNaN(scraped.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - scraped.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDaysSinceScraped(days: number | null): string {
  if (days === null) return "Unknown";
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days}d ago`;
}

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
