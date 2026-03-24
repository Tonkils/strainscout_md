"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, TrendingDown, DollarSign, Award, ArrowRight, Clock, Loader2, Leaf, MapPin } from "lucide-react";
import DealCard from "@/components/DealCard";
import DealDigestBanner from "@/components/DealDigestBanner";
import { useCatalog, useCatalogStats } from "@/hooks/useCatalog";
import { getProductCategory } from "@/lib/utils";

const FALLBACK_STATS = {
  totalStrains: 2220,
  totalDispensaries: 97,
  totalBrands: 180,
  avgPrice: 42,
  lowestPrice: 18,
  highestPrice: 75,
  lastUpdated: "March 2026",
  validationScore: 99.8,
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { catalog, loading } = useCatalog();
  const { stats } = useCatalogStats();

  const displayStats = stats.totalStrains > 0 ? stats : FALLBACK_STATS;

  const cheapestStrains = useMemo(() => {
    if (!catalog) return [];
    return catalog.strains
      .filter((s) => s.price_min != null && getProductCategory(s.name) === "Flower")
      .sort((a, b) => (a.price_min ?? 999) - (b.price_min ?? 999))
      .slice(0, 6);
  }, [catalog]);

  const filteredStrains = useMemo(() => {
    if (!catalog) return [];
    let result = catalog.strains.filter(
      (s) => s.price_avg != null && getProductCategory(s.name) === "Flower"
    );
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q) ||
          (s.terpenes || []).some((t) => t.toLowerCase().includes(q)) ||
          (s.effects || []).some((e) => e.toLowerCase().includes(q)) ||
          (s.flavors || []).some((f) => f.toLowerCase().includes(q)) ||
          (s.genetics || "").toLowerCase().includes(q)
      );
    }
    return result
      .sort((a, b) => (a.price_min ?? 999) - (b.price_min ?? 999))
      .slice(0, 12);
  }, [catalog, searchQuery]);

  const bestDeal = useMemo(() => {
    if (!catalog) return null;
    return (
      catalog.strains
        .filter((s) => s.price_min && s.price_max && s.price_max > s.price_min)
        .sort((a, b) => b.price_max! - b.price_min! - (a.price_max! - a.price_min!))[0] || null
    );
  }, [catalog]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-background/80 to-background" />
        <div className="relative container py-10 sm:py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4 sm:mb-6">
              <Clock className="w-3 h-3" />
              Updated {displayStats.lastUpdated}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl text-foreground leading-[1.1] mb-3 sm:mb-4">
              Find the Cheapest{" "}
              <span className="text-primary">Cannabis</span>{" "}
              <span className="block sm:inline">Near You</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-6 sm:mb-8">
              Compare prices across{" "}
              <span className="font-price text-primary">{displayStats.totalDispensaries}</span>{" "}
              Maryland dispensaries.{" "}
              <span className="font-price text-primary">{displayStats.totalStrains.toLocaleString()}</span>{" "}
              strains tracked.
            </p>

            {/* Search */}
            <div className="max-w-xl mb-8 sm:mb-10">
              <div className="flex flex-col sm:flex-row items-stretch bg-card border border-border/50 rounded-lg overflow-hidden focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10 transition-all">
                <div className="flex items-center flex-1">
                  <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search strain, brand, or terpene..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent px-3 sm:px-4 py-3.5 sm:py-4 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                </div>
                <Link
                  href={searchQuery ? `/compare?q=${encodeURIComponent(searchQuery)}` : "/compare"}
                  className="sm:shrink-0 px-6 py-3.5 sm:py-4 bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta text-center"
                >
                  Find Deals
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="bg-card/80 backdrop-blur border border-border/30 rounded-lg p-4 sm:p-5 min-w-[200px] sm:min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-savings flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4 text-savings" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lowest 8th in MD</p>
                  <p className="font-price text-xl sm:text-2xl font-bold text-foreground">${displayStats.lowestPrice}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur border border-border/30 rounded-lg p-4 sm:p-5 min-w-[200px] sm:min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Average Price</p>
                  <p className="font-price text-xl sm:text-2xl font-bold text-foreground">${displayStats.avgPrice}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur border border-border/30 rounded-lg p-4 sm:p-5 min-w-[200px] sm:min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Verified Brands</p>
                  <p className="font-price text-xl sm:text-2xl font-bold text-foreground">{displayStats.totalBrands}</p>
                  <p className="text-xs text-primary">{displayStats.validationScore}% accuracy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cheapest Right Now Strip */}
      {!loading && cheapestStrains.length > 0 && (
        <section className="border-b border-border/30 bg-card/20">
          <div className="container py-5 sm:py-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-savings" />
                <h2 className="font-serif text-base sm:text-lg text-foreground">Cheapest Flower Right Now</h2>
              </div>
              <Link href="/compare?sort=price" className="text-xs text-primary hover:underline flex items-center gap-1">
                See all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
              {cheapestStrains.map((strain) => {
                const best = [...(strain.prices || [])].sort((a, b) => a.price - b.price)[0];
                return (
                  <Link
                    key={strain.id}
                    href={`/strain/${strain.id}`}
                    className="min-w-[160px] sm:min-w-0 flex-shrink-0 bg-card border border-border/40 rounded-lg p-3 hover:border-primary/40 hover:bg-card/80 transition-all group"
                  >
                    <p className="font-price text-xl font-bold text-savings mb-0.5">${strain.price_min}</p>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{strain.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{strain.brand}</p>
                    {best && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{best.dispensary}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Strains Grid */}
      <section className="container py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground">
            {searchQuery ? `Results for "${searchQuery}"` : "Cheapest Strains"}
          </h2>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Leaf className="w-4 h-4" />
            <span>{displayStats.totalStrains.toLocaleString()} verified strains</span>
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex items-center justify-center py-20">
            <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading catalog...</span>
          </div>
        ) : filteredStrains.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredStrains.map((strain) => (
              <DealCard key={strain.id} strain={strain} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No strains found for &quot;{searchQuery}&quot;</p>
            <button onClick={() => setSearchQuery("")} className="mt-4 text-primary text-sm hover:underline">
              Clear search
            </button>
          </div>
        )}

        <div className="flex justify-center mt-8 sm:mt-10">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-all shadow-cta"
          >
            Browse All {displayStats.totalStrains.toLocaleString()} Strains
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <DealDigestBanner totalStrains={displayStats.totalStrains} totalDispensaries={displayStats.totalDispensaries} />

      {/* Ticker */}
      <div className="border-t border-border/30 bg-card/50 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap py-3">
          <span className="inline-flex items-center gap-6 text-xs text-muted-foreground">
            <span><span className="font-price text-primary">{displayStats.totalStrains.toLocaleString()}</span> strains verified</span>
            <span className="opacity-30">|</span>
            <span><span className="font-price text-primary">{displayStats.totalDispensaries}</span> dispensaries tracked</span>
            <span className="opacity-30">|</span>
            <span><span className="font-price text-primary">{displayStats.totalBrands}</span> brands verified</span>
            <span className="opacity-30">|</span>
            <span>Validation score: <span className="font-price text-savings">{displayStats.validationScore}%</span></span>
            <span className="opacity-30">|</span>
            {bestDeal && (
              <>
                <span>Best deal: <span className="text-foreground">{bestDeal.name}</span> from <span className="font-price text-savings">${bestDeal.price_min}</span></span>
                <span className="opacity-30">|</span>
              </>
            )}
            <span>Data updates every Tuesday</span>
            <span className="opacity-30">|</span>
            <span><span className="font-price text-primary">{displayStats.totalStrains.toLocaleString()}</span> strains verified</span>
            <span className="opacity-30">|</span>
            <span><span className="font-price text-primary">{displayStats.totalDispensaries}</span> dispensaries tracked</span>
          </span>
        </div>
      </div>
    </div>
  );
}
