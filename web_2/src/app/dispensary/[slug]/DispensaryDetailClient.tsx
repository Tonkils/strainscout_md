"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MapPin, Star, Leaf, Phone, Globe, ArrowLeft,
  Loader2, ExternalLink, Navigation, DollarSign,
  Search, ShoppingBag, X,
} from "lucide-react";
import { useDispensaryDirectory, type DirectoryDispensary, haversineDistance } from "@/hooks/useDispensaryDirectory";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";

function getBuyLink(strain: CatalogStrain, dispensaryName: string): { url: string; isOrder: boolean } | null {
  const orderLink = (strain.ordering_links as Record<string, string> | undefined)?.[dispensaryName];
  if (orderLink) return { url: orderLink, isOrder: true };
  const dispensaryLink = strain.dispensary_links?.[dispensaryName];
  if (dispensaryLink) return { url: dispensaryLink, isOrder: false };
  return null;
}

function DispensaryStrainList({ strains, dispensaryName }: { strains: CatalogStrain[]; dispensaryName: string }) {
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(30);

  const filtered = useMemo(() => {
    let result = strains;
    if (typeFilter !== "All") result = result.filter((s) => s.type.toLowerCase() === typeFilter.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q));
    }
    return result;
  }, [strains, typeFilter, search]);

  const displayed = filtered.slice(0, displayCount);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-0.5 bg-card border border-border/50 rounded-lg px-1 py-1 w-fit">
          {["All", "Indica", "Sativa", "Hybrid"].map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setDisplayCount(30); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                typeFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-card border border-border/50 rounded-lg overflow-hidden flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
          <input
            type="text"
            placeholder="Search strains..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setDisplayCount(30); }}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="mr-2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/30">
        <div className="col-span-4">Strain</div>
        <div className="col-span-2">Brand</div>
        <div className="col-span-1">Type</div>
        <div className="col-span-1">THC</div>
        <div className="col-span-2">Price Here</div>
        <div className="col-span-2">Order</div>
      </div>

      <div className="divide-y divide-border/20">
        {displayed.map((strain) => {
          const dispPrice = strain.prices.find((p) => p.dispensary.toLowerCase() === dispensaryName.toLowerCase());
          const price = dispPrice?.price ?? strain.price_min;
          const link = getBuyLink(strain, dispensaryName);
          const typeKey = strain.type.toLowerCase();
          const TYPE_COLORS: Record<string, string> = {
            indica: "bg-purple-500/15 text-purple-400",
            sativa: "bg-amber-500/15 text-amber-400",
            hybrid: "bg-emerald-500/15 text-emerald-400",
          };

          return (
            <div key={strain.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-card/40 transition-colors">
              {/* Mobile */}
              <div className="md:hidden flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Link href={`/strain/${strain.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">{strain.name}</Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${TYPE_COLORS[typeKey] || TYPE_COLORS.hybrid}`}>{strain.type}</span>
                    {strain.thc ? <span className="text-[10px] text-muted-foreground">{strain.thc}% THC</span> : null}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {price && <div className="font-price text-sm text-savings font-bold">${price}</div>}
                  {price && <div className="text-[10px] text-muted-foreground">${(price / 3.5).toFixed(2)}/g</div>}
                  {link && (
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors">
                      <ShoppingBag className="w-3 h-3" />
                      {link.isOrder ? "Order" : "View"}
                    </a>
                  )}
                </div>
              </div>

              {/* Desktop */}
              <Link href={`/strain/${strain.id}`} className="hidden md:block col-span-4 text-sm font-medium text-foreground hover:text-primary transition-colors truncate self-center">
                {strain.name}
              </Link>
              <div className="hidden md:block col-span-2 text-sm text-muted-foreground truncate self-center">{strain.brand || "—"}</div>
              <div className="hidden md:flex col-span-1 items-center self-center">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[typeKey] || TYPE_COLORS.hybrid}`}>
                  {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
                </span>
              </div>
              <div className="hidden md:flex col-span-1 items-center text-sm text-muted-foreground self-center">
                {strain.thc ? `${strain.thc}%` : "—"}
              </div>
              <div className="hidden md:flex col-span-2 flex-col justify-center">
                {price ? (
                  <>
                    <span className="font-price text-sm font-bold text-savings">${price}</span>
                    <span className="text-[10px] text-muted-foreground">${(price / 3.5).toFixed(2)}/g</span>
                  </>
                ) : <span className="text-sm text-muted-foreground">—</span>}
              </div>
              <div className="hidden md:flex col-span-2 items-center self-center">
                {link ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {link.isOrder ? "Order" : "View"}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {displayed.length < filtered.length && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setDisplayCount((c) => c + 30)}
            className="px-6 py-2.5 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            Load more ({filtered.length - displayed.length} remaining)
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">No strains match your filters.</div>
      )}
    </div>
  );
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function NearbyDispensaries({ current, all }: { current: DirectoryDispensary; all: DirectoryDispensary[] }) {
  const nearby = useMemo(() => {
    if (!current.lat) return [];
    return all
      .filter((d) => d.id !== current.id && d.lat)
      .map((d) => ({ ...d, dist: haversineDistance(current.lat, current.lng, d.lat, d.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [current, all]);

  if (nearby.length === 0) return null;

  return (
    <section className="border-t border-border/30 bg-card/20">
      <div className="container py-8 sm:py-12">
        <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-6">Nearby Dispensaries</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nearby.map((d) => (
            <Link key={d.id} href={`/dispensary/${slugify(d.name)}`}>
              <div className="group bg-card border border-border/30 rounded-lg p-4 hover:border-primary/40 transition-all cursor-pointer">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{d.name}</h3>
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

export default function DispensaryDetailClient({ slug }: { slug: string }) {
  const { dispensaries, loading: dirLoading } = useDispensaryDirectory();
  const { catalog, loading: catLoading } = useCatalog();

  const dispensary = useMemo(
    () => dispensaries.find((d) => slugify(d.name) === slug) ?? null,
    [dispensaries, slug]
  );

  const strains = useMemo(() => {
    if (!catalog || !dispensary) return [];
    return catalog.strains
      .filter((s) =>
        s.dispensaries.some((d) => d.toLowerCase() === dispensary.name.toLowerCase()) ||
        s.prices.some((p) => p.dispensary.toLowerCase() === dispensary.name.toLowerCase())
      )
      .sort((a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999));
  }, [catalog, dispensary]);

  const priceStats = useMemo(() => {
    if (!dispensary) return null;
    const prices = strains
      .flatMap((s) => s.prices.filter((p) => p.dispensary.toLowerCase() === dispensary.name.toLowerCase()).map((p) => p.price))
      .filter((p) => p > 0);
    if (prices.length === 0) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
    };
  }, [strains, dispensary]);

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of strains) counts[s.type] = (counts[s.type] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [strains]);

  const loading = dirLoading || catLoading;
  const rating = parseFloat(dispensary?.google_rating || "0");

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center py-32">
        <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Loading dispensary...</span>
      </div>
    );
  }

  if (!dispensary) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-serif text-2xl text-foreground mb-4">Dispensary Not Found</h1>
        <p className="text-muted-foreground mb-6">We couldn&apos;t find a dispensary matching &quot;{slug}&quot;.</p>
        <Link href="/dispensaries" className="text-primary hover:underline">Browse all dispensaries</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
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
            <div className="flex-1">
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground mb-2">{dispensary.name}</h1>
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
              <div className="flex flex-wrap gap-3">
                {dispensary.website && (
                  <a href={dispensary.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta">
                    <Globe className="w-4 h-4" />
                    Visit Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {dispensary.phone && (
                  <a href={`tel:${dispensary.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border/50 text-foreground text-sm hover:border-primary/40 transition-colors">
                    <Phone className="w-4 h-4" />
                    {dispensary.phone}
                  </a>
                )}
                {dispensary.lat && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${dispensary.lat},${dispensary.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border/50 text-foreground text-sm hover:border-primary/40 transition-colors">
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
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
                      <DollarSign className="w-4 h-4 text-savings" />
                      <span className="text-xs text-muted-foreground">Lowest</span>
                    </div>
                    <p className="font-price text-2xl font-bold text-savings">${priceStats.min}</p>
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

      {/* Strains */}
      <section className="container py-8 sm:py-12">
        <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-6">
          Available Strains ({strains.length})
        </h2>
        {strains.length > 0 ? (
          <DispensaryStrainList strains={strains} dispensaryName={dispensary.name} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No strain data available for this dispensary yet.</p>
          </div>
        )}
      </section>

      <NearbyDispensaries current={dispensary} all={dispensaries} />
    </div>
  );
}
