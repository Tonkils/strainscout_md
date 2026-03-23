/*
 * StrainScout MD — Deals & Price Drops Page
 * Shows recent price drops detected from snapshot comparisons.
 * Falls back to simulated deals from catalog spread data when no DB drops exist.
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import {
  TrendingDown, Loader2, ArrowDown, Filter, Percent,
  DollarSign, Leaf, ArrowRight, Search, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { trackPageViewed, trackFilterApplied } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";

type DealItem = {
  strainId: string;
  strainName: string;
  type: string;
  brand: string;
  dispensary: string;
  oldPrice: number;
  newPrice: number;
  dropPercent: number;
  savings: number;
  terpenes: string[];
  thcRange: string;
  verified: boolean;
};

type SortKey = "savings_pct" | "savings_abs" | "price_low" | "newest";
type TypeFilter = "All" | "Indica" | "Sativa" | "Hybrid";

export default function Deals() {
  const { catalog, loading: catLoading } = useCatalog();
  const [sortBy, setSortBy] = useState<SortKey>("savings_pct");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCount, setShowCount] = useState(24);

  // Try to fetch real price drops from the backend
  const { data: dbDrops, isLoading: dbLoading } = trpc.priceDrops.recent.useQuery(
    { limit: 100 },
    { retry: false }
  );

  useEffect(() => {
    trackPageViewed("deals");
  }, []);

  // Build deal items from DB drops or fall back to catalog spread data
  const deals: DealItem[] = useMemo(() => {
    // If we have real DB price drops, use them
    if (dbDrops && dbDrops.length > 0 && catalog) {
      return dbDrops.map((drop) => {
        const strain = catalog.strains.find((s) => s.id === drop.strainId);
        return {
          strainId: drop.strainId,
          strainName: drop.strainName,
          type: strain?.type || "Hybrid",
          brand: strain?.brand || "",
          dispensary: drop.dispensary,
          oldPrice: Number(drop.oldPrice),
          newPrice: Number(drop.newPrice),
          dropPercent: Number(drop.dropPercent),
          savings: Number(drop.oldPrice) - Number(drop.newPrice),
          terpenes: strain?.terpenes || [],
          thcRange: strain?.thc ? `${strain.thc}%` : "",
          verified: strain?.leafly_verified || strain?.weedmaps_verified || false,
        };
      });
    }

    // Fallback: generate "deals" from catalog price spread data
    if (!catalog) return [];
    return catalog.strains
      .filter((s) => s.price_min && s.price_max && s.price_max > s.price_min)
      .map((s) => ({
        strainId: s.id,
        strainName: s.name,
        type: s.type,
        brand: s.brand,
        dispensary: s.prices.reduce(
          (best, p) => (p.price < best.price ? p : best),
          s.prices[0]
        )?.dispensary || "Various",
        oldPrice: s.price_max!,
        newPrice: s.price_min!,
        dropPercent: Math.round(((s.price_max! - s.price_min!) / s.price_max!) * 100),
        savings: s.price_max! - s.price_min!,
        terpenes: s.terpenes,
        thcRange: s.thc ? `${s.thc}%` : "",
        verified: s.leafly_verified || s.weedmaps_verified || false,
      }));
  }, [dbDrops, catalog]);

  // Apply filters and sorting
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Type filter
    if (typeFilter !== "All") {
      result = result.filter((d) => d.type.toLowerCase() === typeFilter.toLowerCase());
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.strainName.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          d.dispensary.toLowerCase().includes(q) ||
          d.terpenes.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case "savings_pct":
        result.sort((a, b) => b.dropPercent - a.dropPercent);
        break;
      case "savings_abs":
        result.sort((a, b) => b.savings - a.savings);
        break;
      case "price_low":
        result.sort((a, b) => a.newPrice - b.newPrice);
        break;
      case "newest":
      default:
        break;
    }

    return result;
  }, [deals, typeFilter, searchQuery, sortBy]);

  const displayDeals = filteredDeals.slice(0, showCount);
  const loading = catLoading;

  // Stats
  const stats = useMemo(() => {
    if (deals.length === 0) return null;
    const avgSavings = Math.round(deals.reduce((sum, d) => sum + d.savings, 0) / deals.length);
    const maxSavings = Math.max(...deals.map((d) => d.savings));
    const avgPct = Math.round(deals.reduce((sum, d) => sum + d.dropPercent, 0) / deals.length);
    return { total: deals.length, avgSavings, maxSavings, avgPct };
  }, [deals]);

  const typeOptions: TypeFilter[] = ["All", "Indica", "Sativa", "Hybrid"];
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "savings_pct", label: "Biggest % Off" },
    { key: "savings_abs", label: "Most $ Saved" },
    { key: "price_low", label: "Lowest Price" },
  ];

  const hasDbDrops = dbDrops && dbDrops.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Deals & Price Drops | StrainScout MD"
        description={`Find the best cannabis deals in Maryland. ${stats?.total || 0} price drops tracked across dispensaries. Save up to $${stats?.maxSavings || 0} per eighth.`}
        path="/deals"
      />
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border/30 bg-gradient-to-b from-red-500/5 to-transparent">
        <div className="container py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">
                Deals & Price Drops
              </h1>
              {!hasDbDrops && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing price spread savings across dispensaries
                </p>
              )}
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl mb-6">
            {hasDbDrops
              ? "Real-time price drops detected from our weekly dispensary scans. These strains recently dropped in price."
              : "Compare the best prices across Maryland dispensaries. The savings shown represent the difference between the highest and lowest prices for each strain."}
          </p>

          {/* Stats row */}
          {stats && (
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <div className="bg-card/80 border border-border/30 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Deals</p>
                <p className="font-price text-xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
              </div>
              <div className="bg-card/80 border border-border/30 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Savings</p>
                <p className="font-price text-xl font-bold text-emerald-400">${stats.avgSavings}</p>
              </div>
              <div className="bg-card/80 border border-border/30 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Savings</p>
                <p className="font-price text-xl font-bold text-red-400">${stats.maxSavings}</p>
              </div>
              <div className="bg-card/80 border border-border/30 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg % Off</p>
                <p className="font-price text-xl font-bold text-amber-400">{stats.avgPct}%</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Filters & Sort */}
      <section className="border-b border-border/20 bg-card/30">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search strain, brand, or dispensary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-card border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Type filter pills */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-muted-foreground" />
                {typeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTypeFilter(type);
                      if (type !== "All") trackFilterApplied("type", type, "deals");
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      typeFilter === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-1.5">
                <ArrowDown className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-card border border-border/50 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deals Grid */}
      <section className="container py-8 sm:py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading deals...</span>
          </div>
        ) : displayDeals.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayDeals.map((deal, idx) => (
                <DealDropCard key={`${deal.strainId}-${deal.dispensary}-${idx}`} deal={deal} />
              ))}
            </div>

            {filteredDeals.length > showCount && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setShowCount((c) => c + 24)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta"
                >
                  Load More Deals
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              Showing {displayDeals.length} of {filteredDeals.length} deals
            </p>
          </>
        ) : (
          <div className="text-center py-16">
            <TrendingDown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No deals found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || typeFilter !== "All"
                ? "Try adjusting your filters or search query."
                : "Check back soon — we scan dispensaries weekly for price drops."}
            </p>
            {(searchQuery || typeFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("All");
                }}
                className="mt-4 text-primary text-sm hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

