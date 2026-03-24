"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MapPin, ExternalLink, TrendingDown, Loader2 } from "lucide-react";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { getProductCategory, CATEGORY_COLORS, type ProductCategory } from "@/lib/utils";

const CATEGORIES: { key: ProductCategory | "All"; label: string; emoji: string }[] = [
  { key: "All",        label: "All Categories", emoji: "🌿" },
  { key: "Flower",     label: "Flower",          emoji: "🌸" },
  { key: "Pre-Roll",   label: "Pre-Rolls",       emoji: "🚬" },
  { key: "Vape",       label: "Vapes",           emoji: "💨" },
  { key: "Edible",     label: "Edibles",         emoji: "🍬" },
  { key: "Concentrate",label: "Concentrates",    emoji: "💎" },
];

function getBuyLink(strain: CatalogStrain, dispensaryName: string): string | null {
  const ordering = strain.ordering_links?.[dispensaryName];
  if (ordering?.dutchie) return ordering.dutchie;
  if (ordering?.weedmaps) return ordering.weedmaps;
  return strain.dispensary_links?.[dispensaryName] || null;
}

function StrainRow({ strain }: { strain: CatalogStrain }) {
  const bestPrice = [...(strain.prices || [])].sort((a, b) => a.price - b.price)[0];
  const buyLink = bestPrice ? getBuyLink(strain, bestPrice.dispensary) : null;
  const category = getProductCategory(strain.name);
  const categoryColor = CATEGORY_COLORS[category];

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-card/50 transition-colors group">
      {/* Price */}
      <div className="w-16 shrink-0 text-right">
        <span className="font-price text-lg font-bold text-savings">
          {strain.price_min != null ? `$${strain.price_min}` : "—"}
        </span>
      </div>

      {/* Info */}
      <Link href={`/strain/${strain.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
          {strain.name}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{strain.brand}</p>
      </Link>

      {/* Category badge */}
      <span className={`hidden sm:inline-flex shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${categoryColor}`}>
        {category}
      </span>

      {/* Dispensary + Buy */}
      <div className="flex items-center gap-2 shrink-0">
        {bestPrice && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground max-w-[130px]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{bestPrice.dispensary}</span>
          </div>
        )}
        {buyLink ? (
          <a
            href={buyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-cta text-cta-foreground text-[11px] font-semibold hover:bg-cta-hover transition-colors shadow-cta"
          >
            Buy <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : (
          <Link
            href={`/strain/${strain.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground text-[11px] font-medium hover:text-foreground hover:border-primary/40 transition-colors"
          >
            Details →
          </Link>
        )}
      </div>
    </div>
  );
}

function CategorySection({
  category,
  strains,
  limit = 10,
}: {
  category: ProductCategory;
  strains: CatalogStrain[];
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES.find((c) => c.key === category)!;
  const shown = expanded ? strains : strains.slice(0, limit);

  if (strains.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-base">{cat.emoji}</span>
          <h2 className="font-serif text-base sm:text-lg text-foreground">{cat.label}</h2>
          <span className="text-xs text-muted-foreground">({strains.length} strains)</span>
        </div>
        <Link
          href={`/compare?category=${encodeURIComponent(category)}`}
          className="text-xs text-primary hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="divide-y divide-border/20">
        {shown.map((strain) => (
          <StrainRow key={strain.id} strain={strain} />
        ))}
      </div>
      {!expanded && strains.length > limit && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-2.5 text-xs text-muted-foreground hover:text-primary transition-colors text-center border-t border-border/20"
        >
          Show {strains.length - limit} more {cat.label.toLowerCase()}
        </button>
      )}
    </div>
  );
}

export default function CheapestPage() {
  const { catalog, loading } = useCatalog();
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "All">("All");

  const categorized = useMemo(() => {
    if (!catalog) return {} as Record<ProductCategory, CatalogStrain[]>;
    const map: Record<string, CatalogStrain[]> = {};
    for (const strain of catalog.strains) {
      if (strain.price_min == null) continue;
      const cat = getProductCategory(strain.name);
      if (!map[cat]) map[cat] = [];
      map[cat].push(strain);
    }
    // Sort each category by price_min asc
    for (const cat of Object.keys(map)) {
      map[cat].sort((a, b) => (a.price_min ?? 999) - (b.price_min ?? 999));
    }
    return map as Record<ProductCategory, CatalogStrain[]>;
  }, [catalog]);

  const filteredSingle = useMemo(() => {
    if (!catalog || activeCategory === "All") return [];
    return (categorized[activeCategory as ProductCategory] || []);
  }, [catalog, categorized, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-6 sm:py-10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-savings" />
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">Cheapest by Category</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Lowest prices in Maryland, sorted by product type — so you always know what you're comparing.
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <div className="sticky top-14 sm:top-16 z-30 bg-background/95 backdrop-blur border-b border-border/30">
        <div className="container">
          <div className="flex gap-1 overflow-x-auto py-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeCategory === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
                {cat.key !== "All" && categorized[cat.key as ProductCategory] && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeCategory === cat.key ? "bg-white/20" : "bg-muted/50"
                  }`}>
                    {categorized[cat.key as ProductCategory]?.length ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading catalog...</span>
          </div>
        ) : activeCategory === "All" ? (
          // All categories — show sections
          <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
            {(["Flower", "Pre-Roll", "Vape", "Edible", "Concentrate"] as ProductCategory[]).map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                strains={categorized[cat] || []}
                limit={8}
              />
            ))}
          </div>
        ) : (
          // Single category — full list
          <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-price text-foreground">{filteredSingle.length}</span> strains sorted cheapest first
              </p>
              <Link href="/compare" className="text-xs text-primary hover:underline">
                Advanced filters →
              </Link>
            </div>
            <div className="divide-y divide-border/20">
              {filteredSingle.map((strain) => (
                <StrainRow key={strain.id} strain={strain} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
