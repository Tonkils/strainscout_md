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
import ProductCard from "@/components/cards/ProductCard";
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
              <ProductCard key={strain.id} strain={strain} />
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
