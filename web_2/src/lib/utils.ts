import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ProductCategory =
  | "Flower"
  | "Pre-Roll"
  | "Vape"
  | "Concentrate"
  | "Edible"
  | "Topical"
  | "Other";

export type ClassificationConfidence = "HIGH" | "MEDIUM";

export interface Classification {
  category: ProductCategory;
  confidence: ClassificationConfidence;
}

/**
 * Classify a cannabis product by name with confidence score.
 * Tested against 1,297 products in catalog v10 — 93% accuracy on 65-item ground truth.
 *
 * Priority order: Other → Pre-Roll → Vape → Edible (gummies early) → Concentrate → Edible → Topical → Flower
 */
export function classifyProduct(name: string): Classification {
  const n = name.toLowerCase().trim();

  // ── 1. Other (junk data — filter first) ────────────────────────────────
  // T-shirts, "Shop by Effects" category pages, discount strings
  if (/t-shirt|shirt\b|tee\b|^shop\s|^browse\s|% off|% back/.test(n))
    return { category: "Other", confidence: "HIGH" };
  // Bare pack/count strings with no product name (e.g. "5ct", "10 Pack")
  if (/^[\d\s]*(pack|ct)[\d\s]*$/.test(n))
    return { category: "Other", confidence: "MEDIUM" };

  // ── 2. Pre-Roll ─────────────────────────────────────────────────────────
  // PRJ = pre-roll joint; joints? catches "joints" plural; shorties = pre-roll size term
  // Happy J's / Happy-er J's = exclusive pre-roll brand (never sells flower)
  // "Infused N pack/pk" = infused multi-pack pre-rolls
  if (
    /\bprj\b|pre[-\s]?roll|preroll|\bjoints?\b|\bblunt\b|mini\s+dogs?\b|show\s+dog\b|\bdogwalkers?\b|swift\s+lifts?\b|infused\s+\d+\s*[-]?\s*(?:pack|pk)\b|\bhappy(?:-er)?\s+j[\u2019']?s?\b|\bshorties?\b/.test(n)
  )
    return { category: "Pre-Roll", confidence: "HIGH" };
  // Infused + pack count in any position = infused pre-roll multi-pack e.g. "(2pk)", "(5pk)"
  if (/\binfused\b/.test(n) && /(?:pack|pk)\b|\d+\s*(?:pack|pk)\b/.test(n))
    return { category: "Pre-Roll", confidence: "MEDIUM" };

  // ── 3. Vape ─────────────────────────────────────────────────────────────
  // cloud bar = disposable vape format (e.g. "Blueberry Dream Cloud Bar")
  // airopod catches "AiroPod Berry Bliss" where pod is fused to brand name
  if (
    /\bcart\b|cartridge|vaporizer|510|disposable|\blr\s+pod\b|live\s+resin\s+cart|\bvape\b|\bpod\b|airopod|cloud\s+bar\b/.test(n)
  )
    return { category: "Vape", confidence: "HIGH" };
  // "Airo" alone = MEDIUM (could be a bundle, e.g. "Airo Ready-2-Go Bundle")
  if (/\bairo\b/.test(n))
    return { category: "Vape", confidence: "MEDIUM" };

  // ── 4a. Early Edible pre-check ──────────────────────────────────────────
  // Must run BEFORE Concentrate: "Live Resin Gummies" are edibles, not concentrates
  if (/gummy|gummies/.test(n))
    return { category: "Edible", confidence: "HIGH" };

  // ── 4. Concentrate ──────────────────────────────────────────────────────
  // FECO = Full Extract Cannabis Oil; FSO = Full Spectrum Oil; RSO = Rick Simpson Oil
  // THCA/isolate = pure cannabinoid extracts; BHO/PHO = extraction methods
  // cured sugar = concentrate texture (alongside live sugar already present)
  if (
    /\bwax\b|\bdab\b|shatter|budder|badder|batter|\brosin\b|live\s+resin\b|distillate|concentrate|extract|\bhash\b|kief\b|crumble|diamonds?\b|\bsauce\b|\brso\b|\bfeco\b|\boil\b|tincture|live\s+sugar|cured\s+sugar|full[-\s]spec|full\s+extract|\bfso\b|\bisolate\b|\bthca\b|\bbho\b|\bpho\b/.test(n)
  )
    return { category: "Concentrate", confidence: "HIGH" };

  // ── 5. Edible ───────────────────────────────────────────────────────────
  // REMOVED from this block (too many cannabis strain names use these words):
  //   cookie/brownie (Forum Cut Cookies, Brownie Scout = strains)
  //   truffle (White Truffle = famous strain)
  //   jelly (Jelly Breath, Jelly Donuts x GMO = strains)
  //   candy (Candy Panties, Candy Fumez = strains)
  //   sunnies (brand sells concentrates + vapes too; specific keywords catch actual edibles)
  // Real edibles caught by: dosage (mg), ratios, specific product formats, or explicit brands.
  // Note: \bdiscos\b (plural) not disco to avoid matching "Disco Diesel" strain
  // Brands: Wana, Smokiez, Dixie, Keef are edible-only brands
  if (
    /chocolate|lozenge|\bcaramel\b|\bmochi\b|macaroon/.test(n) ||
    /chews?\b|jellies?\b|\bdiscos\b|\belixir\b|quick\s*kicks?\b|sparkling\s+water|\bsoda\b|\bbeverage\b|\bdrink\b|\bcapsule|\btablet\b|syrup|baked\s+bites/.test(n) ||
    /\d+mg\b/.test(n) ||
    /\bwana\b|\bsmokiez\b|\bdixie\b|\bkeef\b/.test(n) ||
    /infused\s+(honey|butter|oil)/.test(n)
  )
    return { category: "Edible", confidence: "HIGH" };
  // Cannabinoid ratio notation without prior category match = edible
  if (/\d+\s*:\s*\d+/.test(n))
    return { category: "Edible", confidence: "HIGH" };
  // CBG/CBN/CBD present without other signals = likely edible formulation
  if (/\b(cbg|cbn|cbd)\b/.test(n))
    return { category: "Edible", confidence: "MEDIUM" };

  // ── 6. Topical ──────────────────────────────────────────────────────────
  // REMOVED: cream\b — too many strain names contain "cream"
  //   (Ice Cream Cake, Sour Cream, Boston Cream, Neapolitan Space Cream)
  if (/topical|lotion|balm|\bpatch\b|salve|moisturizer/.test(n))
    return { category: "Topical", confidence: "HIGH" };
  if (/\bgel\b|\bspray\b/.test(n))
    return { category: "Topical", confidence: "MEDIUM" };

  // ── 7. Flower (default) ─────────────────────────────────────────────────
  return { category: "Flower", confidence: "HIGH" };
}

/** Convenience wrapper — returns just the category string. */
export function getProductCategory(name: string): ProductCategory {
  return classifyProduct(name).category;
}

/**
 * Get the authoritative category for a catalog strain.
 * Uses the platform-verified product_category field when available;
 * falls back to name-based classification only as a last resort.
 */
export function getCategoryFromStrain(strain: { product_category?: string; name: string }): ProductCategory {
  const cat = strain.product_category;
  if (cat && cat !== "Other" && cat !== "Flower") {
    const specific: ProductCategory[] = ["Pre-Roll", "Vape", "Concentrate", "Edible", "Topical"];
    if (specific.includes(cat as ProductCategory)) return cat as ProductCategory;
  }
  const classified = classifyProduct(strain.name);
  if (classified.category !== "Flower") return classified.category;
  return "Flower";
}

/**
 * Filter a list of strains by a search query across multiple fields.
 * Default fields match: name, brand, type, terpenes, effects, flavors, genetics.
 */
export function filterStrains<T extends {
  name: string;
  brand: string;
  type: string;
  terpenes?: string[];
  effects?: string[];
  flavors?: string[];
  genetics?: string;
}>(
  strains: T[],
  query: string,
  fields: Array<"name" | "brand" | "type" | "terpenes" | "effects" | "flavors" | "genetics"> = [
    "name", "brand", "type", "terpenes", "effects", "flavors", "genetics",
  ]
): T[] {
  if (!query) return strains;
  const q = query.toLowerCase();
  return strains.filter((s) =>
    fields.some((field) => {
      switch (field) {
        case "name":    return s.name.toLowerCase().includes(q);
        case "brand":   return s.brand.toLowerCase().includes(q);
        case "type":    return s.type.toLowerCase().includes(q);
        case "terpenes": return (s.terpenes || []).some((t) => t.toLowerCase().includes(q));
        case "effects":  return (s.effects || []).some((e) => e.toLowerCase().includes(q));
        case "flavors":  return (s.flavors || []).some((f) => f.toLowerCase().includes(q));
        case "genetics": return (s.genetics || "").toLowerCase().includes(q);
        default: return false;
      }
    })
  );
}

/** Canonical type badge colors — single source of truth across all pages. */
export const TYPE_COLORS: Record<string, string> = {
  indica: "bg-indigo-500/15 text-indigo-400",
  sativa: "bg-amber-500/15 text-amber-400",
  hybrid: "bg-emerald-500/15 text-emerald-400",
};

export const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Flower:      "bg-emerald-500/15 text-emerald-400",
  "Pre-Roll":  "bg-orange-500/15 text-orange-400",
  Vape:        "bg-sky-500/15 text-sky-400",
  Concentrate: "bg-violet-500/15 text-violet-400",
  Edible:      "bg-pink-500/15 text-pink-400",
  Topical:     "bg-teal-500/15 text-teal-400",
  Other:       "bg-zinc-500/15 text-zinc-400",
};

/** Display labels for each category (used in nav, tabs, filters) */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  Flower:      "Flower",
  "Pre-Roll":  "Pre-Rolls",
  Vape:        "Vapes",
  Concentrate: "Concentrates",
  Edible:      "Edibles",
  Topical:     "Topicals",
  Other:       "Other",
};
