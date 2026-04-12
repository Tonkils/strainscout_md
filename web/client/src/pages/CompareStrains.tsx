/*
 * StrainScout MD — Compare Strains Page
 * Design: Botanical Data Lab
 * Filterable strain explorer with side-by-side comparison tool
 * Powered by real verified catalog data (2,220 strains, v6)
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Search, X, ArrowUpDown, GitCompareArrows, Loader2, Beaker, ChevronDown, Building2 } from "lucide-react";
import { StrainVerificationSummary } from "@/components/VerificationBadge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import CompareInlineCTA from "@/components/CompareInlineCTA";
import { ComparePageSEO } from "@/components/SEO";
import { trackPageViewed, trackPriceCompared, trackFilterApplied, trackStrainSearched } from "@/lib/analytics";
import { CATEGORY_COLORS, type ProductCategory } from "@/lib/utils";

const COMPARE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/compare-bg-jmjdsZ6AB248TzE9oQh8p3.webp";

type SortKey = "name" | "thc" | "price" | "dispensaries" | "brand";

export default function CompareStrains() {
  const { catalog, loading } = useCatalog();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [quickFilter, setQuickFilter] = useState<string>("");
  const [dispensaryFilter, setDispensaryFilter] = useState<string>("");

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

  const dispensaryNames = useMemo(() => {
    if (!catalog) return [];
    return [...new Set(catalog.strains.flatMap((s) => s.dispensaries))].sort();
  }, [catalog]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    let result = catalog.strains;
    if (typeFilter !== "All") result = result.filter((s) => s.type.toLowerCase() === typeFilter.toLowerCase());
    if (categoryFilter !== "All") result = result.filter((s) => s.category === categoryFilter);
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
    if (dispensaryFilter) {
      result = result.filter((s) =>
        s.dispensaries.some((d) => d.toLowerCase() === dispensaryFilter.toLowerCase())
      );
    }
    if (quickFilter === "under30") result = result.filter((s) => (s.price_min ?? 999) < 30);
    else if (quickFilter === "under40") result = result.filter((s) => (s.price_min ?? 999) < 40);
    else if (quickFilter === "highthc") result = result.filter((s) => (s.thc as number) >= 25);
    else if (quickFilter === "indica40") result = result.filter((s) => s.type.toLowerCase() === "indica" && (s.price_min ?? 999) < 40);
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
  }, [catalog, searchQuery, typeFilter, categoryFilter, sortBy, sortDir, quickFilter, dispensaryFilter]);

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

          {/* Category Filter */}
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-card border border-border/50 rounded-lg px-1 py-1 overflow-x-auto">
              {(["All", "Flower", "Edible", "Concentrate", "Vape", "Pre-Roll", "Other"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategoryFilter(cat); setPage(1); }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
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

        {/* Quick Filters + Dispensary Filter */}
        <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
          {/* Quick filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "under30", label: "Under $30" },
              { id: "under40", label: "Under $40" },
              { id: "highthc", label: "High THC 25%+" },
              { id: "indica40", label: "Indica Under $40" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => { setQuickFilter(quickFilter === chip.id ? "" : chip.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                  quickFilter === chip.id
                    ? "bg-cta text-cta-foreground shadow-cta"
                    : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Dispensary filter */}
          <div className="relative ml-auto">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={dispensaryFilter}
              onChange={(e) => { setDispensaryFilter(e.target.value); setPage(1); }}
              className="pl-8 pr-8 py-1.5 rounded-lg bg-card border border-border/50 text-xs text-foreground hover:border-primary/30 focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All Dispensaries</option>
              {dispensaryNames.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Active filter summary */}
          {(quickFilter || dispensaryFilter || categoryFilter !== "All") && (
            <button
              onClick={() => { setQuickFilter(""); setDispensaryFilter(""); setCategoryFilter("All"); setPage(1); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground bg-card border border-border/50 hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filters
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
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Link href={`/strain/${strain.id}`} className="font-serif text-foreground hover:text-primary transition-colors">
                          {strain.name}
                        </Link>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider shrink-0 ${CATEGORY_COLORS[strain.category || "Flower"]}`}>
                          {strain.category || "Flower"}
                        </span>
                      </div>
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

                    {/* Price + Quick Order */}
                    <div className="col-span-1 hidden md:flex md:items-center md:gap-2">
                      <span className="font-price text-lg font-bold text-foreground">
                        {strain.price_min != null ? `$${strain.price_min}` : "—"}
                      </span>
                      {strain.prices?.length > 0 && <StrainVerificationSummary prices={strain.prices} />}
                    </div>

                    {/* Avail + Quick Order */}
                    <div className="col-span-1 hidden md:flex md:items-center md:gap-1.5">
                      <span className="font-price text-sm text-primary">{(strain.dispensary_count ?? 0)}</span>
                      {(() => {
                        const bestDisp = strain.prices?.[0]?.dispensary;
                        const orderUrl = bestDisp && (strain as any).ordering_links?.[bestDisp];
                        if (!orderUrl) return null;
                        return (
                          <a
                            href={orderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title={`Order at ${bestDisp}`}
                          >
                            Order
                          </a>
                        );
                      })()}
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
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${CATEGORY_COLORS[strain.category || "Flower"]}`}>
                            {strain.category || "Flower"}
                          </span>
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
