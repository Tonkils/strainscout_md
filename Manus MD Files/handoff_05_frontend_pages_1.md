# StrainScout MD — Frontend Pages Part 1 (Home, Compare, Map, Strain Detail, Dispensaries)

**Handoff Document for Claude Code Review**
**Date:** March 16, 2026 | **Sprint:** 14 | **Checkpoint:** 6570492f

> Core user-facing pages: landing page, strain comparison, map view, strain detail, dispensary directory and detail.

---

## Files in This Document

1. `client/src/pages/Home.tsx` (241 lines)
2. `client/src/pages/CompareStrains.tsx` (476 lines)
3. `client/src/pages/MapView.tsx` (1103 lines)
4. `client/src/pages/StrainDetail.tsx` (698 lines)
5. `client/src/pages/DispensaryDirectory.tsx` (279 lines)
6. `client/src/pages/DispensaryDetail.tsx` (386 lines)
7. `client/src/pages/DispensaryCompare.tsx` (767 lines)

---

## 1. `client/src/pages/Home.tsx`

**Lines:** 241

```tsx
/*
 * StrainScout MD — Homepage
 * Design: Botanical Data Lab
 * Mobile-first: responsive hero, stacked stats, touch-friendly search
 * Now powered by real verified catalog data (2,220 strains, v8)
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Search, TrendingDown, DollarSign, Award, ArrowRight, Clock, Loader2, Leaf } from "lucide-react";
import Navbar from "@/components/Navbar";
import DealCard from "@/components/DealCard";
import DealDigestBanner from "@/components/DealDigestBanner";
import Footer from "@/components/Footer";
import { HomePageSEO } from "@/components/SEO";
import { useCatalog, useCatalogStats, type CatalogStrain } from "@/hooks/useCatalog";
import { catalogStats as defaultStats } from "@/data/strains";
import { trackPageViewed, trackStrainSearched } from "@/lib/analytics";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/hero-bg-RHmxN49YmGmHDGx8nptRYW.webp";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  // Analytics: track page view
  useEffect(() => { trackPageViewed("home"); }, []);

  // Analytics: track search (debounced)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) return;
    const timer = setTimeout(() => {
      trackStrainSearched(searchQuery, filteredStrains.length);
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const { catalog, loading } = useCatalog();
  const { stats } = useCatalogStats();

  const displayStats = stats.totalStrains > 0 ? stats : defaultStats;

  const filteredStrains = useMemo(() => {
    if (!catalog) return [];
    let result = catalog.strains.filter((s) => s.price_avg != null);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q) ||
          s.terpenes.some((t) => t.toLowerCase().includes(q)) ||
          (s.effects || []).some((e) => e.toLowerCase().includes(q)) ||
          (s.flavors || []).some((f) => f.toLowerCase().includes(q)) ||
          (s.genetics || "").toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => (b.dispensary_count ?? 0) - (a.dispensary_count ?? 0)).slice(0, 12);
  }, [catalog, searchQuery]);

  const bestDeal = useMemo(() => {
    if (!catalog) return null;
    const withSpread = catalog.strains
      .filter((s) => s.price_min && s.price_max && s.price_max > s.price_min)
      .sort((a, b) => ((b.price_max! - b.price_min!) - (a.price_max! - a.price_min!)));
    return withSpread[0] || null;
  }, [catalog]);

  return (
    <div className="min-h-screen bg-background">
      <HomePageSEO />
      <Navbar />

      {/* Hero Section — Mobile-first responsive */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="relative container py-10 sm:py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4 sm:mb-6">
              <Clock className="w-3 h-3" />
              Updated {displayStats.lastUpdated}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-foreground leading-[1.1] mb-3 sm:mb-4">
              Find the Cheapest{" "}
              <span className="text-primary">Cannabis</span>{" "}
              <span className="block sm:inline">Near You</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mb-6 sm:mb-8">
              Compare prices across {displayStats.totalDispensaries} Maryland dispensaries.{" "}
              <span className="font-price text-primary">{displayStats.totalStrains.toLocaleString()}</span> strains tracked.
            </p>

            {/* Search Bar — Mobile: stacked, Desktop: inline */}
            <div className="max-w-xl mb-8 sm:mb-10">
              <div className="flex flex-col sm:flex-row items-stretch bg-card border border-border/50 rounded-lg overflow-hidden focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10 transition-all">
                <div className="flex items-center flex-1">
                  <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search strain, brand, or terpene..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent px-3 sm:px-4 py-3.5 sm:py-4 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <Link href="/compare" className="sm:shrink-0">
                  <button className="w-full sm:w-auto px-6 py-3.5 sm:py-4 bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover active:opacity-90 transition-colors shadow-cta">
                    Find Deals
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards — Mobile: horizontal scroll, Desktop: grid */}
          <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
            <div className="bg-card/80 backdrop-blur border border-border/30 rounded-lg p-4 sm:p-5 min-w-[200px] sm:min-w-0 snap-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-savings flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-savings" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lowest 8th in MD</p>
                  <p className="font-price text-xl sm:text-2xl font-bold text-foreground">${displayStats.lowestPrice}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur border border-border/30 rounded-lg p-4 sm:p-5 min-w-[200px] sm:min-w-0 snap-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Average Price</p>
                  <p className="font-price text-xl sm:text-2xl font-bold text-foreground">${displayStats.avgPrice}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur border border-border/30 rounded-lg p-4 sm:p-5 min-w-[200px] sm:min-w-0 snap-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
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

      {/* Deal Digest Email Capture Banner */}
      <DealDigestBanner
        totalStrains={displayStats.totalStrains}
        totalDispensaries={displayStats.totalDispensaries}
      />

      {/* Deals Grid */}
      <section className="container py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground">
            Most Available Strains
          </h2>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Leaf className="w-4 h-4" />
            <span>{displayStats.totalStrains.toLocaleString()} verified strains</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading catalog...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredStrains.map((strain) => (
              <DealCard key={strain.id} strain={strain} />
            ))}
          </div>
        )}

        {!loading && filteredStrains.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No strains found.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-primary text-sm hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* View All Link */}
        <div className="flex justify-center mt-8 sm:mt-10">
          <Link href="/compare" className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover active:opacity-90 transition-all shadow-cta">
            Browse All {displayStats.totalStrains.toLocaleString()} Strains
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Ticker Bar */}
      <div className="border-t border-border/30 bg-card/50 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap py-3">
          <span className="inline-flex items-center gap-6 text-xs text-muted-foreground">
            <span><span className="font-price text-primary">{displayStats.totalStrains.toLocaleString()}</span> strains verified</span>
            <span className="text-border">|</span>
            <span><span className="font-price text-primary">{displayStats.totalDispensaries}</span> dispensaries tracked</span>
            <span className="text-border">|</span>
            <span><span className="font-price text-primary">{displayStats.totalBrands}</span> brands verified</span>
            <span className="text-border">|</span>
            <span>Validation score: <span className="font-price text-savings">{displayStats.validationScore}%</span></span>
            <span className="text-border">|</span>
            {bestDeal && (
              <>
                <span>Best deal: <span className="text-foreground">{bestDeal.name}</span> from <span className="font-price text-savings">${bestDeal.price_min}</span></span>
                <span className="text-border">|</span>
              </>
            )}
            <span>Data updates every Tuesday at 3:00 AM EST</span>
          </span>
        </div>
      </div>

      <Footer />
    </div>
  );
}

```

---

## 2. `client/src/pages/CompareStrains.tsx`

**Lines:** 476