/* ─── Deal Drop Card ─── */
function DealDropCard({ deal }: { deal: DealItem }) {
  const typeColor: Record<string, string> = {
    indica: "bg-indigo-500/20 text-indigo-300",
    sativa: "bg-amber-500/20 text-amber-300",
    hybrid: "bg-emerald-500/20 text-emerald-300",
  };

  const badgeClass = typeColor[deal.type.toLowerCase()] || typeColor.hybrid;

  return (
    <Link href={`/strain/${deal.strainId}`}>
      <div className="group bg-card border border-border/30 rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer h-full flex flex-col">
        {/* Savings banner */}
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400">
              {deal.dropPercent}% OFF
            </span>
          </div>
          <span className="text-xs font-price text-red-300">
            Save ${deal.savings.toFixed(0)}
          </span>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          {/* Type + Brand */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badgeClass}`}>
              {deal.type}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
              {deal.brand}
            </span>
            {deal.verified && (
              <span className="text-amber-400 text-[10px]">★</span>
            )}
          </div>

          {/* Strain name */}
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm mb-1 line-clamp-2">
            {deal.strainName}
          </h3>

          {/* THC + Terpenes */}
          {(deal.thcRange || deal.terpenes.length > 0) && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
              {deal.thcRange && <span>THC {deal.thcRange}</span>}
              {deal.terpenes.length > 0 && (
                <span className="truncate">{deal.terpenes.slice(0, 2).join(", ")}</span>
              )}
            </div>
          )}

          {/* Price comparison */}
          <div className="mt-auto pt-3 border-t border-border/20">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Best Price</p>
                <p className="font-price text-xl font-bold text-emerald-400">
                  ${deal.newPrice}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Was</p>
                <p className="font-price text-sm text-muted-foreground line-through">
                  ${deal.oldPrice}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
              <Leaf className="w-3 h-3 inline mr-1" />
              {deal.dispensary}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
