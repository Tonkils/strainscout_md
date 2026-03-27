"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Leaf, Cigarette, Wind, Beaker, Cookie, Droplets, HelpCircle,
  Search, ArrowRight, Loader2, DollarSign, MapPin,
} from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import {
  getCategoryFromStrain,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type ProductCategory,
} from "@/lib/utils";
import DealCard from "@/components/DealCard";

// ── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<ProductCategory, React.ReactNode> = {
  Flower:      <Leaf className="w-5 h-5" />,
  "Pre-Roll":  <Cigarette className="w-5 h-5" />,
  Vape:        <Wind className="w-5 h-5" />,
  Concentrate: <Beaker className="w-5 h-5" />,
  Edible:      <Cookie className="w-5 h-5" />,
  Topical:     <Droplets className="w-5 h-5" />,
  Other:       <HelpCircle className="w-5 h-5" />,
};

const CATEGORY_DESCRIPTIONS: Record<ProductCategory, string> = {
  Flower:      "Traditional cannabis buds — the most popular format at Maryland dispensaries.",
  "Pre-Roll":  "Ready-to-smoke joints, including singles, multi-packs, and infused options.",
  Vape:        "Cartridges, pods, and disposable vaporizers for discreet, convenient use.",
  Concentrate: "Wax, shatter, rosin, live resin, distillate, and other high-potency extracts.",
  Edible:      "Gummies, chocolates, beverages, capsules, and other infused food products.",
  Topical:     "Balms, lotions, patches, and salves for localized relief without psychoactive effects.",
  Other:       "Miscellaneous cannabis products that don't fit the standard categories.",
};

// ── URL slug → ProductCategory ───────────────────────────────────────────────

const ALL_CATEGORIES: ProductCategory[] = [
  "Flower", "Pre-Roll", "Vape", "Concentrate", "Edible", "Topical", "Other",
];

function slugToCategory(slug: string): ProductCategory | null {
  const normalized = slug.toLowerCase();
  return ALL_CATEGORIES.find((c) => c.toLowerCase() === normalized) ?? null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CategoryPageClient({ slug }: { slug: string }) {
  const cat = slugToCategory(slug);
  const { catalog, loading } = useCatalog();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "name" | "dispensaries">("price");

  const strains = useMemo(() => {
    if (!catalog || !cat) return [];
    let result = catalog.strains.filter(
      (s) => getCategoryFromStrain(s) === cat
    );
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q) ||
          (s.terpenes || []).some((t) => t.toLowerCase().includes(q)) ||
          (s.effects || []).some((e) => e.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => {
      if (sortBy === "price") return (a.price_min ?? 999) - (b.price_min ?? 999);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return (b.dispensary_count ?? 0) - (a.dispensary_count ?? 0);
    });
  }, [catalog, cat, search, sortBy]);

  // Category count map for sidebar
  const categoryCounts = useMemo(() => {
    if (!catalog) return {} as Record<ProductCategory, number>;
    const counts = {} as Record<ProductCategory, number>;
    for (const s of catalog.strains) {
      const c = getCategoryFromStrain(s);
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [catalog]);

  if (!cat) {
    return (
      <div className="container py-24 text-center">
        <p className="text-muted-foreground text-lg">Category not found.</p>
        <Link href="/compare" className="mt-4 text-primary text-sm hover:underline">
          Browse all strains
        </Link>
      </div>
    );
  }

  const label = CATEGORY_LABELS[cat];
  const description = CATEGORY_DESCRIPTIONS[cat];
  const icon = CATEGORY_ICONS[cat];
  const colorClass = CATEGORY_COLORS[cat];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-8 sm:py-12">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">{label}</span>
          </nav>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
              {icon}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">{label}</h1>
          </div>
          <p className="text-muted-foreground max-w-xl">{description}</p>
        </div>
      </section>

      <div className="container py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar: category nav */}
          <aside className="lg:w-48 shrink-0">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Browse by Category
            </h2>
            <nav className="space-y-1">
              {ALL_CATEGORIES.filter((c) => c !== "Other").map((c) => {
                const count = categoryCounts[c] ?? 0;
                const isActive = c === cat;
                return (
                  <Link
                    key={c}
                    href={`/category/${c.toLowerCase()}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
                    }`}
                  >
                    <span>{CATEGORY_LABELS[c]}</span>
                    <span className="text-xs opacity-60">{count}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-card border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2.5 bg-card border border-border/40 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="price">Sort: Lowest Price</option>
                <option value="name">Sort: Name A–Z</option>
                <option value="dispensaries">Sort: Most Available</option>
              </select>
            </div>

            {/* Count */}
            {!loading && (
              <p className="text-sm text-muted-foreground mb-4">
                <span className="font-price text-foreground">{strains.length.toLocaleString()}</span>{" "}
                {label.toLowerCase()} products
                {search && ` matching "${search}"`}
              </p>
            )}

            {/* Grid */}
            {loading ? (
              <div role="status" className="flex items-center justify-center py-20">
                <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
                <span className="ml-3 text-muted-foreground">Loading {label.toLowerCase()}...</span>
              </div>
            ) : strains.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {strains.map((strain) => (
                  <DealCard key={strain.id} strain={strain} hideCategory />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  {search
                    ? `No ${label.toLowerCase()} found for "${search}"`
                    : `No ${label.toLowerCase()} in catalog yet.`}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-3 text-primary text-sm hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* CTA */}
            {!loading && strains.length > 0 && (
              <div className="mt-8 text-center">
                <Link
                  href={`/compare?category=${encodeURIComponent(cat)}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta"
                >
                  Compare All {label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
