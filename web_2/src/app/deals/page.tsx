"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingDown, Loader2, ArrowDown, Filter, Leaf, Search, X,
} from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";

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

type SortKey = "savings_pct" | "savings_abs" | "price_low";
type TypeFilter = "All" | "Indica" | "Sativa" | "Hybrid";

const TYPE_COLOR: Record<string, string> = {
  indica: "bg-indigo-500/20 text-indigo-300",
  sativa: "bg-amber-500/20 text-amber-300",
  hybrid: "bg-emerald-500/20 text-emerald-300",
};

function DealDropCard({ deal }: { deal: DealItem }) {
  return (
    <Link href={`/strain/${deal.strainId}`}>
      <div className="group bg-card border border-border/30 rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer h-full flex flex-col">
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400">{deal.dropPercent}% OFF</span>
          </div>
          <span className="text-xs font-price text-red-300">Save ${deal.savings.toFixed(0)}</span>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${TYPE_COLOR[deal.type.toLowerCase()] || TYPE_COLOR.hybrid}`}>
              {deal.type}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{deal.brand}</span>
            {deal.verified && <span className="text-amber-400 text-[10px]">★</span>}
          </div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm mb-1 line-clamp-2">
            {deal.strainName}
          </h3>
          {(deal.thcRange || deal.terpenes.length > 0) && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
              {deal.thcRange && <span>THC {deal.thcRange}</span>}
              {deal.terpenes.length > 0 && <span className="truncate">{deal.terpenes.slice(0, 2).join(", ")}</span>}
            </div>
          )}
          <div className="mt-auto pt-3 border-t border-border/20">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Best Price</p>
                <p className="font-price text-xl font-bold text-savings">${deal.newPrice}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Was</p>
                <p className="font-price text-sm text-muted-foreground line-through">${deal.oldPrice}</p>
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

export default function DealsPage() {
  const { catalog, loading } = useCatalog();
  const [sortBy, setSortBy] = useState<SortKey>("savings_pct");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCount, setShowCount] = useState(24);

  const deals: DealItem[] = useMemo(() => {
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
  }, [catalog]);

  const filteredDeals = useMemo(() => {
    let result = [...deals];
    if (typeFilter !== "All") result = result.filter((d) => d.type.toLowerCase() === typeFilter.toLowerCase());
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) =>
        d.strainName.toLowerCase().includes(q) ||
        d.brand.toLowerCase().includes(q) ||
        d.dispensary.toLowerCase().includes(q) ||
        d.terpenes.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sortBy === "savings_pct") result.sort((a, b) => b.dropPercent - a.dropPercent);
    else if (sortBy === "savings_abs") result.sort((a, b) => b.savings - a.savings);
    else if (sortBy === "price_low") result.sort((a, b) => a.newPrice - b.newPrice);
    return result;
  }, [deals, typeFilter, searchQuery, sortBy]);

  const displayDeals = filteredDeals.slice(0, showCount);

  const stats = useMemo(() => {
    if (deals.length === 0) return null;
    const avgSavings = Math.round(deals.reduce((sum, d) => sum + d.savings, 0) / deals.length);
    const maxSavings = Math.max(...deals.map((d) => d.savings));
    const avgPct = Math.round(deals.reduce((sum, d) => sum + d.dropPercent, 0) / deals.length);
    return { total: deals.length, avgSavings, maxSavings, avgPct };
  }, [deals]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border/30 bg-gradient-to-b from-red-500/5 to-transparent">
        <div className="container py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">Best Prices Across Dispensaries</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Strains with the biggest price spread — same product, lower cost at a different dispensary</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl mb-6">
            These strains are available at multiple dispensaries — and the cheapest is significantly lower than the most expensive. Buy smart: same product, less money.
          </p>
          {stats && (
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <div className="bg-card/80 border border-border/30 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Deals</p>
                <p className="font-price text-xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
              </div>
              <div className="bg-card/80 border border-border/30 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Savings</p>
                <p className="font-price text-xl font-bold text-savings">${stats.avgSavings}</p>
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

      {/* Filters */}
      <section className="border-b border-border/20 bg-card/30">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
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
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-muted-foreground" />
                {(["All", "Indica", "Sativa", "Hybrid"] as TypeFilter[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
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
              <div className="flex items-center gap-1.5">
                <ArrowDown className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-card border border-border/50 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="savings_pct">Biggest % Off</option>
                  <option value="savings_abs">Most $ Saved</option>
                  <option value="price_low">Lowest Price</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
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
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
            {(searchQuery || typeFilter !== "All") && (
              <button
                onClick={() => { setSearchQuery(""); setTypeFilter("All"); }}
                className="mt-4 text-primary text-sm hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