```tsx
/*
 * StrainScout MD — Compare Strains Page
 * Design: Botanical Data Lab
 * Filterable strain explorer with side-by-side comparison tool
 * Powered by real verified catalog data (2,220 strains, v6)
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Search, X, ArrowUpDown, GitCompareArrows, Loader2, Beaker } from "lucide-react";
import { StrainVerificationSummary } from "@/components/VerificationBadge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import CompareInlineCTA from "@/components/CompareInlineCTA";
import { ComparePageSEO } from "@/components/SEO";
import { trackPageViewed, trackPriceCompared, trackFilterApplied, trackStrainSearched } from "@/lib/analytics";

const COMPARE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/compare-bg-jmjdsZ6AB248TzE9oQh8p3.webp";

type SortKey = "name" | "thc" | "price" | "dispensaries" | "brand";

export default function CompareStrains() {
  const { catalog, loading } = useCatalog();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  // Analytics: track page view
  useEffect(() => { trackPageViewed("compare_strains"); }, []);

  // Analytics: track filter changes
  useEffect(() => {
    if (typeFilter !== "All") trackFilterApplied("strain_type", typeFilter, "compare_strains");
  }, [typeFilter]);

  // Analytics: track search (debounced)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) return;
    const timer = setTimeout(() => {
      trackStrainSearched(searchQuery, 0);
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [sortBy, setSortBy] = useState<SortKey>("dispensaries");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [compareList, setCompareList] = useState<CatalogStrain[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const filtered = useMemo(() => {
    if (!catalog) return [];
    let result = catalog.strains;
    if (typeFilter !== "All") result = result.filter((s) => s.type.toLowerCase() === typeFilter.toLowerCase());
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q) ||
        s.terpenes.some((t) => t.toLowerCase().includes(q)) ||
        (s.effects || []).some((e) => e.toLowerCase().includes(q)) ||
        (s.flavors || []).some((f) => f.toLowerCase().includes(q)) ||
        (s.genetics || "").toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "thc") cmp = ((a.thc as number) || 0) - ((b.thc as number) || 0);
      else if (sortBy === "price") cmp = (a.price_min ?? 999) - (b.price_min ?? 999);
      else if (sortBy === "dispensaries") cmp = (a.dispensary_count ?? 0) - (b.dispensary_count ?? 0);
      else if (sortBy === "brand") cmp = a.brand.localeCompare(b.brand);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [catalog, searchQuery, typeFilter, sortBy, sortDir]);

  const paged = useMemo(() => filtered.slice(0, page * perPage), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  const toggleCompare = (strain: CatalogStrain) => {
    setCompareList((prev) => {
      if (prev.find((s) => s.id === strain.id)) return prev.filter((s) => s.id !== strain.id);
      if (prev.length >= 3) return prev;
      return [...prev, strain];
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
  };

  const typeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <ComparePageSEO />
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 opacity-20">
          <img src={COMPARE_BG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-background" />
        <div className="relative container py-6 sm:py-10">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground mb-1 sm:mb-2">Compare Strains</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse, filter, and compare {catalog?.strains.length.toLocaleString() ?? "2,220"} verified strains side-by-side.
          </p>
        </div>
      </section>

      <div className="container py-4 sm:py-8">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
            <div className="flex items-center bg-card border border-border/50 rounded-lg overflow-hidden">
              <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search strain, brand, terpene..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-start">
            {/* Type Filter */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-card border border-border/50 rounded-lg px-1 py-1">
              {["All", "Indica", "Sativa", "Hybrid"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t); setPage(1); }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${
                    typeFilter === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground shrink-0">{filtered.length.toLocaleString()} results</span>
          </div>

          {/* Compare Button */}
          {compareList.length > 0 && (
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-cta text-cta-foreground rounded-lg text-sm font-semibold hover:bg-cta-hover active:opacity-90 transition-colors shadow-cta"
            >
              <GitCompareArrows className="w-4 h-4" />
              Compare ({compareList.length})
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading catalog...</span>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
              <div className="col-span-1"></div>
              <button onClick={() => handleSort("name")} className="col-span-3 flex items-center gap-1 hover:text-foreground transition-colors">
                Strain <ArrowUpDown className="w-3 h-3" />
              </button>
              <button onClick={() => handleSort("brand")} className="col-span-2 flex items-center gap-1 hover:text-foreground transition-colors">
                Brand <ArrowUpDown className="w-3 h-3" />
              </button>
              <div className="col-span-1">Type</div>
              <button onClick={() => handleSort("thc")} className="col-span-1 flex items-center gap-1 hover:text-foreground transition-colors">
                THC <ArrowUpDown className="w-3 h-3" />
              </button>
              <div className="col-span-2">Terpenes</div>
              <button onClick={() => handleSort("price")} className="col-span-1 flex items-center gap-1 hover:text-foreground transition-colors">
                Price <ArrowUpDown className="w-3 h-3" />
              </button>
              <button onClick={() => handleSort("dispensaries")} className="col-span-1 flex items-center gap-1 hover:text-foreground transition-colors">
                Avail. <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>

            {/* Strain Rows */}
            <div className="divide-y divide-border/20">
              {paged.map((strain, index) => {
                const isSelected = compareList.some((s) => s.id === strain.id);
                return (
                  <div key={strain.id}>
                    {/* Inline Email CTA after row 8 */}
                    {index === 8 && (
                      <CompareInlineCTA
                        activeFilter={typeFilter}
                        totalResults={filtered.length}
                      />
                    )}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-accent/20 transition-colors items-center">
                    {/* Checkbox */}
                    <div className="col-span-1 hidden md:block">
                      <button
                        onClick={() => toggleCompare(strain)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                      </button>
                    </div>

                    {/* Name */}
                    <div className="col-span-3">
                      <Link href={`/strain/${strain.id}`} className="font-serif text-foreground hover:text-primary transition-colors">
                        {strain.name}
                      </Link>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {strain.grade === "A" ? "★ " : ""}{(strain.dispensary_count ?? 0)} dispensar{(strain.dispensary_count ?? 0) === 1 ? "y" : "ies"}
                      </p>
                    </div>

                    {/* Brand */}
                    <div className="col-span-2 hidden md:block">
                      <span className="text-xs text-muted-foreground truncate block">{strain.brand || "—"}</span>
                    </div>

                    {/* Type */}
                    <div className="col-span-1 hidden md:block">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        strain.type === "indica" ? "bg-indigo-500/15 text-indigo-400" :
                        strain.type === "sativa" ? "bg-amber-500/15 text-amber-400" :
                        "bg-emerald-500/15 text-emerald-400"
                      }`}>
                        {typeLabel(strain.type)}
                      </span>
                    </div>

                    {/* THC */}
                    <div className="col-span-1 hidden md:block">
                      <span className="font-price text-sm text-foreground">{strain.thc || "—"}</span>
                    </div>

                    {/* Terpenes */}
                    <div className="col-span-2 hidden md:flex gap-1 flex-wrap">
                      {strain.terpenes.filter(t => t !== 'Not_Found').slice(0, 2).map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded bg-accent text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Price */}
                    <div className="col-span-1 hidden md:flex md:items-center md:gap-2">
                      <span className="font-price text-lg font-bold text-foreground">
                        {strain.price_min != null ? `$${strain.price_min}` : "—"}
                      </span>
                      {strain.prices?.length > 0 && <StrainVerificationSummary prices={strain.prices} />}
                    </div>

                    {/* Dispensary Count */}
                    <div className="col-span-1 hidden md:block">
                      <span className="font-price text-sm text-primary">{(strain.dispensary_count ?? 0)}</span>
                    </div>

                    {/* Mobile Layout — card-style with touch targets */}
                    <div className="md:hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            strain.type === "indica" ? "bg-indigo-500/15 text-indigo-400" :
                            strain.type === "sativa" ? "bg-amber-500/15 text-amber-400" :
                            "bg-emerald-500/15 text-emerald-400"
                          }`}>{typeLabel(strain.type)}</span>
                          <span className="font-price text-sm">{strain.thc || "—"} THC</span>
                          {strain.brand && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{strain.brand}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-price text-lg font-bold">
                            {strain.price_min != null ? `$${strain.price_min}` : "—"}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleCompare(strain); }}
                            className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                            }`}
                          >
                            {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-6 py-3 bg-card border border-border/50 rounded-lg text-sm text-foreground hover:border-primary/30 transition-all"
                >
                  Load More ({filtered.length - paged.length} remaining)
                </button>
              </div>
            )}
          </>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No strains match your search. Try adjusting your filters.
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Modal */}
      {showCompare && compareList.length > 0 && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-start justify-center pt-4 sm:pt-10 px-3 sm:px-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-5xl w-full p-4 sm:p-6 mb-10">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="font-serif text-xl sm:text-2xl text-foreground">Side-by-Side Comparison</h2>
              <button onClick={() => setShowCompare(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground active:bg-accent">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile: horizontal scroll, Desktop: grid */}
            <div className={`flex sm:grid gap-4 sm:gap-6 overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 snap-x snap-mandatory ${compareList.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {compareList.map((s) => (
                <div key={s.id} className="space-y-4 min-w-[260px] sm:min-w-0 snap-start">
                  {/* Header */}
                  <div className="text-center pb-4 border-b border-border/30">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase mb-2 ${
                      s.type === "indica" ? "bg-indigo-500/15 text-indigo-400" :
                      s.type === "sativa" ? "bg-amber-500/15 text-amber-400" :
                      "bg-emerald-500/15 text-emerald-400"
                    }`}>{typeLabel(s.type)}</span>
                    <h3 className="font-serif text-xl text-foreground">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.brand}</p>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">THC</span>
                      <span className="font-price font-bold text-foreground">{s.thc || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lowest Price</span>
                      <span className="font-price font-bold text-savings">{s.price_min != null ? `$${s.price_min}` : "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Price</span>
                      <span className="font-price text-foreground">{s.price_avg != null ? `$${s.price_avg}` : "—"}</span>
                    </div>
                    {s.prices?.length > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Price Status</span>
                        <StrainVerificationSummary prices={s.prices} />
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dispensaries</span>
                      <span className="text-foreground">{s.dispensary_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="text-foreground">Grade {s.grade}</span>
                    </div>
                    {s.genetics && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Genetics</span>
                        <span className="text-foreground text-right text-xs max-w-[150px] truncate" title={s.genetics}>{s.genetics}</span>
                      </div>
                    )}
                  </div>

                  {/* Effects */}
                  {(s.effects || []).length > 0 && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Effects</p>
                      <div className="flex flex-wrap gap-1">
                        {(s.effects || []).map((e) => (
                          <span key={e} className="px-2 py-1 rounded bg-primary/10 text-[10px] text-primary">{e}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flavors */}
                  {(s.flavors || []).length > 0 && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Flavors</p>
                      <div className="flex flex-wrap gap-1">
                        {(s.flavors || []).map((f) => (
                          <span key={f} className="px-2 py-1 rounded bg-amber-500/10 text-[10px] text-amber-400">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Terpenes */}
                  {s.terpenes.filter(t => t && t !== 'Not_Found').length > 0 && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Terpenes</p>
                      <div className="flex flex-wrap gap-1">
                        {s.terpenes.filter(t => t && t !== 'Not_Found').map((t) => (
                          <span key={t} className="px-2 py-1 rounded bg-accent text-[10px] text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* External Links */}
                  <div className="pt-3 border-t border-border/30 flex gap-2">
                    {s.leafly_url && (
                      <a href={s.leafly_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-2 py-1.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors">Leafly</a>
                    )}
                    {s.weedmaps_url && (
                      <a href={s.weedmaps_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-2 py-1.5 rounded bg-orange-500/10 text-orange-400 text-[10px] font-medium hover:bg-orange-500/20 transition-colors">Weedmaps</a>
                    )}
                  </div>

                  <Link href={`/strain/${s.id}`} className="block text-center text-sm text-primary hover:underline pt-2">
                    View Full Profile →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Compare Tray (fixed bottom) — responsive */}
      {compareList.length > 0 && !showCompare && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border/50 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="container flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
              <span className="text-xs sm:text-sm text-muted-foreground shrink-0">Comparing:</span>
              {compareList.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-accent rounded-full text-[11px] sm:text-xs text-foreground shrink-0">
                  <span className="max-w-[80px] sm:max-w-none truncate">{s.name}</span>
                  <button onClick={() => toggleCompare(s)} className="text-muted-foreground hover:text-foreground active:text-foreground p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {compareList.length < 3 && (
                <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">+{3 - compareList.length} more</span>
              )}
            </div>
            <button
              onClick={() => setShowCompare(true)}
              className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors shrink-0"
            >
              Compare
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

```

---

## 3. `client/src/pages/MapView.tsx`

**Lines:** 1103

```tsx
/*
 * StrainScout MD — Dispensary Finder (Option C: Split-View Directory + Map)
 * Design: Botanical Data Lab
 * Left: Searchable/filterable dispensary directory with full details
 * Right: Interactive Google Map with numbered markers
 * Features: geolocation, strain filter, distance sorting, directions
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link, useSearch } from "wouter";
import {
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  Navigation,
  ExternalLink,
  ChevronDown,
  X,
  Loader2,
  Leaf,
  ArrowUpDown,
  Crosshair,
  Route,
  Maximize2,
  Minimize2,
  Clock,
  Car,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPageSEO } from "@/components/SEO";
import { MapView as GoogleMap } from "@/components/Map";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import {
  useDispensaryDirectory,
  haversineDistance,
  type DirectoryDispensary,
} from "@/hooks/useDispensaryDirectory";
import { useDriveTime } from "@/hooks/useDriveTime";
import { trackPageViewed, trackMapInteracted } from "@/lib/analytics";

// Maryland center
const MD_CENTER = { lat: 39.05, lng: -76.85 };
const MD_ZOOM = 8;

type SortMode = "distance" | "strains" | "price" | "rating" | "name";

export default function MapViewPage() {
  const { catalog, loading: catalogLoading } = useCatalog();

  // Analytics: track page view
  useEffect(() => { trackPageViewed("map"); }, []);
  const { dispensaries: directory, loading: dirLoading } =
    useDispensaryDirectory();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrain, setSelectedStrain] = useState<CatalogStrain | null>(
    null
  );
  const [strainSearchOpen, setStrainSearchOpen] = useState(false);
  const [strainSearchQuery, setStrainSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("strains");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [selectedDispensary, setSelectedDispensary] =
    useState<DirectoryDispensary | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [hoveredDispensary, setHoveredDispensary] = useState<string | null>(
    null
  );
  const [autoLocateAttempted, setAutoLocateAttempted] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState("");
  const [zipLocating, setZipLocating] = useState(false);
  const [geoLocFailed, setGeoLocFailed] = useState(false);
  // Mobile bottom sheet state (must be declared before any early returns)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Drive time hook
  const { driveTimesMap, loading: driveTimeLoading, fetchDriveTimes } = useDriveTime();

  // Refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const sidebarRef = useRef<HTMLDivElement>(null);

  const loading = catalogLoading || dirLoading;
  const strains = catalog?.strains || [];

  // Filter strains for the strain search dropdown — only show strains with dispensaries
  const strainsWithDisps = useMemo(() => {
    return strains
      .filter((s) => (s.dispensary_count ?? 0) > 0)
      .sort((a, b) => (b.dispensary_count ?? 0) - (a.dispensary_count ?? 0));
  }, [strains]);

  const filteredStrainOptions = useMemo(() => {
    if (!strainSearchQuery) return strainsWithDisps.slice(0, 20);
    const q = strainSearchQuery.toLowerCase();
    return strainsWithDisps
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [strainsWithDisps, strainSearchQuery]);

  // Compute dispensary list with distance + strain filter
  const processedDispensaries = useMemo(() => {
    let list = [...directory];

    // Add distance if user location is available
    if (userLocation) {
      list = list.map((d) => ({
        ...d,
        distance: haversineDistance(
          userLocation.lat,
          userLocation.lng,
          d.lat,
          d.lng
        ),
      }));
    }

    // Filter by search query (name, city, address)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q) ||
          d.full_address.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q)
      );
    }

    // If a strain is selected, filter to dispensaries that carry it
    // Use fuzzy matching to handle minor name differences between catalog and directory
    if (selectedStrain) {
      const strainDispNames = [
        ...(selectedStrain.dispensaries || []),
        ...(selectedStrain.prices || []).map((p) => p.dispensary),
      ];
      const strainDisps = new Set(strainDispNames);

      // Build a normalized lookup for fuzzy matching
      const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normalizedCatalogNames = new Map(
        strainDispNames.map((n) => [normalize(n), n])
      );

      const normalizedCatalogKeys = Array.from(normalizedCatalogNames.keys());

      list = list.filter((d) => {
        if (strainDisps.has(d.name)) return true;
        // Try normalized match
        const normDir = normalize(d.name);
        return normalizedCatalogKeys.some(
          (normCat) => normDir === normCat || normDir.includes(normCat) || normCat.includes(normDir)
        );
      });
    }

    // Sort
    switch (sortMode) {
      case "distance":
        list.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
        break;
      case "strains":
        list.sort((a, b) => b.strain_count - a.strain_count);
        break;
      case "price":
        list.sort(
          (a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999)
        );
        break;
      case "rating":
        list.sort((a, b) => {
          const ra = parseFloat(a.google_rating) || 0;
          const rb = parseFloat(b.google_rating) || 0;
          return rb - ra;
        });
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [directory, searchQuery, selectedStrain, sortMode, userLocation]);

  // Get the price for a specific strain at a dispensary
  const getStrainPrice = useCallback(
    (dispName: string): number | null => {
      if (!selectedStrain) return null;
      const price = selectedStrain.prices.find(
        (p) => p.dispensary === dispName
      );
      return price?.price ?? null;
    },
    [selectedStrain]
  );

  // Helper to place user marker on map
  const placeUserMarker = useCallback((loc: { lat: number; lng: number }) => {
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
    }
    if (mapRef.current && window.google) {
      const pin = document.createElement("div");
      pin.innerHTML = `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6);"></div>`;
      userMarkerRef.current =
        new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: loc,
          content: pin,
          title: "Your Location",
          zIndex: 1000,
        });
    }
  }, []);

  // Geolocation
  const requestLocation = useCallback((autoDetect = false) => {
    if (!navigator.geolocation) {
      setGeoLocFailed(true);
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setSortMode("distance");
        setLocatingUser(false);
        setGeoLocFailed(false);

        // Center map on user (only if manual request, not auto-detect)
        if (mapRef.current && !autoDetect) {
          mapRef.current.setCenter(loc);
          mapRef.current.setZoom(10);
        }

        placeUserMarker(loc);
      },
      () => {
        setLocatingUser(false);
        setGeoLocFailed(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [placeUserMarker]);

  // Zip code geocoding fallback
  const geocodeZip = useCallback((zip: string) => {
    if (!/^\d{5}$/.test(zip)) {
      setZipError("Enter a valid 5-digit zip code");
      return;
    }
    setZipError("");
    setZipLocating(true);
    if (!window.google) {
      setZipError("Maps not loaded yet");
      setZipLocating(false);
      return;
    }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { address: `${zip}, Maryland, USA` },
      (results, status) => {
        setZipLocating(false);
        if (status === "OK" && results && results[0]) {
          const loc = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          setUserLocation(loc);
          setSortMode("distance");
          if (mapRef.current) {
            mapRef.current.setCenter(loc);
            mapRef.current.setZoom(10);
          }
          placeUserMarker(loc);
        } else {
          setZipError("Zip code not found in Maryland");
        }
      }
    );
  }, [placeUserMarker]);

  // Read URL query params (?strain=xxx&locate=true)
  const searchString = useSearch();
  const urlParamsProcessed = useRef(false);

  useEffect(() => {
    if (urlParamsProcessed.current || loading || !catalog) return;
    const params = new URLSearchParams(searchString);
    const strainParam = params.get("strain");
    const locateParam = params.get("locate");

    if (strainParam) {
      const match = catalog.strains.find((s) => s.id === strainParam);
      if (match) {
        setSelectedStrain(match);
        urlParamsProcessed.current = true;
      }
    }

    if (locateParam === "true") {
      requestLocation(false);
      urlParamsProcessed.current = true;
    }
  }, [loading, catalog, searchString, requestLocation]);

  // Auto-detect location on first visit
  useEffect(() => {
    if (autoLocateAttempted || loading) return;
    setAutoLocateAttempted(true);
    // Check if geolocation permission was previously granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          requestLocation(true);
        }
      }).catch(() => {
        // permissions API not supported, skip auto-detect
      });
    }
  }, [autoLocateAttempted, loading, requestLocation]);

  // Fetch drive times when user location changes and dispensaries are loaded
  useEffect(() => {
    if (userLocation && processedDispensaries.length > 0) {
      fetchDriveTimes(userLocation, processedDispensaries, 15);
    }
  }, [userLocation, processedDispensaries, fetchDriveTimes]);

  // Create a marker pin element
  const createMarkerContent = useCallback(
    (index: number, dispensary: DirectoryDispensary, isSelected: boolean) => {
      const hasStrain = selectedStrain
        ? selectedStrain.prices.some((p) => p.dispensary === dispensary.name) ||
          (selectedStrain.dispensaries || []).includes(dispensary.name)
        : true;

      const price = getStrainPrice(dispensary.name);
      const isGoodDeal =
        price !== null &&
        selectedStrain?.price_avg &&
        price <= selectedStrain.price_avg * 0.85;

      const bgColor = !hasStrain
        ? "#4b5563"
        : isGoodDeal
          ? "#22c55e"
          : isSelected
            ? "#3b82f6"
            : "#10b981";

      const size = isSelected ? 36 : 28;

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width:${size}px;height:${size}px;
          background:${bgColor};
          border:2px solid white;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:${isSelected ? 14 : 11}px;font-weight:700;color:white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          transition:all 0.2s;
          cursor:pointer;
        ">${index + 1}</div>
      `;
      return el;
    },
    [selectedStrain, getStrainPrice]
  );

  // Build info window content
  const buildInfoContent = useCallback(
    (d: DirectoryDispensary) => {
      const price = getStrainPrice(d.name);
      const ratingNum = parseFloat(d.google_rating) || 0;
      const stars = "★".repeat(Math.round(ratingNum)) + "☆".repeat(5 - Math.round(ratingNum));

      return `
        <div style="font-family:'Space Grotesk',system-ui,sans-serif;max-width:280px;padding:4px;">
          <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111;">${d.name}</h3>
          <p style="margin:0 0 4px;font-size:12px;color:#555;">${d.full_address}</p>
          ${d.phone ? `<p style="margin:0 0 4px;font-size:12px;color:#555;">📞 ${d.phone}</p>` : ""}
          ${ratingNum > 0 ? `<p style="margin:0 0 6px;font-size:12px;color:#f59e0b;">${stars} <span style="color:#555;">${d.google_rating}</span></p>` : ""}
          <p style="margin:0 0 6px;font-size:12px;color:#555;">${d.strain_count} strains available</p>
          ${driveTimesMap.get(d.name) ? `<p style="margin:0 0 6px;font-size:12px;color:#f59e0b;font-weight:600;">🚗 ${driveTimesMap.get(d.name)!.driveTime} (${driveTimesMap.get(d.name)!.driveDistance})</p>` : ""}
          ${price !== null ? `<p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#10b981;font-family:'JetBrains Mono',monospace;">$${price} <span style="font-size:11px;font-weight:400;color:#555;">for ${selectedStrain?.name}</span></p>` : ""}
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.full_address)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#10b981;color:white;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">🧭 Directions</a>
            ${d.website ? `<a href="${d.website}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#3b82f6;color:white;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">🌐 Website</a>` : ""}
          </div>
        </div>
      `;
    },
    [selectedStrain, getStrainPrice, driveTimesMap]
  );

  // Update markers when dispensaries change
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    // Clear existing markers
    for (const m of markersRef.current) {
      m.map = null;
    }
    markersRef.current = [];

    // Close info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    // Create new markers
    processedDispensaries.forEach((d, i) => {
      if (!d.lat || !d.lng) return;

      const content = createMarkerContent(
        i,
        d,
        selectedDispensary?.name === d.name
      );

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: d.lat, lng: d.lng },
        content,
        title: d.name,
        zIndex: selectedDispensary?.name === d.name ? 100 : 10,
      });

      marker.addListener("click", () => {
        setSelectedDispensary(d);

        if (!infoWindowRef.current) {
          infoWindowRef.current = new google.maps.InfoWindow();
        }
        infoWindowRef.current.setContent(buildInfoContent(d));
        infoWindowRef.current.open({
          anchor: marker,
          map: mapRef.current!,
        });

        // Scroll sidebar to this dispensary
        const el = document.getElementById(`disp-card-${d.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });

      markersRef.current.push(marker);
    });
  }, [
    processedDispensaries,
    selectedDispensary,
    createMarkerContent,
    buildInfoContent,
  ]);

  // Update markers when data changes
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Handle map ready
  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      updateMarkers();
    },
    [updateMarkers]
  );

  // Click a dispensary card in the sidebar
  const handleCardClick = useCallback(
    (d: DirectoryDispensary) => {
      setSelectedDispensary(d);

      if (mapRef.current) {
        mapRef.current.panTo({ lat: d.lat, lng: d.lng });
        mapRef.current.setZoom(13);
      }

      // Find the marker and open info window
      const idx = processedDispensaries.findIndex(
        (pd) => pd.name === d.name
      );
      if (idx >= 0 && markersRef.current[idx] && infoWindowRef.current) {
        infoWindowRef.current.setContent(buildInfoContent(d));
        infoWindowRef.current.open({
          anchor: markersRef.current[idx],
          map: mapRef.current!,
        });
      }
    },
    [processedDispensaries, buildInfoContent]
  );

  // Clear strain filter
  const clearStrainFilter = useCallback(() => {
    setSelectedStrain(null);
    setStrainSearchQuery("");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">
            Loading dispensary data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <MapPageSEO />
      <Navbar />

      {/* Search & Filter Bar */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search dispensaries, cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-2 sm:py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Strain filter */}
            <div className="relative">
              {selectedStrain ? (
                <div className="flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-lg px-4 py-2.5">
                  <Leaf className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground font-medium truncate max-w-[180px]">
                    {selectedStrain.name}
                  </span>
                  <button
                    onClick={clearStrainFilter}
                    className="text-muted-foreground hover:text-foreground ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setStrainSearchOpen(!strainSearchOpen)}
                  className="flex items-center gap-2 bg-background border border-border/50 rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <Leaf className="w-4 h-4" />
                  Filter by Strain
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}

              {strainSearchOpen && !selectedStrain && (
                <div
                  className="absolute top-full mt-1 right-0 w-80 bg-card border border-border/50 rounded-lg shadow-xl overflow-hidden"
                  style={{ zIndex: 9999 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-border/30">
                    <input
                      type="text"
                      placeholder="Type a strain name..."
                      value={strainSearchQuery}
                      onChange={(e) => setStrainSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredStrainOptions.map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStrain(s);
                          setStrainSearchOpen(false);
                          setStrainSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="text-foreground">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.type} · {s.dispensary_count} disp.
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Location button */}
            <button
              onClick={() => requestLocation()}
              disabled={locatingUser}
              className="flex items-center justify-center gap-2 bg-background border border-border/50 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-muted-foreground hover:text-primary hover:border-primary/30 active:bg-accent transition-colors disabled:opacity-50"
            >
              {locatingUser ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {userLocation ? "Update Location" : "Use My Location"}
              </span>
            </button>
          </div>

          {/* Zip code fallback — shown when geolocation fails or user prefers zip */}
          {(geoLocFailed || !userLocation) && (
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="Zip code"
                  value={zipCode}
                  onChange={(e) => {
                    setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5));
                    setZipError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") geocodeZip(zipCode); }}
                  className="w-24 bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={() => geocodeZip(zipCode)}
                disabled={zipLocating || zipCode.length < 5}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
              >
                {zipLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Go"}
              </button>
              {geoLocFailed && !userLocation && (
                <span className="text-[10px] text-muted-foreground">Location unavailable — enter your zip</span>
              )}
              {zipError && (
                <span className="text-[10px] text-red-400">{zipError}</span>
              )}
            </div>
          )}

          {/* Sort + Stats Row */}
          <div className="flex items-center justify-between mt-2 sm:mt-3">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground mr-0.5 sm:mr-1 shrink-0 hidden sm:inline">
                Sort:
              </span>
              {(
                [
                  { key: "distance", label: "Distance", needsLoc: true },
                  { key: "strains", label: "Most Strains" },
                  { key: "price", label: "Lowest Price" },
                  { key: "rating", label: "Rating" },
                  { key: "name", label: "A–Z" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === "distance" && !userLocation) {
                      requestLocation(false);
                    }
                    setSortMode(opt.key);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    sortMode === opt.key
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  } ${opt.key === "distance" && !userLocation ? "opacity-50" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {processedDispensaries.length} dispensar
              {processedDispensaries.length === 1 ? "y" : "ies"}
              {selectedStrain && (
                <> carrying <span className="text-primary">{selectedStrain.name}</span></>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Split View (Desktop) / Full Map + Bottom Sheet (Mobile) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Directory Sidebar — hidden on mobile, shown as bottom sheet instead */}
        <div
          ref={sidebarRef}
          className={`hidden md:block overflow-y-auto border-r border-border/30 transition-all duration-300 ${
            mapExpanded ? "w-0 opacity-0 overflow-hidden" : "lg:w-[420px] xl:w-[480px]"
          }`}
        >
          {/* Nearest Dispensary Quick Card */}
          {userLocation && processedDispensaries.length > 0 && sortMode === "distance" && (() => {
            const nearest = processedDispensaries[0];
            const dt = driveTimesMap.get(nearest.name);
            return (
              <div
                className="px-5 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-all"
                onClick={() => handleCardClick(nearest)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Nearest Dispensary</span>
                </div>
                <h3 className="text-sm font-bold text-foreground">{nearest.name}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  {nearest.distance !== undefined && (
                    <span className="text-xs text-primary font-medium">
                      {nearest.distance < 1 ? `${(nearest.distance * 5280).toFixed(0)} ft` : `${nearest.distance.toFixed(1)} mi`}
                    </span>
                  )}
                  {dt && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                      <Car className="w-3 h-3" />
                      {dt.driveTime}
                    </span>
                  )}
                  {driveTimeLoading && !dt && (
                    <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                  )}
                  <span className="text-xs text-muted-foreground">{nearest.strain_count} strains</span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nearest.full_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 text-xs rounded-md bg-cta text-cta-foreground font-semibold hover:bg-cta-hover transition-colors shadow-cta"
                >
                  <Route className="w-3 h-3" />
                  Get Directions
                </a>
              </div>
            );
          })()}

          {processedDispensaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">
                No dispensaries match your search.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  clearStrainFilter();
                }}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            processedDispensaries.map((d, i) => {
              const price = getStrainPrice(d.name);
              const ratingNum = parseFloat(d.google_rating) || 0;
              const isSelected = selectedDispensary?.name === d.name;
              const isHovered = hoveredDispensary === d.name;

              return (
                <div
                  key={d.id}
                  id={`disp-card-${d.id}`}
                  onClick={() => handleCardClick(d)}
                  onMouseEnter={() => setHoveredDispensary(d.name)}
                  onMouseLeave={() => setHoveredDispensary(null)}
                  className={`border-b border-border/20 px-5 py-4 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : isHovered
                        ? "bg-accent/50"
                        : "hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Number badge */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-emerald-800/50 text-emerald-400"
                      }`}
                    >
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + Rating */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground leading-tight">
                          {d.name}
                        </h3>
                        {ratingNum > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-foreground font-medium">
                              {d.google_rating}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Address */}
                      <p className="text-xs text-muted-foreground mt-1">
                        {d.full_address}
                      </p>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {d.distance !== undefined && (
                          <span className="text-xs text-primary font-medium">
                            {d.distance < 1
                              ? `${(d.distance * 5280).toFixed(0)} ft`
                              : `${d.distance.toFixed(1)} mi`}
                          </span>
                        )}
                        {driveTimesMap.get(d.name) && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                            <Car className="w-3 h-3" />
                            {driveTimesMap.get(d.name)!.driveTime}
                          </span>
                        )}
                        {driveTimeLoading && d.distance !== undefined && !driveTimesMap.get(d.name) && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {d.strain_count} strains
                        </span>
                        {d.price_avg && (
                          <span className="text-xs font-price text-muted-foreground">
                            avg ${d.price_avg.toFixed(0)}
                          </span>
                        )}
                        {price !== null && (
                          <span className="text-xs font-price font-bold text-savings">
                            ${price}
                          </span>
                        )}
                      </div>

                      {/* Contact + Actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {d.phone && (
                          <a
                            href={`tel:${d.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            {d.phone}
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.full_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md bg-primary/15 text-primary font-medium hover:bg-primary/25 transition-colors"
                        >
                          <Route className="w-3 h-3" />
                          Directions
                        </a>
                        {d.website && (
                          <a
                            href={d.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Globe className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Google Map */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          {/* Map expand/collapse toggle */}
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className="absolute top-3 left-3 z-10 w-9 h-9 bg-card/90 backdrop-blur border border-border/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-md"
            title={mapExpanded ? "Show sidebar" : "Expand map"}
          >
            {mapExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Map legend */}
          <div className="absolute bottom-4 left-3 z-10 bg-card/90 backdrop-blur border border-border/50 rounded-lg px-3 py-2 shadow-md">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Dispensary
              </span>
              {selectedStrain && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  Best Deal
                </span>
              )}
              {userLocation && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  You
                </span>
              )}
            </div>
          </div>

          <GoogleMap
            className="w-full h-full"
            initialCenter={MD_CENTER}
            initialZoom={MD_ZOOM}
            onMapReady={handleMapReady}
          />
        </div>

        {/* Mobile Bottom Sheet */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-20">
          {/* Pull-up handle */}
          {!sheetOpen && (
            <button
              onClick={() => setSheetOpen(true)}
              className="w-full bg-card/95 backdrop-blur-lg border-t border-border/50 rounded-t-2xl px-4 py-3 flex flex-col items-center gap-1 active:bg-accent transition-colors"
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-sm font-medium text-foreground">
                {processedDispensaries.length} dispensar{processedDispensaries.length === 1 ? "y" : "ies"}
                {selectedStrain && <span className="text-primary"> carrying {selectedStrain.name}</span>}
              </span>
              <span className="text-xs text-muted-foreground">Tap to view list</span>
            </button>
          )}

          {/* Expanded sheet */}
          {sheetOpen && (
            <div
              className={`bg-card/98 backdrop-blur-lg border-t border-border/50 rounded-t-2xl transition-all duration-300 ${
                sheetExpanded ? "h-[80vh]" : "h-[45vh]"
              }`}
            >
              {/* Sheet header with handle */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <button
                  onClick={() => {
                    if (sheetExpanded) {
                      setSheetExpanded(false);
                    } else {
                      setSheetExpanded(true);
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground active:text-foreground"
                >
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                  {sheetExpanded ? "Collapse" : "Expand"}
                </button>
                <span className="text-xs text-muted-foreground font-medium">
                  {processedDispensaries.length} results
                </span>
                <button
                  onClick={() => { setSheetOpen(false); setSheetExpanded(false); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet content — scrollable dispensary list */}
              <div className="overflow-y-auto" style={{ height: "calc(100% - 52px)" }}>
                {processedDispensaries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <MapPin className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">No dispensaries match your search.</p>
                  </div>
                ) : (
                  processedDispensaries.map((d, i) => {
                    const price = getStrainPrice(d.name);
                    const ratingNum = parseFloat(d.google_rating) || 0;
                    const isSelected = selectedDispensary?.name === d.name;

                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          handleCardClick(d);
                          setSheetOpen(false);
                          setSheetExpanded(false);
                        }}
                        className={`border-b border-border/20 px-4 py-3.5 active:bg-accent/50 transition-colors ${
                          isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-emerald-800/50 text-emerald-400"
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold text-foreground leading-tight">{d.name}</h3>
                              <div className="flex items-center gap-2 shrink-0">
                                {price !== null && (
                                  <span className="text-sm font-price font-bold text-savings">${price}</span>
                                )}
                                {ratingNum > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-xs text-foreground">{d.google_rating}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.full_address}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {d.distance !== undefined && (
                                <span className="text-xs text-primary font-medium">
                                  {d.distance < 1 ? `${(d.distance * 5280).toFixed(0)} ft` : `${d.distance.toFixed(1)} mi`}
                                </span>
                              )}
                              {driveTimesMap.get(d.name) && (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                                  <Car className="w-3 h-3" />
                                  {driveTimesMap.get(d.name)!.driveTime}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{d.strain_count} strains</span>
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.full_address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-md bg-primary/15 text-primary font-medium active:bg-primary/25"
                              >
                                <Route className="w-3 h-3" />
                                Directions
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

```

---

## 4. `client/src/pages/StrainDetail.tsx`

**Lines:** 698

```tsx
import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, MapPin, Beaker, Store, Loader2, ShieldCheck, Tag, ExternalLink, Dna, Sparkles, Cherry, Bell, BadgeCheck } from "lucide-react";
import PriceAlertSignup from "@/components/PriceAlertSignup";
import StrainVoting from "@/components/StrainVoting";
import StrainComments from "@/components/StrainComments";
import PriceAlertModal from "@/components/PriceAlertModal";
import { VerificationBadge, StrainVerificationSummary } from "@/components/VerificationBadge";
import { PartnerVerifiedBadge, PartnerPriceBadge } from "@/components/PartnerVerifiedBadge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { StrainDetailSEO } from "@/components/SEO";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { trpc } from "@/lib/trpc";
import { trackPageViewed, trackStrainViewed, trackOutboundLinkClicked, trackDispensaryClicked, trackPriceAlertSet } from "@/lib/analytics";

const STRAIN_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strain-detail-bg-MuBFq8w4dgZqkcQFoZjuYp.webp";

/** Get the best link for a dispensary: dispensary website, or fall back to strain-level Leafly/Weedmaps */
function getDispensaryLink(strain: CatalogStrain, dispensaryName: string): { url: string; label: string; classes: string } | null {
  const website = strain.dispensary_links?.[dispensaryName];
  if (website) return { url: website, label: "Visit Website", classes: "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20" };
  if (strain.leafly_url) return { url: strain.leafly_url, label: "View on Leafly", classes: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20" };
  if (strain.weedmaps_url) return { url: strain.weedmaps_url, label: "Find on Weedmaps", classes: "bg-orange-500/10 border-orange-500/25 text-orange-400 hover:bg-orange-500/20" };
  return null;
}

export default function StrainDetail() {
  const params = useParams<{ id: string }>();
  const { catalog, loading } = useCatalog();

  const strain = useMemo(() => {
    if (!catalog) return null;
    return catalog.strains.find((s) => s.id === params.id) || null;
  }, [catalog, params.id]);

  // Alert Me modal state — must be before early returns to maintain hooks order
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  // Partner data: verified dispensary slugs + partner-verified prices for this strain
  const { data: verifiedSlugs } = trpc.partners.verifiedSlugs.useQuery();
  const { data: partnerPrices } = trpc.partners.verifiedPrices.useQuery(
    { strainId: params.id },
    { enabled: !!params.id }
  );
  const verifiedSlugSet = useMemo(() => new Set(verifiedSlugs ?? []), [verifiedSlugs]);

  // Analytics: track page view + strain view
  useEffect(() => {
    trackPageViewed("strain_detail", params.id);
  }, [params.id]);
  useEffect(() => {
    if (strain) {
      trackStrainViewed(strain.id, strain.name, strain.type, strain.thc ? String(strain.thc) + "%" : undefined);
    }
  }, [strain]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading strain data...</span>
        </div>
      </div>
    );
  }

  if (!strain) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">Strain Not Found</h1>
          <Link href="/compare" className="text-primary hover:underline">Browse all strains &rarr;</Link>
        </div>
      </div>
    );
  }

  const typeLabel = strain.type.charAt(0).toUpperCase() + strain.type.slice(1);
  const terpenes = strain.terpenes.filter((t) => t && t !== "Not_Found");
  const effects = strain.effects || [];
  const flavors = strain.flavors || [];

  const similar = (() => {
    if (!catalog) return [];
    return catalog.strains
      .filter((s) => s.id !== strain.id)
      .map((s) => ({
        ...s,
        similarity:
          (s.type === strain.type ? 30 : 0) +
          s.terpenes.filter((t) => strain.terpenes.includes(t)).length * 20 +
          (s.brand === strain.brand ? 15 : 0),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);
  })();

  const dispensaryDetails = catalog?.dispensaries || [];
  const dispLinks = strain.dispensary_links || {};

  // Count dispensaries with direct website links
  const withWebsites = strain.dispensaries.filter(d => strain.dispensary_links?.[d]).length;

  return (
    <div className="min-h-screen bg-background">
      <StrainDetailSEO
        name={strain.name}
        brand={strain.brand}
        type={strain.type}
        thc={strain.thc ? `${strain.thc}%` : undefined}
        priceMin={strain.price_min ?? undefined}
        priceMax={strain.price_max ?? undefined}
        slug={params.id || strain.id}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 opacity-30">
          <img src={STRAIN_BG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        <div className="relative container py-5 sm:py-8">
          <Link href="/compare" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 sm:mb-4 transition-colors active:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to all strains
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  strain.type.toLowerCase() === "indica" ? "bg-indigo-500/15 text-indigo-400" :
                  strain.type.toLowerCase() === "sativa" ? "bg-amber-500/15 text-amber-400" :
                  "bg-emerald-500/15 text-emerald-400"
                }`}>{typeLabel}</span>
                {strain.brand && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                    <Tag className="w-3 h-3" />
                    {strain.brand}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  strain.grade === "A" ? "bg-primary/15 text-primary" :
                  strain.grade === "B" ? "bg-blue-500/15 text-blue-400" :
                  "bg-yellow-500/15 text-yellow-400"
                }`}>
                  Grade {strain.grade}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl text-foreground mb-2 sm:mb-3">{strain.name}</h1>

              {/* External Links Row */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {strain.leafly_url && (
                  <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    View on Leafly
                    {strain.leafly_verified && <span className="ml-1 text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded-full">Verified</span>}
                  </a>
                )}
                {strain.weedmaps_url && (
                  <a href={strain.weedmaps_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    Find on Weedmaps
                    {strain.weedmaps_verified && <span className="ml-1 text-[9px] bg-orange-500/20 px-1.5 py-0.5 rounded-full">Verified</span>}
                  </a>
                )}
                {(strain.dispensary_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                    <Store className="w-3 h-3" />
                    {strain.dispensary_count} dispensar{(strain.dispensary_count ?? 0) === 1 ? "y" : "ies"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              {strain.thc > 0 && (
                <div className="text-center">
                  <p className="font-price text-2xl sm:text-3xl font-bold text-foreground">{strain.thc}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">THC</p>
                </div>
              )}
              {strain.price_min != null && (
                <div className="text-center">
                  <p className="font-price text-2xl sm:text-3xl font-bold text-savings">${strain.price_min}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">From</p>
                </div>
              )}
              {strain.prices.length > 0 && (
                <div className="text-center">
                  <StrainVerificationSummary prices={strain.prices} />
                  <p className="text-[10px] text-muted-foreground uppercase mt-1">Price Status</p>
                </div>
              )}
              {/* Alert Me Button */}
              <button
                onClick={() => {
                  setAlertModalOpen(true);
                  trackPriceAlertSet(strain.id, strain.name, 0); // track modal open
                }}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-cta/10 border border-cta/20 hover:bg-cta/20 transition-colors group"
              >
                <Bell className="w-5 h-5 text-cta group-hover:animate-bounce" />
                <span className="text-[10px] text-cta font-medium uppercase">Alert Me</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Price Alert Modal */}
      <PriceAlertModal
        open={alertModalOpen}
        onOpenChange={setAlertModalOpen}
        strainId={strain.id}
        strainName={strain.name}
        currentPrice={strain.price_min}
        dispensaries={strain.dispensaries}
      />

      <div className="container py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Description */}
            {strain.description && strain.description.length > 10 && (
              <div className="bg-card border border-border/30 rounded-lg p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{strain.description}</p>
              </div>
            )}

            {/* Genetics */}
            {strain.genetics && strain.genetics.length > 3 && (
              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <Dna className="w-4 h-4 text-primary" />
                  <h2 className="font-serif text-xl text-foreground">Genetics / Lineage</h2>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-foreground">{strain.genetics}</p>
                </div>
              </div>
            )}

            {/* Effects & Flavors */}
            {(effects.length > 0 || flavors.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {effects.length > 0 && (
                  <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="font-serif text-lg text-foreground">Effects</h3>
                    </div>
                    <div className="p-5 flex flex-wrap gap-2">
                      {effects.map((e) => (
                        <span key={e} className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {flavors.length > 0 && (
                  <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                      <Cherry className="w-4 h-4 text-primary" />
                      <h3 className="font-serif text-lg text-foreground">Flavors</h3>
                    </div>
                    <div className="p-5 flex flex-wrap gap-2">
                      {flavors.map((fl) => (
                        <span key={fl} className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                          {fl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prices by Dispensary — with Buy Now links */}
            {strain.prices.length > 0 && (
              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                  <h2 className="font-serif text-xl text-foreground">Prices by Dispensary</h2>
                  <span className="text-xs text-muted-foreground">{strain.prices.length} dispensar{strain.prices.length === 1 ? "y" : "ies"}</span>
                </div>
                <div className="divide-y divide-border/20">
                  {strain.prices.map((p, i) => {
                    const link = getDispensaryLink(strain, p.dispensary);
                    return (
                      <div key={`${p.dispensary}-${i}`} className="px-4 sm:px-5 py-3 hover:bg-accent/10 transition-colors">
                        {/* Desktop: single row */}
                        <div className="hidden sm:flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            i === 0 ? "bg-savings/20 text-savings" : "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground truncate">{p.dispensary}</p>
                            <p className="text-[10px] text-muted-foreground">{p.source || "Flower"}</p>
                          </div>
                          <span className={`font-price text-lg font-bold shrink-0 ${i === 0 ? "text-savings" : "text-foreground"}`}>
                            ${p.price}
                          </span>
                          <VerificationBadge
                            timestamp={p.last_verified}
                            dispensaryName={p.dispensary}
                            compact
                          />
                          {link && (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors border ${link.classes}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {link.label}
                            </a>
                          )}
                        </div>
                        {/* Mobile: stacked card */}
                        <div className="sm:hidden">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                i === 0 ? "bg-savings/20 text-savings" : "bg-muted text-muted-foreground"
                              }`}>{i + 1}</span>
                              <p className="text-sm text-foreground truncate">{p.dispensary}</p>
                            </div>
                            <span className={`font-price text-lg font-bold shrink-0 ${i === 0 ? "text-savings" : "text-foreground"}`}>
                              ${p.price}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-7">
                            <VerificationBadge
                              timestamp={p.last_verified}
                              dispensaryName={p.dispensary}
                              compact
                            />
                            {link && (
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border active:scale-95 ${link.classes}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                {link.label}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dispensary Availability — with ordering links */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  <h2 className="font-serif text-xl text-foreground">Available At</h2>
                </div>
                <div className="flex items-center gap-2">
                  {withWebsites > 0 && (
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {withWebsites} with websites
                    </span>
                  )}
                  <Link
                    href={`/map?strain=${strain.id}&locate=true`}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-cta bg-cta/10 px-2 py-0.5 rounded-full hover:bg-cta/20 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    Find Nearest
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-border/20">
                {strain.dispensaries.map((dName) => {
                  const dInfo = dispensaryDetails.find((d) => d.name === dName);
                  const dPrices = strain.prices.filter((p) => p.dispensary === dName);
                  const lowestPrice = dPrices.length > 0 ? Math.min(...dPrices.map((p) => p.price)) : null;
                  const dUrl = dispLinks[dName] || (dInfo?.website) || "";

                  return (
                    <div key={dName} className="px-4 sm:px-5 py-3 hover:bg-accent/10 transition-colors">
                      {/* Desktop: single row */}
                      <div className="hidden sm:flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/dispensary/${dName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} className="text-sm text-foreground hover:text-primary transition-colors truncate block">{dName}</Link>
                          {dInfo?.city && (
                            <p className="text-[10px] text-muted-foreground">{dInfo.city}</p>
                          )}
                        </div>
                        {lowestPrice != null && (
                          <span className="font-price text-sm font-bold text-foreground shrink-0">${lowestPrice}</span>
                        )}
                        {verifiedSlugSet.has(dName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) && (
                          <PartnerVerifiedBadge compact />
                        )}
                        {dPrices[0]?.last_verified && (
                          <VerificationBadge
                            timestamp={dPrices[0].last_verified}
                            dispensaryName={dName}
                            compact
                          />
                        )}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {dUrl && (
                            <a href={dUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                              Website
                            </a>
                          )}
                          {strain.leafly_url && (
                            <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                              Leafly
                            </a>
                          )}
                          {strain.weedmaps_url && (
                            <a href={strain.weedmaps_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 transition-colors">
                              Weedmaps
                            </a>
                          )}
                        </div>
                      </div>
                      {/* Mobile: stacked card */}
                      <div className="sm:hidden">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <Link href={`/dispensary/${dName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} className="text-sm text-foreground hover:text-primary transition-colors truncate">{dName}</Link>
                            {verifiedSlugSet.has(dName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) && (
                              <PartnerVerifiedBadge compact />
                            )}
                          </div>
                          {lowestPrice != null && (
                            <span className="font-price text-sm font-bold text-foreground shrink-0">${lowestPrice}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 ml-5.5 flex-wrap">
                          {dPrices[0]?.last_verified && (
                            <VerificationBadge
                              timestamp={dPrices[0].last_verified}
                              dispensaryName={dName}
                              compact
                            />
                          )}
                          {dUrl && (
                            <a href={dUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 active:bg-blue-500/20 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                              Website
                            </a>
                          )}
                          {strain.leafly_url && (
                            <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 active:bg-emerald-500/20 transition-colors">
                              Leafly
                            </a>
                          )}
                          {strain.weedmaps_url && (
                            <a href={strain.weedmaps_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-orange-500/10 border border-orange-500/25 text-orange-400 active:bg-orange-500/20 transition-colors">
                              Weedmaps
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {strain.dispensaries.length === 0 && (
                  <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No dispensary data available for this strain.
                  </div>
                )}
              </div>
            </div>

            {/* Partner Verified Prices */}
            {partnerPrices && partnerPrices.length > 0 && (
              <div className="bg-card border border-primary/20 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-primary/20 bg-primary/5 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                  <h3 className="font-serif text-lg text-foreground">Partner Verified Prices</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">Submitted by dispensary partners</span>
                </div>
                <div className="p-4 space-y-2">
                  {partnerPrices.map((pp, i) => (
                    <PartnerPriceBadge
                      key={i}
                      price={pp.price}
                      unit={pp.unit}
                      dispensaryName={pp.dispensaryName}
                      submittedAt={pp.submittedAt}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Price Alert Signup — High-intent capture point */}
            <PriceAlertSignup
              strainId={strain.id}
              strainName={strain.name}
              currentLowest={strain.price_min}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Terpene Profile */}
            {terpenes.length > 0 && (
              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-primary" />
                  <h3 className="font-serif text-lg text-foreground">Terpene Profile</h3>
                </div>
                <div className="p-5 flex flex-wrap gap-2">
                  {terpenes.map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-full bg-accent border border-border/30 text-sm text-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-card border border-border/30 rounded-lg p-5 space-y-3">
              {strain.price_avg != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Price</span>
                  <span className="font-price font-bold text-foreground">${strain.price_avg}</span>
                </div>
              )}
              {strain.price_min != null && strain.price_max != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price Range</span>
                  <span className="font-price text-foreground">${strain.price_min} &ndash; ${strain.price_max}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dispensaries</span>
                <span className="text-foreground">{strain.dispensary_count ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">With Websites</span>
                <span className="text-blue-400">{withWebsites} available</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brand</span>
                <span className="text-foreground">{strain.brand || "Unknown"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data Confidence</span>
                <span className={`font-bold ${
                  strain.grade === "A" ? "text-primary" :
                  strain.grade === "B" ? "text-blue-400" :
                  "text-yellow-400"
                }`}>Grade {strain.grade}</span>
              </div>
              {strain.price_min != null && strain.price_max != null && (
                <div className="h-1.5 rounded-full price-bar opacity-60 mt-2" />
              )}
            </div>

            {/* Cross-Reference Links */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-primary" />
                <h3 className="font-serif text-lg text-foreground">Cross-Reference</h3>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground mb-3">Verify this strain's data on external sources:</p>
                {strain.leafly_url && (
                  <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">L</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-emerald-400 transition-colors">Leafly</p>
                      <p className="text-[10px] text-muted-foreground truncate">Reviews, photos, lab data</p>
                    </div>
                    {strain.leafly_verified ? <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full shrink-0">Verified</span> : <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />}
                  </a>
                )}
                {strain.weedmaps_url && (
                  <a href={strain.weedmaps_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-500/5 border border-orange-500/15 hover:bg-orange-500/10 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">W</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-orange-400 transition-colors">Weedmaps</p>
                      <p className="text-[10px] text-muted-foreground truncate">Nearby menus, deals, ordering</p>
                    </div>
                    {strain.weedmaps_verified ? <span className="ml-auto text-[9px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full shrink-0">Verified</span> : <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />}
                  </a>
                )}
                {Object.keys(dispLinks).length > 0 && (
                  <div className="pt-2 border-t border-border/20">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Dispensary Websites</p>
                    <div className="space-y-1.5">
                      {Object.entries(dispLinks).slice(0, 5).map(([name, url]) => (
                        <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Store className="w-3 h-3 shrink-0" />
                          <span className="truncate">{name}</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-auto shrink-0" />
                        </a>
                      ))}
                      {Object.keys(dispLinks).length > 5 && (
                        <p className="text-[10px] text-muted-foreground">+{Object.keys(dispLinks).length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Data Quality Badge */}
            <div className="bg-card border border-border/30 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className={`w-5 h-5 shrink-0 ${
                  strain.grade === "A" ? "text-primary" :
                  strain.grade === "B" ? "text-blue-400" :
                  "text-yellow-400"
                }`} />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Data Quality: Grade {strain.grade}</p>
                  <p className="text-xs text-muted-foreground">
                    {strain.grade === "A"
                      ? "Highest confidence. Verified brand, terpenes, THC, and pricing from multiple sources."
                      : strain.grade === "B"
                      ? "High confidence. Verified brand and pricing. Some terpene or THC data may be estimated."
                      : "Limited data. Brand or pricing information may be incomplete. Use as reference only."}
                  </p>
                </div>
              </div>
            </div>

            {/* Community Voting */}
            <StrainVoting strainId={strain.id} strainName={strain.name} />

            {/* Community Reviews */}
            <StrainComments strainId={strain.id} strainName={strain.name} />

            {/* Similar Strains */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30">
                <h3 className="font-serif text-lg text-foreground">Similar Strains</h3>
              </div>
              <div className="divide-y divide-border/20">
                {similar.map((s) => (
                  <Link key={s.id} href={`/strain/${s.id}`}>
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-accent/20 transition-colors">
                      <div>
                        <p className="text-sm text-foreground">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.type} &middot; {s.brand || "Unknown"}
                        </p>
                      </div>
                      <span className="font-price text-sm font-bold text-foreground">
                        {s.price_min != null ? `$${s.price_min}` : "\u2014"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

```

---

## 5. `client/src/pages/DispensaryDirectory.tsx`

**Lines:** 279

```tsx
/**
 * StrainScout MD — Dispensary Directory
 * Filterable, sortable index of all Maryland dispensaries
 * with internal links to individual dispensary pages.
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Search, MapPin, Star, Leaf, ArrowUpDown,
  ChevronRight, Loader2, Building2, Phone, Scale
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useDispensaryDirectory, type DirectoryDispensary } from "@/hooks/useDispensaryDirectory";
import { trackFilterApplied } from "@/lib/analytics";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type SortKey = "name" | "strain_count" | "price_min" | "google_rating";

export default function DispensaryDirectory() {
  const { dispensaries, loading, error } = useDispensaryDirectory();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("strain_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Extract unique cities for filter
  const cities = useMemo(() => {
    const citySet = new Set(dispensaries.map((d) => d.city).filter(Boolean));
    return Array.from(citySet).sort();
  }, [dispensaries]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...dispensaries];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q) ||
          d.address.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q)
      );
    }

    if (cityFilter) {
      result = result.filter((d) => d.city === cityFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "strain_count":
          cmp = (a.strain_count ?? 0) - (b.strain_count ?? 0);
          break;
        case "price_min":
          cmp = (a.price_min ?? 999) - (b.price_min ?? 999);
          break;
        case "google_rating":
          cmp = parseFloat(a.google_rating || "0") - parseFloat(b.google_rating || "0");
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [dispensaries, search, cityFilter, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
    trackFilterApplied("dispensary_sort", key, "dispensary_directory");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Maryland Dispensary Directory — StrainScout MD"
        description="Browse all licensed Maryland cannabis dispensaries. Compare strain counts, prices, ratings, and find the best dispensary near you."
        path="/dispensaries"
        type="website"
      />
      <Navbar />

      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-8 sm:py-12">
          <div className="flex items-center gap-2 text-primary text-sm mb-3">
            <Building2 className="w-4 h-4" />
            <span>Dispensary Directory</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground mb-2">
            Maryland Cannabis Dispensaries
          </h1>
          <p className="text-muted-foreground max-w-2xl mb-4">
            Browse all {dispensaries.length} licensed dispensaries in Maryland.
            Compare strain selections, price ranges, and ratings to find your ideal shop.
          </p>
          <Link href="/compare/dispensaries" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/25 transition-colors">
            <Scale className="w-4 h-4" />
            Compare Dispensaries Side-by-Side
          </Link>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border/20 bg-background sticky top-0 z-20">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex items-center flex-1 bg-card border border-border/50 rounded-lg overflow-hidden focus-within:border-primary/50 transition-colors">
              <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search dispensary name, city, or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* City filter */}
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                trackFilterApplied("dispensary_city", e.target.value, "dispensary_directory");
              }}
              className="bg-card border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 min-w-[160px]"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Sort buttons */}
            <div className="flex gap-1">
              {([
                { key: "strain_count" as SortKey, label: "Strains" },
                { key: "price_min" as SortKey, label: "Price" },
                { key: "google_rating" as SortKey, label: "Rating" },
                { key: "name" as SortKey, label: "A-Z" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === key
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  {sortBy === key && (
                    <ArrowUpDown className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container py-6 sm:py-8">
        <p className="text-sm text-muted-foreground mb-4">
          {filtered.length} dispensar{filtered.length === 1 ? "y" : "ies"} found
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading dispensaries...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <DispensaryCard key={d.id} dispensary={d} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No dispensaries match your search.</p>
            <button
              onClick={() => { setSearch(""); setCityFilter(""); }}
              className="mt-4 text-primary text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

function DispensaryCard({ dispensary: d }: { dispensary: DirectoryDispensary }) {
  const slug = slugify(d.name);
  const rating = parseFloat(d.google_rating || "0");

  return (
    <Link href={`/dispensary/${slug}`}>
      <div className="group bg-card border border-border/30 rounded-lg p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {d.name}
            </h3>
            {d.brand && d.brand !== d.name && (
              <p className="text-xs text-muted-foreground mt-0.5">{d.brand}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{d.city}{d.state_zip ? `, ${d.state_zip}` : ", MD"}</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground">{d.strain_count}</span>
            <span className="text-muted-foreground">strains</span>
          </div>

          {d.price_min && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">from</span>
              <span className="font-price font-semibold text-emerald-400">${d.price_min}</span>
            </div>
          )}

          {rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-medium text-foreground">{d.google_rating}</span>
            </div>
          )}
        </div>

        {d.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/20">
            <Phone className="w-3 h-3" />
            <span>{d.phone}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

```

---

## 6. `client/src/pages/DispensaryDetail.tsx`

**Lines:** 386

```tsx
/*
 * StrainScout MD — Individual Dispensary Page
 * Shows dispensary details, available strains, price range, and map.
 * Internal links to strain pages for SEO cross-linking.
 */

import { useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  MapPin, Star, Leaf, Phone, Globe, ArrowLeft,
  Loader2, ExternalLink, Navigation, DollarSign, BadgeCheck
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import DealCard from "@/components/DealCard";
import { PartnerVerifiedBadge } from "@/components/PartnerVerifiedBadge";
import { useDispensaryDirectory, type DirectoryDispensary } from "@/hooks/useDispensaryDirectory";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { trpc } from "@/lib/trpc";
import { trackPageViewed, trackDispensaryClicked } from "@/lib/analytics";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function DispensaryDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { dispensaries, loading: dirLoading } = useDispensaryDirectory();
  const { catalog, loading: catLoading } = useCatalog();

  // Find dispensary by slug
  const dispensary = useMemo(() => {
    return dispensaries.find((d) => slugify(d.name) === slug) || null;
  }, [dispensaries, slug]);

  // Find strains available at this dispensary
  const strains = useMemo(() => {
    if (!catalog || !dispensary) return [];
    return catalog.strains
      .filter(
        (s) =>
          s.dispensaries.some(
            (d) => d.toLowerCase() === dispensary.name.toLowerCase()
          ) ||
          s.prices.some(
            (p) => p.dispensary.toLowerCase() === dispensary.name.toLowerCase()
          )
      )
      .sort((a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999));
  }, [catalog, dispensary]);

  // Price stats from strains at this dispensary — MUST be before any early return
  const priceStats = useMemo(() => {
    if (!dispensary) return null;
    const prices = strains
      .flatMap((s) =>
        s.prices
          .filter((p) => p.dispensary.toLowerCase() === dispensary.name.toLowerCase())
          .map((p) => p.price)
      )
      .filter((p) => p > 0);

    if (prices.length === 0) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
      count: prices.length,
    };
  }, [strains, dispensary]);

  // Type distribution — MUST be before any early return
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of strains) {
      counts[s.type] = (counts[s.type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [strains]);

  // Partner verification status for this dispensary
  const { data: partnerInfo } = trpc.partners.bySlug.useQuery(
    { dispensarySlug: slug },
    { enabled: !!slug }
  );

  // Track page view
  useEffect(() => {
    if (dispensary) {
      trackPageViewed("dispensary_detail", dispensary.name);
    }
  }, [dispensary]);

  const loading = dirLoading || catLoading;
  const rating = parseFloat(dispensary?.google_rating || "0");

  // --- Early returns AFTER all hooks ---

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading dispensary...</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (!dispensary) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="font-serif text-2xl text-foreground mb-4">Dispensary Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find a dispensary matching "{slug}".
          </p>
          <Link href="/dispensaries" className="text-primary hover:underline">
            Browse all dispensaries
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: dispensary.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: dispensary.address,
      addressLocality: dispensary.city,
      addressRegion: "MD",
    },
    telephone: dispensary.phone || undefined,
    url: dispensary.website || undefined,
    aggregateRating: rating > 0 ? {
      "@type": "AggregateRating",
      ratingValue: dispensary.google_rating,
      bestRating: "5",
    } : undefined,
    geo: dispensary.lat ? {
      "@type": "GeoCoordinates",
      latitude: dispensary.lat,
      longitude: dispensary.lng,
    } : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${dispensary.name} — Strains, Prices & Info | StrainScout MD`}
        description={`${dispensary.name} in ${dispensary.city}, MD carries ${strains.length} strains${priceStats ? ` starting at $${priceStats.min}` : ""}. Compare prices, view menu, and get directions.`}
        path={`/dispensary/${slug}`}
        type="website"
        jsonLd={jsonLd}
      />
      <Navbar />

      {/* Breadcrumb + Back */}
      <div className="border-b border-border/20">
        <div className="container py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dispensaries" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              All Dispensaries
            </Link>
            <span>/</span>
            <span className="text-foreground">{dispensary.name}</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">
                  {dispensary.name}
                </h1>
                {partnerInfo && (
                  <PartnerVerifiedBadge tooltip={`Verified partner since ${partnerInfo.verifiedAt ? new Date(partnerInfo.verifiedAt).toLocaleDateString() : "recently"}`} />
                )}
              </div>
              {dispensary.brand && dispensary.brand !== dispensary.name && (
                <p className="text-sm text-muted-foreground mb-3">Part of {dispensary.brand}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{dispensary.full_address || `${dispensary.address}, ${dispensary.city}, MD`}</span>
                </div>
                {rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-medium text-foreground">{dispensary.google_rating}</span>
                    <span className="text-muted-foreground">Google Rating</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {dispensary.website && (
                  <a
                    href={dispensary.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDispensaryClicked(dispensary.name, "website")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta"
                  >
                    <Globe className="w-4 h-4" />
                    Visit Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {dispensary.phone && (
                  <a
                    href={`tel:${dispensary.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border/50 text-foreground text-sm hover:border-primary/40 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {dispensary.phone}
                  </a>
                )}
                {dispensary.lat && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${dispensary.lat},${dispensary.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border/50 text-foreground text-sm hover:border-primary/40 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </a>
                )}
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 lg:w-64">
              <div className="bg-card border border-border/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Strains</span>
                </div>
                <p className="font-price text-2xl font-bold text-foreground">{strains.length}</p>
              </div>

              {priceStats && (
                <>
                  <div className="bg-card border border-border/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-muted-foreground">Lowest</span>
                    </div>
                    <p className="font-price text-2xl font-bold text-emerald-400">${priceStats.min}</p>
                  </div>

                  <div className="bg-card border border-border/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Average</span>
                    </div>
                    <p className="font-price text-2xl font-bold text-foreground">${priceStats.avg}</p>
                  </div>
                </>
              )}

              {typeBreakdown.length > 0 && (
                <div className="bg-card border border-border/30 rounded-lg p-4">
                  <span className="text-xs text-muted-foreground block mb-1">Types</span>
                  <div className="space-y-1">
                    {typeBreakdown.slice(0, 3).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{type}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Strains at this dispensary */}
      <section className="container py-8 sm:py-12">
        <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-6">
          Available Strains ({strains.length})
        </h2>

        {strains.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {strains.map((strain) => (
              <DealCard key={strain.id} strain={strain} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No strain data available for this dispensary yet.
            </p>
          </div>
        )}
      </section>

      {/* Internal links to nearby dispensaries */}
      <NearbyDispensaries current={dispensary} all={dispensaries} />

      <Footer />
    </div>
  );
}

function NearbyDispensaries({
  current,
  all,
}: {
  current: DirectoryDispensary;
  all: DirectoryDispensary[];
}) {
  const nearby = useMemo(() => {
    if (!current.lat) return [];
    return all
      .filter((d) => d.id !== current.id && d.lat)
      .map((d) => {
        const R = 3959;
        const dLat = ((d.lat - current.lat) * Math.PI) / 180;
        const dLng = ((d.lng - current.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((current.lat * Math.PI) / 180) *
            Math.cos((d.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...d, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [current, all]);

  if (nearby.length === 0) return null;

  return (
    <section className="border-t border-border/30 bg-card/20">
      <div className="container py-8 sm:py-12">
        <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-6">
          Nearby Dispensaries
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nearby.map((d) => (
            <Link key={d.id} href={`/dispensary/${slugify(d.name)}`}>
              <div className="group bg-card border border-border/30 rounded-lg p-4 hover:border-primary/40 transition-all cursor-pointer">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  {d.name}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{d.city}, MD</span>
                  <span>{d.dist.toFixed(1)} mi away</span>
                  <span>{d.strain_count} strains</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

```

---

## 7. `client/src/pages/DispensaryCompare.tsx`

**Lines:** 767

```tsx
/*
 * StrainScout MD — Dispensary Comparison Tool
 * Side-by-side comparison of 2-3 dispensaries on price, selection,
 * rating, and distance. Shared-strain price comparison table with
 * "best price" winner highlighting.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  Search, X, Plus, MapPin, Star, Leaf, DollarSign,
  Trophy, ArrowLeft, Loader2, Scale, ChevronDown,
  TrendingDown, Hash, BarChart3, Navigation
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import {
  useDispensaryDirectory,
  haversineDistance,
  type DirectoryDispensary,
} from "@/hooks/useDispensaryDirectory";
import { trackPageViewed, trackDispensaryCompared } from "@/lib/analytics";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* ── Color palette for dispensary columns ── */
const DISP_COLORS = [
  { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", ring: "ring-emerald-500/30", dot: "bg-emerald-400" },
  { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", ring: "ring-amber-500/30", dot: "bg-amber-400" },
  { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30", ring: "ring-sky-500/30", dot: "bg-sky-400" },
];

/* ── Types ── */
interface DispensaryStats {
  name: string;
  slug: string;
  directory?: DirectoryDispensary;
  strainCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  strains: { id: string; name: string; brand: string; type: string; price: number }[];
  distance?: number;
}

interface SharedStrain {
  id: string;
  name: string;
  brand: string;
  type: string;
  prices: (number | null)[];
  bestIndex: number;
  savings: number;
}

/* ── Dispensary Selector Component ── */
function DispensarySelector({
  dispensaries,
  selected,
  onSelect,
  onRemove,
  colorIndex,
  placeholder,
}: {
  dispensaries: DirectoryDispensary[];
  selected: DirectoryDispensary | null;
  onSelect: (d: DirectoryDispensary) => void;
  onRemove: () => void;
  colorIndex: number;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const color = DISP_COLORS[colorIndex];

  const filtered = useMemo(() => {
    if (!query) return dispensaries.slice(0, 20);
    const q = query.toLowerCase();
    return dispensaries
      .filter((d) => d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q))
      .slice(0, 20);
  }, [dispensaries, query]);

  if (selected) {
    return (
      <div className={`relative rounded-lg border ${color.border} ${color.bg} p-4`}>
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Remove dispensary"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
          <span className={`font-semibold text-sm ${color.text}`}>
            {selected.name}
          </span>
        </div>
        <p className="text-xs text-muted-foreground ml-5">{selected.city}, MD</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`rounded-lg border border-border/50 bg-card/50 p-4 ${open ? "ring-1 " + color.ring : ""}`}>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-card border border-border/50 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No dispensaries found</div>
            ) : (
              filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { onSelect(d); setQuery(""); setOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0"
                >
                  <div className="font-medium text-sm text-foreground">{d.name}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{d.city}, MD</span>
                    <span>{d.strain_count} strains</span>
                    {d.google_rating && d.google_rating !== "N/A" && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {d.google_rating}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({
  label,
  values,
  format,
  icon: Icon,
  winnerIndex,
}: {
  label: string;
  values: (string | number)[];
  format?: "price" | "number" | "text";
  icon: React.ElementType;
  winnerIndex?: number;
}) {
  const fmt = format || "text";
  return (
    <div className="bg-card/60 border border-border/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((v, i) => (
          <div key={i} className="text-center">
            <div className={`font-price text-lg font-bold ${i === winnerIndex ? DISP_COLORS[i].text : "text-foreground"}`}>
              {fmt === "price" ? `$${Number(v).toFixed(2)}` : v}
            </div>
            <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${DISP_COLORS[i].dot}`} />
            {i === winnerIndex && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-amber-400 font-medium">Best</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function DispensaryCompare() {
  const { catalog, loading: catalogLoading } = useCatalog();
  const { dispensaries: directory, loading: dirLoading } = useDispensaryDirectory();
  const [selected, setSelected] = useState<(DirectoryDispensary | null)[]>([null, null]);
  const [sortBy, setSortBy] = useState<"name" | "savings" | "price_asc">("savings");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    trackPageViewed("Dispensary Compare");
  }, []);

  // Try to get user location for distance comparison
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fail
      );
    }
  }, []);

  const loading = catalogLoading || dirLoading;

  // Available dispensaries (exclude already selected)
  const availableDispensaries = useMemo(() => {
    const selectedNames = new Set(selected.filter(Boolean).map((d) => d!.name));
    return directory.filter((d) => !selectedNames.has(d.name));
  }, [directory, selected]);

  const handleSelect = useCallback((index: number, d: DirectoryDispensary) => {
    setSelected((prev) => {
      const next = [...prev];
      next[index] = d;
      return next;
    });
  }, []);

  const handleRemove = useCallback((index: number) => {
    setSelected((prev) => {
      const next = [...prev];
      next[index] = null;
      // If removing from the middle, collapse
      if (index === 0 && next[1]) {
        next[0] = next[1];
        next[1] = next.length > 2 ? next[2] ?? null : null;
        if (next.length > 2) next.splice(2, 1);
      }
      return next;
    });
  }, []);

  const handleAddThird = useCallback(() => {
    setSelected((prev) => [...prev, null]);
  }, []);

  // Compute stats for each selected dispensary
  const dispensaryStats = useMemo<DispensaryStats[]>(() => {
    if (!catalog) return [];
    return selected
      .filter((d): d is DirectoryDispensary => d !== null)
      .map((d) => {
        const strains: DispensaryStats["strains"] = [];
        for (const s of catalog.strains) {
          const priceEntry = s.prices.find(
            (p) => p.dispensary.toLowerCase() === d.name.toLowerCase()
          );
          if (priceEntry && priceEntry.price > 0) {
            strains.push({
              id: s.id,
              name: s.name,
              brand: s.brand,
              type: s.type,
              price: priceEntry.price,
            });
          }
        }

        const prices = strains.map((s) => s.price).sort((a, b) => a - b);
        const medianPrice = prices.length > 0
          ? prices[Math.floor(prices.length / 2)]
          : 0;

        return {
          name: d.name,
          slug: slugify(d.name),
          directory: d,
          strainCount: strains.length,
          avgPrice: prices.length > 0
            ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
            : 0,
          minPrice: prices.length > 0 ? prices[0] : 0,
          maxPrice: prices.length > 0 ? prices[prices.length - 1] : 0,
          medianPrice,
          strains,
          distance: userLocation && d.lat && d.lng
            ? Math.round(haversineDistance(userLocation.lat, userLocation.lng, d.lat, d.lng) * 10) / 10
            : undefined,
        };
      });
  }, [catalog, selected, userLocation]);

  // Find shared strains (available at 2+ selected dispensaries)
  const sharedStrains = useMemo<SharedStrain[]>(() => {
    if (dispensaryStats.length < 2) return [];

    // Build a map of strain ID → prices at each dispensary
    const strainMap = new Map<string, { name: string; brand: string; type: string; prices: (number | null)[] }>();

    dispensaryStats.forEach((ds, i) => {
      for (const s of ds.strains) {
        let entry = strainMap.get(s.id);
        if (!entry) {
          entry = {
            name: s.name,
            brand: s.brand,
            type: s.type,
            prices: new Array(dispensaryStats.length).fill(null),
          };
          strainMap.set(s.id, entry);
        }
        entry.prices[i] = s.price;
      }
    });

    // Filter to strains available at 2+ dispensaries
    const shared: SharedStrain[] = [];
    for (const [id, entry] of Array.from(strainMap)) {
      const availableCount = entry.prices.filter((p: number | null) => p !== null).length;
      if (availableCount >= 2) {
        const validPrices = entry.prices.filter((p: number | null): p is number => p !== null);
        const bestPrice = Math.min(...validPrices);
        const worstPrice = Math.max(...validPrices);
        const bestIndex = entry.prices.indexOf(bestPrice);

        shared.push({
          id,
          name: entry.name,
          brand: entry.brand,
          type: entry.type,
          prices: entry.prices,
          bestIndex,
          savings: Math.round((worstPrice - bestPrice) * 100) / 100,
        });
      }
    }

    // Sort
    switch (sortBy) {
      case "savings":
        shared.sort((a, b) => b.savings - a.savings);
        break;
      case "price_asc":
        shared.sort((a, b) => {
          const aMin = Math.min(...a.prices.filter((p): p is number => p !== null));
          const bMin = Math.min(...b.prices.filter((p): p is number => p !== null));
          return aMin - bMin;
        });
        break;
      case "name":
        shared.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return shared;
  }, [dispensaryStats, sortBy]);

  // Track comparison when 2+ dispensaries are selected and data is ready
  useEffect(() => {
    if (dispensaryStats.length >= 2) {
      trackDispensaryCompared(
        dispensaryStats.map((d) => d.name),
        sharedStrains.length,
        sharedStrains.length > 0 ? Math.max(...sharedStrains.map((s) => s.savings)) : 0
      );
    }
  }, [dispensaryStats.length, sharedStrains.length]);

  // Winner calculations for stat cards
  const winners = useMemo(() => {
    if (dispensaryStats.length < 2) return {};
    const avgPrices = dispensaryStats.map((d) => d.avgPrice);
    const strainCounts = dispensaryStats.map((d) => d.strainCount);
    const ratings = dispensaryStats.map((d) => {
      const r = d.directory?.google_rating;
      return r && r !== "N/A" ? parseFloat(r) : 0;
    });

    return {
      lowestAvgPrice: avgPrices.indexOf(Math.min(...avgPrices.filter((p) => p > 0))),
      mostStrains: strainCounts.indexOf(Math.max(...strainCounts)),
      bestRating: ratings.some((r) => r > 0) ? ratings.indexOf(Math.max(...ratings)) : undefined,
      closest: dispensaryStats.some((d) => d.distance !== undefined)
        ? dispensaryStats
            .map((d, i) => ({ i, dist: d.distance ?? Infinity }))
            .sort((a, b) => a.dist - b.dist)[0].i
        : undefined,
    };
  }, [dispensaryStats]);

  const selectedCount = selected.filter(Boolean).length;
  const canAddThird = selected.length < 3 && selectedCount === 2;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Compare Dispensaries — StrainScout MD"
        description="Compare Maryland dispensaries side-by-side on price, strain selection, rating, and distance. Find the best dispensary for your needs."
        path="/compare/dispensaries"
      />
      <Navbar />

      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-6 sm:py-8">
          <Link href="/dispensaries" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            All Dispensaries
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">
              Compare Dispensaries
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Select 2-3 dispensaries to compare side-by-side on price, strain selection, rating, and distance.
            See which dispensary offers the best deal on strains they share.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading dispensary data...</span>
        </div>
      ) : (
        <div className="container py-6 sm:py-8">
          {/* Dispensary Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            <DispensarySelector
              dispensaries={availableDispensaries}
              selected={selected[0]}
              onSelect={(d) => handleSelect(0, d)}
              onRemove={() => handleRemove(0)}
              colorIndex={0}
              placeholder="Search first dispensary..."
            />
            <DispensarySelector
              dispensaries={availableDispensaries}
              selected={selected[1]}
              onSelect={(d) => handleSelect(1, d)}
              onRemove={() => handleRemove(1)}
              colorIndex={1}
              placeholder="Search second dispensary..."
            />
            {selected.length > 2 ? (
              <DispensarySelector
                dispensaries={availableDispensaries}
                selected={selected[2]}
                onSelect={(d) => handleSelect(2, d)}
                onRemove={() => {
                  setSelected((prev) => prev.slice(0, 2));
                }}
                colorIndex={2}
                placeholder="Search third dispensary..."
              />
            ) : canAddThird ? (
              <button
                onClick={handleAddThird}
                className="rounded-lg border border-dashed border-border/50 p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Third Dispensary
              </button>
            ) : null}
          </div>

          {/* Comparison Results */}
          {selectedCount >= 2 && dispensaryStats.length >= 2 && (
            <>
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                <StatCard
                  label="Avg Price (1/8th)"
                  values={dispensaryStats.map((d) => d.avgPrice)}
                  format="price"
                  icon={DollarSign}
                  winnerIndex={winners.lowestAvgPrice}
                />
                <StatCard
                  label="Strain Selection"
                  values={dispensaryStats.map((d) => d.strainCount)}
                  format="number"
                  icon={Leaf}
                  winnerIndex={winners.mostStrains}
                />
                <StatCard
                  label="Google Rating"
                  values={dispensaryStats.map((d) => {
                    const r = d.directory?.google_rating;
                    return r && r !== "N/A" ? r : "N/A";
                  })}
                  icon={Star}
                  winnerIndex={winners.bestRating}
                />
                {dispensaryStats.some((d) => d.distance !== undefined) ? (
                  <StatCard
                    label="Distance"
                    values={dispensaryStats.map((d) =>
                      d.distance !== undefined ? `${d.distance} mi` : "N/A"
                    )}
                    icon={Navigation}
                    winnerIndex={winners.closest}
                  />
                ) : (
                  <StatCard
                    label="Price Range"
                    values={dispensaryStats.map((d) =>
                      d.minPrice > 0 ? `$${d.minPrice}–$${d.maxPrice}` : "N/A"
                    )}
                    icon={BarChart3}
                  />
                )}
              </div>

              {/* Summary Banner */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Comparison Summary</p>
                    <p className="text-sm text-muted-foreground">
                      {sharedStrains.length > 0 ? (
                        <>
                          These dispensaries share <span className="font-price text-primary">{sharedStrains.length}</span> strains in common.
                          {sharedStrains.filter((s) => s.savings > 0).length > 0 && (
                            <> You could save up to <span className="font-price text-savings">${Math.max(...sharedStrains.map((s) => s.savings)).toFixed(2)}</span> by
                            shopping at the right one.</>
                          )}
                        </>
                      ) : (
                        <>These dispensaries don't share any strains in common. Try comparing dispensaries in the same area for more overlap.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shared Strains Table */}
              {sharedStrains.length > 0 && (
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="font-serif text-xl sm:text-2xl text-foreground">
                      Shared Strains ({sharedStrains.length})
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Sort:</span>
                      {(["savings", "price_asc", "name"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSortBy(s)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            sortBy === s
                              ? "bg-primary/20 text-primary"
                              : "bg-card border border-border/30 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {s === "savings" ? "Biggest Savings" : s === "price_asc" ? "Lowest Price" : "Name"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border/30">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-card/80 border-b border-border/30">
                          <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            Strain
                          </th>
                          {dispensaryStats.map((d, i) => (
                            <th key={d.name} className="text-center px-4 py-3 text-xs uppercase tracking-wider font-medium">
                              <div className="flex items-center justify-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${DISP_COLORS[i].dot}`} />
                                <span className={DISP_COLORS[i].text}>
                                  {d.name.length > 20 ? d.name.slice(0, 18) + "…" : d.name}
                                </span>
                              </div>
                            </th>
                          ))}
                          <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            Savings
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sharedStrains.map((strain, idx) => (
                          <tr
                            key={strain.id}
                            className={`border-b border-border/20 hover:bg-muted/30 transition-colors ${
                              idx % 2 === 0 ? "bg-card/30" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <Link
                                href={`/strain/${strain.id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {strain.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{strain.brand}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  strain.type === "Indica"
                                    ? "bg-purple-500/15 text-purple-400"
                                    : strain.type === "Sativa"
                                    ? "bg-orange-500/15 text-orange-400"
                                    : "bg-emerald-500/15 text-emerald-400"
                                }`}>
                                  {strain.type}
                                </span>
                              </div>
                            </td>
                            {strain.prices.map((price, i) => (
                              <td key={i} className="text-center px-4 py-3">
                                {price !== null ? (
                                  <span
                                    className={`font-price font-semibold ${
                                      i === strain.bestIndex && strain.savings > 0
                                        ? DISP_COLORS[i].text + " text-base"
                                        : "text-foreground"
                                    }`}
                                  >
                                    ${price.toFixed(2)}
                                    {i === strain.bestIndex && strain.savings > 0 && (
                                      <Trophy className="w-3 h-3 text-amber-400 inline ml-1 -mt-0.5" />
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </td>
                            ))}
                            <td className="text-center px-4 py-3">
                              {strain.savings > 0 ? (
                                <span className="font-price text-savings font-semibold">
                                  ${strain.savings.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">Same</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Legend */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>Best price for that strain</span>
                    </div>
                    <span>•</span>
                    <span>Savings = difference between highest and lowest price</span>
                    <span>•</span>
                    <span>— = Not available at that dispensary</span>
                  </div>
                </div>
              )}

              {/* Exclusive Strains Section */}
              <div className="mb-8">
                <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-4">
                  Exclusive Strains
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dispensaryStats.map((ds, i) => {
                    const exclusiveStrains = ds.strains.filter((s) => {
                      return !dispensaryStats.some(
                        (other, j) => j !== i && other.strains.some((os) => os.id === s.id)
                      );
                    });
                    return (
                      <div key={ds.name} className={`rounded-lg border ${DISP_COLORS[i].border} ${DISP_COLORS[i].bg} p-4`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${DISP_COLORS[i].dot}`} />
                          <span className={`font-semibold text-sm ${DISP_COLORS[i].text}`}>
                            {ds.name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {exclusiveStrains.length} exclusive
                          </span>
                        </div>
                        {exclusiveStrains.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No exclusive strains — all strains are shared with other selected dispensaries.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {exclusiveStrains.slice(0, 15).map((s) => (
                              <div key={s.id} className="flex items-center justify-between text-xs">
                                <Link
                                  href={`/strain/${s.id}`}
                                  className="text-foreground hover:text-primary transition-colors truncate mr-2"
                                >
                                  {s.name}
                                </Link>
                                <span className="font-price text-foreground shrink-0">${s.price.toFixed(2)}</span>
                              </div>
                            ))}
                            {exclusiveStrains.length > 15 && (
                              <p className="text-xs text-muted-foreground pt-1">
                                +{exclusiveStrains.length - 15} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dispensary Detail Links */}
              <div className="flex flex-wrap gap-3 justify-center">
                {dispensaryStats.map((ds, i) => (
                  <Link
                    key={ds.name}
                    href={`/dispensary/${ds.slug}`}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${DISP_COLORS[i].border} ${DISP_COLORS[i].bg} text-sm ${DISP_COLORS[i].text} hover:opacity-80 transition-opacity`}
                  >
                    <MapPin className="w-4 h-4" />
                    View {ds.name} Details
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {selectedCount < 2 && (
            <div className="text-center py-16">
              <Scale className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Select Two Dispensaries to Compare
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Use the search boxes above to find dispensaries by name or city.
                You'll see a side-by-side comparison of prices, strain selection,
                ratings, and which dispensary has the best deal on shared strains.
              </p>
            </div>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}

```

---
