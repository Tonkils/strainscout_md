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
