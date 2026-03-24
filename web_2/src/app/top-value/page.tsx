"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trophy, TrendingDown, Store, Zap, Crown, Medal, Award, Loader2 } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";

function rankIcon(i: number) {
  if (i === 0) return <Crown className="w-5 h-5 text-amber-400" />;
  if (i === 1) return <Medal className="w-5 h-5 text-gray-400" />;
  if (i === 2) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center font-price text-xs text-muted-foreground">{i + 1}</span>;
}

function typeLabel(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function TopValuePage() {
  const { catalog, loading } = useCatalog();

  const valueRanked = useMemo(() => {
    if (!catalog) return [];
    return catalog.strains
      .filter((s) => s.price_min != null && s.price_min > 0 && s.thc)
      .map((s) => {
        const thcNum = typeof s.thc === "number" ? s.thc : parseFloat(String(s.thc)) || 0;
        const price = s.price_min!;
        const availBonus = 1 + ((s.dispensary_count ?? 0) / 64);
        return { ...s, valueScore: ((thcNum / price) * availBonus * 100).toFixed(1) };
      })
      .sort((a, b) => Number(b.valueScore) - Number(a.valueScore))
      .slice(0, 50);
  }, [catalog]);

  const dispensaryRankings = useMemo(() => {
    if (!catalog) return [];
    const map = new Map<string, number[]>();
    catalog.strains.forEach((s) => {
      s.prices.forEach((p) => {
        if (!map.has(p.dispensary)) map.set(p.dispensary, []);
        map.get(p.dispensary)!.push(p.price);
      });
    });
    return Array.from(map.entries())
      .map(([name, prices]) => {
        const dInfo = catalog.dispensaries.find((d) => d.name === name);
        return {
          name,
          avgPrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0),
          strainCount: new Set(catalog.strains.filter((s) => s.prices.some((p) => p.dispensary === name)).map((s) => s.id)).size,
          city: (dInfo as { city?: string })?.city || "",
        };
      })
      .sort((a, b) => Number(a.avgPrice) - Number(b.avgPrice));
  }, [catalog]);

  const biggestSpreads = useMemo(() => {
    if (!catalog) return [];
    return catalog.strains
      .filter((s) => s.price_min != null && s.price_max != null && s.price_max > s.price_min)
      .map((s) => ({
        ...s,
        spread: s.price_max! - s.price_min!,
        bestDispensary: s.prices.sort((a, b) => a.price - b.price)[0]?.dispensary || "",
      }))
      .sort((a, b) => b.spread - a.spread)
      .slice(0, 8);
  }, [catalog]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-10">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Top Value</h1>
          <p className="text-muted-foreground">The best bang for your buck in Maryland cannabis. Ranked by our proprietary value score.</p>
        </div>
      </section>

      {loading ? (
        <div role="status" className="flex items-center justify-center py-20">
          <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading catalog...</span>
        </div>
      ) : (
        <div className="container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Value Leaderboard */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border/30 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-1">How We Calculate Value Score</h3>
                    <p className="text-sm text-muted-foreground">
                      Value Score = (THC% ÷ Lowest Price) × Availability Multiplier × 100. A higher score means more potency per dollar spent, weighted by how widely available the strain is across Maryland dispensaries.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="font-serif text-xl text-foreground">Value Leaderboard</h2>
                </div>
                <div className="divide-y divide-border/20">
                  {valueRanked.map((strain, i) => (
                    <Link key={strain.id} href={`/strain/${strain.id}`}>
                      <div className={`flex items-center gap-4 px-5 py-4 hover:bg-accent/20 transition-colors ${i < 3 ? "bg-accent/10" : ""}`}>
                        <div className="w-8 shrink-0 flex justify-center">{rankIcon(i)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-foreground">{strain.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                              strain.type === "indica" ? "bg-indigo-500/15 text-indigo-400" :
                              strain.type === "sativa" ? "bg-amber-500/15 text-amber-400" :
                              "bg-emerald-500/15 text-emerald-400"
                            }`}>{typeLabel(strain.type)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {strain.thc} THC · {strain.brand || "Unknown"} · {strain.dispensary_count ?? 0} dispensaries
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-price text-lg font-bold text-foreground">${strain.price_min}</p>
                        </div>
                        <div className="w-16 shrink-0 text-right">
                          <p className="font-price text-sm font-bold text-primary">{strain.valueScore}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">Score</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  <h3 className="font-serif text-lg text-foreground">Cheapest Dispensaries</h3>
                </div>
                <div className="divide-y divide-border/20">
                  {dispensaryRankings.slice(0, 10).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground">{d.city} · {d.strainCount} strains</p>
                      </div>
                      <span className="font-price text-sm font-bold text-foreground shrink-0">${d.avgPrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-savings" />
                  <h3 className="font-serif text-lg text-foreground">Biggest Price Spreads</h3>
                </div>
                <div className="divide-y divide-border/20">
                  {biggestSpreads.map((d) => (
                    <Link key={d.id} href={`/strain/${d.id}`}>
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.bestDispensary}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="font-price text-xs text-muted-foreground">${d.price_max}</span>
                            <span className="font-price text-sm font-bold text-savings">${d.price_min}</span>
                          </div>
                          <span className="text-[10px] text-savings">Save ${d.spread}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
