"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, TrendingDown, Building2, Loader2, Leaf, DollarSign, Award } from "lucide-react";
import { useCatalog, useCatalogStats } from "@/hooks/useCatalog";

const TYPE_COLORS: Record<string, string> = {
  indica: "bg-indigo-500/15 text-indigo-400",
  sativa: "bg-amber-500/15 text-amber-400",
  hybrid: "bg-emerald-500/15 text-emerald-400",
};

export default function MarketDashboardPage() {
  const { catalog, loading } = useCatalog();
  const { stats } = useCatalogStats();

  // Type distribution
  const typeBreakdown = useMemo(() => {
    if (!catalog) return [];
    const counts: Record<string, number> = {};
    for (const s of catalog.strains) counts[s.type] = (counts[s.type] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, pct: Math.round((count / catalog.strains.length) * 100) }));
  }, [catalog]);

  // Price distribution buckets
  const priceDistribution = useMemo(() => {
    if (!catalog) return [];
    const buckets = [
      { label: "Under $25", min: 0, max: 25 },
      { label: "$25–$35", min: 25, max: 35 },
      { label: "$35–$45", min: 35, max: 45 },
      { label: "$45–$55", min: 45, max: 55 },
      { label: "Over $55", min: 55, max: Infinity },
    ];
    return buckets.map((b) => ({
      ...b,
      count: catalog.strains.filter((s) => s.price_min != null && s.price_min >= b.min && s.price_min < b.max).length,
    }));
  }, [catalog]);

  const maxPriceCount = Math.max(...priceDistribution.map((b) => b.count), 1);

  // Top brands by strain count
  const topBrands = useMemo(() => {
    if (!catalog) return [];
    const brandMap = new Map<string, { count: number; priceSum: number; priceCount: number }>();
    for (const s of catalog.strains) {
      if (!s.brand) continue;
      const entry = brandMap.get(s.brand) || { count: 0, priceSum: 0, priceCount: 0 };
      entry.count++;
      if (s.price_min) { entry.priceSum += s.price_min; entry.priceCount++; }
      brandMap.set(s.brand, entry);
    }
    return Array.from(brandMap.entries())
      .map(([brand, data]) => ({
        brand,
        count: data.count,
        avgPrice: data.priceCount > 0 ? Math.round(data.priceSum / data.priceCount) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [catalog]);

  // Dispensary leaderboard by strain count
  const dispensaryLeaderboard = useMemo(() => {
    if (!catalog) return [];
    const map = new Map<string, { strainCount: number; minPrice: number }>();
    for (const s of catalog.strains) {
      for (const p of s.prices) {
        const entry = map.get(p.dispensary) || { strainCount: 0, minPrice: Infinity };
        entry.strainCount++;
        if (p.price < entry.minPrice) entry.minPrice = p.price;
        map.set(p.dispensary, entry);
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, minPrice: data.minPrice === Infinity ? null : data.minPrice }))
      .sort((a, b) => b.strainCount - a.strainCount)
      .slice(0, 10);
  }, [catalog]);

  // Grade breakdown
  const gradeBreakdown = useMemo(() => {
    if (!catalog) return [];
    const counts: Record<string, number> = {};
    for (const s of catalog.strains) counts[s.grade || "?"] = (counts[s.grade || "?"] || 0) + 1;
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">Market Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Maryland cannabis market intelligence. Powered by verified catalog data.</p>
        </div>
      </section>

      {loading ? (
        <div role="status" className="flex items-center justify-center py-20">
          <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading market data...</span>
        </div>
      ) : (
        <div className="container py-8 space-y-8">

          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-border/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Strains</span>
              </div>
              <p className="font-price text-2xl font-bold text-foreground">{stats.totalStrains.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">verified</p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Dispensaries</span>
              </div>
              <p className="font-price text-2xl font-bold text-foreground">{stats.totalDispensaries}</p>
              <p className="text-xs text-muted-foreground mt-1">tracked</p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-savings" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Price</span>
              </div>
              <p className="font-price text-2xl font-bold text-foreground">${stats.avgPrice}</p>
              <p className="text-xs text-muted-foreground mt-1">per eighth</p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Brands</span>
              </div>
              <p className="font-price text-2xl font-bold text-foreground">{stats.totalBrands}</p>
              <p className="text-xs text-muted-foreground mt-1">verified</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Type Distribution */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg text-foreground">Strain Type Distribution</h2>
              </div>
              <div className="p-5 space-y-4">
                {typeBreakdown.map(({ type, count, pct }) => (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${TYPE_COLORS[type.toLowerCase()] || TYPE_COLORS.hybrid}`}>
                        {type}
                      </span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{count.toLocaleString()}</span>
                        <span className="font-price font-bold text-foreground w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          type.toLowerCase() === "indica" ? "bg-indigo-400/60" :
                          type.toLowerCase() === "sativa" ? "bg-amber-400/60" :
                          "bg-emerald-400/60"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Distribution */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg text-foreground">Price Distribution</h2>
                <span className="text-xs text-muted-foreground ml-auto">lowest 8th price</span>
              </div>
              <div className="p-5 space-y-3">
                {priceDistribution.map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{b.label}</span>
                      <span className="font-price text-sm text-muted-foreground">{b.count.toLocaleString()} strains</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/50 rounded-full transition-all"
                        style={{ width: `${(b.count / maxPriceCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Brands */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h2 className="font-serif text-lg text-foreground">Top Brands by Selection</h2>
              </div>
              <div className="divide-y divide-border/20">
                {topBrands.map((b, i) => (
                  <div key={b.brand} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-6 text-center font-price text-xs text-muted-foreground">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{b.brand}</p>
                      <p className="text-[10px] text-muted-foreground">{b.count} strains</p>
                    </div>
                    {b.avgPrice && (
                      <span className="font-price text-sm text-muted-foreground shrink-0">avg ${b.avgPrice}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Dispensary Leaderboard */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h2 className="font-serif text-lg text-foreground">Most Active Dispensaries</h2>
              </div>
              <div className="divide-y divide-border/20">
                {dispensaryLeaderboard.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-6 text-center font-price text-xs text-muted-foreground">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.strainCount} price entries</p>
                    </div>
                    {d.minPrice && (
                      <span className="font-price text-sm text-savings shrink-0">from ${d.minPrice}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Quality / Grades */}
          <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-primary" />
              <h2 className="font-serif text-lg text-foreground">Data Quality Breakdown</h2>
              <span className="text-xs text-muted-foreground ml-auto">by verification grade</span>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4">
              {gradeBreakdown.map(([grade, count]) => (
                <div key={grade} className="text-center p-4 bg-background rounded-lg border border-border/20">
                  <span className={`text-2xl font-bold font-serif block mb-1 ${
                    grade === "A" ? "text-primary" : grade === "B" ? "text-blue-400" : "text-yellow-400"
                  }`}>
                    Grade {grade}
                  </span>
                  <p className="font-price text-xl font-bold text-foreground">{count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">strains</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center py-4">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta"
            >
              Browse All Strains
              <Leaf className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
