"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ArrowUpDown, GitCompareArrows, Loader2, Beaker, MapPin, X, Building2, ChevronDown } from "lucide-react";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import StrainCardSkeleton from "@/components/StrainCardSkeleton";
import { getCategoryFromStrain, getProductCategory, TYPE_COLORS, CATEGORY_COLORS, CATEGORY_LABELS, filterStrains, type ProductCategory } from "@/lib/utils";
import CompareInlineCTA from "@/components/CompareInlineCTA";
import { trackPageViewed, trackFilterApplied } from "@/lib/analytics";

type SortKey = "name" | "thc" | "price" | "dispensaries" | "brand";

const QUICK_FILTERS = [
  { id: "under30", label: "Under $30" },
  { id: "under40", label: "Under $40" },
  { id: "highthc", label: "High THC 25%+" },
  { id: "indica40", label: "Indica Under $40" },
];

function ComparePageInner() {
  const { catalog, loading } = useCatalog();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");

  // Debounce search input 300ms — input value updates immediately, filter applies after delay
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "">(() => {
    const cat = searchParams.get("category");
    return cat ? cat as ProductCategory : "";
  });
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    const sort = searchParams.get("sort");
    return (sort === "dispensaries" || sort === "name" || sort === "thc" || sort === "price" || sort === "brand")
      ? sort as SortKey : "price";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [quickFilter, setQuickFilter] = useState("");
  const [dispensaryFilter, setDispensaryFilter] = useState("");

  // Analytics: track page view on mount
  useEffect(() => { trackPageViewed("compare"); }, []);

  const [compareList, setCompareList] = useState<CatalogStrain[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const dispensaryNames = useMemo(() => {
    if (!catalog) return [];
    return [...new Set(catalog.strains.flatMap((s) => s.dispensaries))].sort();
  }, [catalog]);

  const categoryCounts = useMemo(() => {
    if (!catalog) return {} as Record<string, number>;
    const counts: Record<string, number> = { All: 0 };
    for (const s of catalog.strains) {
      const c = getCategoryFromStrain(s);
      if (c !== "Other") {
        counts[c] = (counts[c] || 0) + 1;
        counts.All += 1;
      }
    }
    return counts;
  }, [catalog]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    // Exclude junk entries (t-shirts, "Shop by Effects" pages, discount strings)
    let result = catalog.strains.filter((s) => getCategoryFromStrain(s) !== "Other");
    if (typeFilter !== "All") result = result.filter((s) => s.type.toLowerCase() === typeFilter.toLowerCase());
    if (categoryFilter) result = result.filter((s) => getCategoryFromStrain(s) === categoryFilter);
    if (searchQuery) {
      result = filterStrains(result, searchQuery);
    }
    if (dispensaryFilter) {
      result = result.filter((s) => s.dispensaries.some((d) => d.toLowerCase() === dispensaryFilter.toLowerCase()));
    }
    if (quickFilter === "under30") result = result.filter((s) => (s.price_min ?? 999) < 30);
    else if (quickFilter === "under40") result = result.filter((s) => (s.price_min ?? 999) < 40);
    else if (quickFilter === "highthc") result = result.filter((s) => (s.thc as number) >= 25);
    else if (quickFilter === "indica40") result = result.filter((s) => s.type.toLowerCase() === "indica" && (s.price_min ?? 999) < 40);
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "thc") cmp = (Number(a.thc) || 0) - (Number(b.thc) || 0);
      else if (sortBy === "price") cmp = (a.price_min ?? 999) - (b.price_min ?? 999);
      else if (sortBy === "dispensaries") cmp = (a.dispensary_count ?? 0) - (b.dispensary_count ?? 0);
      else if (sortBy === "brand") cmp = a.brand.localeCompare(b.brand);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [catalog, searchQuery, typeFilter, categoryFilter, sortBy, sortDir, quickFilter, dispensaryFilter]);

  const paged = useMemo(() => filtered.slice(0, page * perPage), [filtered, page]);

  const hasActiveFilter = quickFilter || dispensaryFilter || categoryFilter || typeFilter !== "All" || searchInput;

  const clearFilters = () => {
    setQuickFilter("");
    setDispensaryFilter("");
    setCategoryFilter("");
    setTypeFilter("All");
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-6 sm:py-10">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground mb-1 sm:mb-2">Compare Strains</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse, filter, and compare{" "}
            <span className="font-price text-primary">{catalog?.strains.length.toLocaleString() ?? "844"}</span>{" "}
            verified strains side-by-side.
          </p>
        </div>
      </section>

      <div className="container py-4 sm:py-8">
        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            onClick={() => { setCategoryFilter(""); setPage(1); trackFilterApplied("category", "all", "compare"); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !categoryFilter
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            All {categoryCounts.All ? `(${categoryCounts.All.toLocaleString()})` : ""}
          </button>
          {(["Flower", "Pre-Roll", "Vape", "Concentrate", "Edible"] as ProductCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => { const next = categoryFilter === cat ? "" : cat; setCategoryFilter(next); setPage(1); trackFilterApplied("category", next || "all", "compare"); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? CATEGORY_COLORS[cat]
                  : "bg-card border border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {CATEGORY_LABELS[cat]} {categoryCounts[cat] ? `(${categoryCounts[cat].toLocaleString()})` : ""}
            </button>
          ))}
        </div>

        {/* Quick filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {QUICK_FILTERS.map((qf) => (
            <button
              key={qf.id}
              onClick={() => { const next = quickFilter === qf.id ? "" : qf.id; setQuickFilter(next); setPage(1); trackFilterApplied("quick_filter", next || "all", "compare"); }}
              aria-pressed={quickFilter === qf.id}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                quickFilter === qf.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {qf.label}
            </button>
          ))}

          {/* Dispensary filter */}
          <div className="relative">
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={dispensaryFilter}
              onChange={(e) => { setDispensaryFilter(e.target.value); setPage(1); }}
              className={`appearance-none pl-8 pr-7 py-1.5 rounded-full text-xs font-medium border transition-all bg-card cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                dispensaryFilter
                  ? "border-primary text-primary"
                  : "border-border/50 text-muted-foreground hover:border-primary/40"
              }`}
            >
              <option value="">All Dispensaries</option>
              {dispensaryNames.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-border/30 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Search + type filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-full sm:flex-1 sm:max-w-sm">
            <div className="flex items-center bg-card border border-border/50 rounded-lg overflow-hidden">
              <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search strain, brand, terpene..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                maxLength={200}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(""); setSearchQuery(""); }} className="mr-2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-card border border-border/50 rounded-lg px-1 py-1">
              {["All", "Indica", "Sativa", "Hybrid"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t); setPage(1); }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    typeFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{filtered.length.toLocaleString()} results</span>
          </div>
        </div>

        {loading ? (
          <div role="status" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <StrainCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
              <div className="col-span-1" />
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

            {paged.length >= 12 && (
              <div className="px-3 md:px-5 py-2">
                <CompareInlineCTA activeFilter={typeFilter} totalResults={filtered.length} />
              </div>
            )}

            {/* Strain Rows */}
            <div className="divide-y divide-border/20">
              {paged.map((strain) => {
                const isSelected = compareList.some((s) => s.id === strain.id);
                const typeKey = strain.type.toLowerCase();
                return (
                  <div
                    key={strain.id}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-3 md:px-5 py-3 md:py-3.5 hover:bg-card/50 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    <div className="hidden md:flex col-span-1 items-center">
                      <button
                        onClick={() => toggleCompare(strain)}
                        title={compareList.length >= 3 && !isSelected ? "Max 3 strains" : ""}
                        className={`w-5 h-5 rounded border transition-all ${
                          isSelected
                            ? "bg-primary border-primary"
                            : compareList.length >= 3
                            ? "border-border/30 opacity-40 cursor-not-allowed"
                            : "border-border/50 hover:border-primary/50"
                        }`}
                      >
                        {isSelected && <span className="block w-full h-full text-primary-foreground text-[10px] flex items-center justify-center">✓</span>}
                      </button>
                    </div>

                    <div className="md:hidden flex items-center justify-between">
                      <Link href={`/strain/${strain.id}`} className="flex-1">
                        <div className="font-medium text-sm text-foreground">{strain.name}</div>
                        <div className="text-xs text-muted-foreground">{strain.brand}</div>
                      </Link>
                      <div className="text-right">
                        {strain.price_min && <div className="font-price text-sm text-savings">${strain.price_min}</div>}
                        <div className="text-xs text-muted-foreground">{strain.dispensary_count} disp.</div>
                      </div>
                    </div>

                    <Link href={`/strain/${strain.id}`} className="hidden md:block col-span-3">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{strain.name}</span>
                    </Link>
                    <div className="hidden md:block col-span-2 text-sm text-muted-foreground truncate">{strain.brand || "—"}</div>
                    <div className="hidden md:block col-span-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[typeKey] || TYPE_COLORS.hybrid}`}>
                        {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
                      </span>
                    </div>
                    <div className="hidden md:flex col-span-1 items-center gap-1 text-sm text-muted-foreground">
                      {strain.thc ? (
                        <><Beaker className="w-3 h-3 shrink-0" />{strain.thc}%</>
                      ) : "—"}
                    </div>
                    <div className="hidden md:flex col-span-2 items-center gap-1 flex-wrap">
                      {(strain.terpenes || []).filter((t) => t && t !== "Not_Found").slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/80">{t}</span>
                      ))}
                    </div>
                    <div className="hidden md:block col-span-1 font-price text-sm text-savings">
                      {strain.price_min ? `$${strain.price_min}` : "—"}
                    </div>
                    <div className="hidden md:flex col-span-1 items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />{strain.dispensary_count ?? 0}
                    </div>
                  </div>
                );
              })}
            </div>

            {paged.length < filtered.length && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-6 py-3 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                >
                  Load more ({filtered.length - paged.length} remaining)
                </button>
              </div>
            )}
          </>
        )}

        {/* Fixed bottom tray */}
        {compareList.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border/50 backdrop-blur-xl z-40 py-3 px-4">
            <div className="container flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                {compareList.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                    <span className="text-xs font-medium text-foreground">{s.name}</span>
                    <button onClick={() => toggleCompare(s)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {compareList.length < 3 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    + {3 - compareList.length} more to compare
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowComparePanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cta text-cta-foreground rounded-lg text-sm font-semibold hover:bg-cta-hover transition-colors shadow-cta shrink-0"
              >
                <GitCompareArrows className="w-4 h-4" />
                Compare ({compareList.length})
              </button>
            </div>
          </div>
        )}

        {/* Compare Panel Modal */}
        {showComparePanel && compareList.length > 0 && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" aria-modal="true">
            <div role="dialog" aria-label="Side-by-Side Comparison" className="bg-card border border-border/50 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border/30 px-6 py-4 flex items-center justify-between">
                <h2 className="font-serif text-xl text-foreground">Side-by-Side Comparison</h2>
                <button onClick={() => setShowComparePanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className={`grid gap-4 ${compareList.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {compareList.map((s) => (
                    <div key={s.id} className="bg-background border border-border/30 rounded-lg p-4">
                      <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mb-2 inline-block ${TYPE_COLORS[s.type.toLowerCase()] || TYPE_COLORS.hybrid}`}>
                        {s.type}
                      </div>
                      <h3 className="font-serif text-base text-foreground mb-1">{s.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{s.brand}</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">THC</span><span className="font-price">{s.thc || "—"}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Best price</span><span className="font-price text-savings">{s.price_min ? `$${s.price_min}` : "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Dispensaries</span><span>{s.dispensary_count ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Grade</span><span>{s.grade}</span></div>
                      </div>
                      <Link href={`/strain/${s.id}`} className="mt-3 block text-center text-xs text-primary hover:underline">View details →</Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div role="status" className="flex items-center justify-center py-32">
        <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Loading...</span>
      </div>
    }>
      <ComparePageInner />
    </Suspense>
  );
}
