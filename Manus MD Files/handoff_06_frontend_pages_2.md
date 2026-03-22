# StrainScout MD — Frontend Pages Part 2 (Deals, Alerts, Market, TopValue, Partner, Admin)

**Handoff Document for Claude Code Review**
**Date:** March 16, 2026 | **Sprint:** 14 | **Checkpoint:** 6570492f

> Feature pages: deals feed, price alerts, market dashboard, top value, partner portal, admin pages, account.

---

## Files in This Document

1. `client/src/pages/Deals.tsx` (426 lines)
2. `client/src/pages/Alerts.tsx` (479 lines)
3. `client/src/pages/MarketDashboard.tsx` (900 lines)
4. `client/src/pages/TopValue.tsx` (236 lines)
5. `client/src/pages/PartnerPortal.tsx` (792 lines)
6. `client/src/pages/AdminPartners.tsx` (502 lines)
7. `client/src/pages/Moderation.tsx` (289 lines)
8. `client/src/pages/Account.tsx` (66 lines)
9. `client/src/pages/NotFound.tsx` (53 lines)
10. `client/src/pages/ComponentShowcase.tsx` (1438 lines)

---

## 1. `client/src/pages/Deals.tsx`

**Lines:** 426

```tsx
/*
 * StrainScout MD — Deals & Price Drops Page
 * Shows recent price drops detected from snapshot comparisons.
 * Falls back to simulated deals from catalog spread data when no DB drops exist.
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import {
  TrendingDown, Loader2, ArrowDown, Filter, Percent,
  DollarSign, Leaf, ArrowRight, Search, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { trackPageViewed, trackFilterApplied } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";

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

type SortKey = "savings_pct" | "savings_abs" | "price_low" | "newest";
type TypeFilter = "All" | "Indica" | "Sativa" | "Hybrid";

export default function Deals() {
  const { catalog, loading: catLoading } = useCatalog();
  const [sortBy, setSortBy] = useState<SortKey>("savings_pct");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCount, setShowCount] = useState(24);

  // Try to fetch real price drops from the backend
  const { data: dbDrops, isLoading: dbLoading } = trpc.priceDrops.recent.useQuery(
    { limit: 100 },
    { retry: false }
  );

  useEffect(() => {
    trackPageViewed("deals");
  }, []);

  // Build deal items from DB drops or fall back to catalog spread data
  const deals: DealItem[] = useMemo(() => {
    // If we have real DB price drops, use them
    if (dbDrops && dbDrops.length > 0 && catalog) {
      return dbDrops.map((drop) => {
        const strain = catalog.strains.find((s) => s.id === drop.strainId);
        return {
          strainId: drop.strainId,
          strainName: drop.strainName,
          type: strain?.type || "Hybrid",
          brand: strain?.brand || "",
          dispensary: drop.dispensary,
          oldPrice: Number(drop.oldPrice),
          newPrice: Number(drop.newPrice),
          dropPercent: Number(drop.dropPercent),
          savings: Number(drop.oldPrice) - Number(drop.newPrice),
          terpenes: strain?.terpenes || [],
          thcRange: strain?.thc ? `${strain.thc}%` : "",
          verified: strain?.leafly_verified || strain?.weedmaps_verified || false,
        };
      });
    }

    // Fallback: generate "deals" from catalog price spread data
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
  }, [dbDrops, catalog]);

  // Apply filters and sorting
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Type filter
    if (typeFilter !== "All") {
      result = result.filter((d) => d.type.toLowerCase() === typeFilter.toLowerCase());
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.strainName.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          d.dispensary.toLowerCase().includes(q) ||
          d.terpenes.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case "savings_pct":
        result.sort((a, b) => b.dropPercent - a.dropPercent);
        break;
      case "savings_abs":
        result.sort((a, b) => b.savings - a.savings);
        break;
      case "price_low":
        result.sort((a, b) => a.newPrice - b.newPrice);
        break;
      case "newest":
      default:
        break;
    }

    return result;
  }, [deals, typeFilter, searchQuery, sortBy]);

  const displayDeals = filteredDeals.slice(0, showCount);
  const loading = catLoading;

  // Stats
  const stats = useMemo(() => {
    if (deals.length === 0) return null;
    const avgSavings = Math.round(deals.reduce((sum, d) => sum + d.savings, 0) / deals.length);
    const maxSavings = Math.max(...deals.map((d) => d.savings));
    const avgPct = Math.round(deals.reduce((sum, d) => sum + d.dropPercent, 0) / deals.length);
    return { total: deals.length, avgSavings, maxSavings, avgPct };
  }, [deals]);

  const typeOptions: TypeFilter[] = ["All", "Indica", "Sativa", "Hybrid"];
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "savings_pct", label: "Biggest % Off" },
    { key: "savings_abs", label: "Most $ Saved" },
    { key: "price_low", label: "Lowest Price" },
  ];

  const hasDbDrops = dbDrops && dbDrops.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Deals & Price Drops | StrainScout MD"
        description={`Find the best cannabis deals in Maryland. ${stats?.total || 0} price drops tracked across dispensaries. Save up to $${stats?.maxSavings || 0} per eighth.`}
        path="/deals"
      />
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border/30 bg-gradient-to-b from-red-500/5 to-transparent">
        <div className="container py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">
                Deals & Price Drops
              </h1>
              {!hasDbDrops && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing price spread savings across dispensaries
                </p>
              )}
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl mb-6">
            {hasDbDrops
              ? "Real-time price drops detected from our weekly dispensary scans. These strains recently dropped in price."
              : "Compare the best prices across Maryland dispensaries. The savings shown represent the difference between the highest and lowest prices for each strain."}
          </p>

          {/* Stats row */}
          {stats && (
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <div className="bg-card/80 border border-border/30 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Deals</p>
                <p className="font-price text-xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
              </div>
              <div className="bg-card/80 border border-border/30 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Savings</p>
                <p className="font-price text-xl font-bold text-emerald-400">${stats.avgSavings}</p>
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

      {/* Filters & Sort */}
      <section className="border-b border-border/20 bg-card/30">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            {/* Search */}
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
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Type filter pills */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-muted-foreground" />
                {typeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTypeFilter(type);
                      if (type !== "All") trackFilterApplied("type", type, "deals");
                    }}
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

              {/* Sort dropdown */}
              <div className="flex items-center gap-1.5">
                <ArrowDown className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-card border border-border/50 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deals Grid */}
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
            <p className="text-sm text-muted-foreground">
              {searchQuery || typeFilter !== "All"
                ? "Try adjusting your filters or search query."
                : "Check back soon — we scan dispensaries weekly for price drops."}
            </p>
            {(searchQuery || typeFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("All");
                }}
                className="mt-4 text-primary text-sm hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

/* ─── Deal Drop Card ─── */
function DealDropCard({ deal }: { deal: DealItem }) {
  const typeColor: Record<string, string> = {
    indica: "bg-indigo-500/20 text-indigo-300",
    sativa: "bg-amber-500/20 text-amber-300",
    hybrid: "bg-emerald-500/20 text-emerald-300",
  };

  const badgeClass = typeColor[deal.type.toLowerCase()] || typeColor.hybrid;

  return (
    <Link href={`/strain/${deal.strainId}`}>
      <div className="group bg-card border border-border/30 rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer h-full flex flex-col">
        {/* Savings banner */}
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400">
              {deal.dropPercent}% OFF
            </span>
          </div>
          <span className="text-xs font-price text-red-300">
            Save ${deal.savings.toFixed(0)}
          </span>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          {/* Type + Brand */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badgeClass}`}>
              {deal.type}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
              {deal.brand}
            </span>
            {deal.verified && (
              <span className="text-amber-400 text-[10px]">★</span>
            )}
          </div>

          {/* Strain name */}
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm mb-1 line-clamp-2">
            {deal.strainName}
          </h3>

          {/* THC + Terpenes */}
          {(deal.thcRange || deal.terpenes.length > 0) && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
              {deal.thcRange && <span>THC {deal.thcRange}</span>}
              {deal.terpenes.length > 0 && (
                <span className="truncate">{deal.terpenes.slice(0, 2).join(", ")}</span>
              )}
            </div>
          )}

          {/* Price comparison */}
          <div className="mt-auto pt-3 border-t border-border/20">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Best Price</p>
                <p className="font-price text-xl font-bold text-emerald-400">
                  ${deal.newPrice}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Was</p>
                <p className="font-price text-sm text-muted-foreground line-through">
                  ${deal.oldPrice}
                </p>
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

```

---

## 2. `client/src/pages/Alerts.tsx`

**Lines:** 479

```tsx
/**
 * Alerts Dashboard — Manage price alerts
 * Requires authentication. Shows all user alerts with status, target price,
 * and actions (pause/resume, edit, delete).
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Bell, BellOff, Trash2, Pencil, Loader2, ArrowLeft,
  CheckCircle, Clock, AlertTriangle, Pause, Play, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type AlertStatus = "active" | "paused" | "triggered" | "expired";

const STATUS_CONFIG: Record<AlertStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active: { label: "Active", icon: Bell, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  paused: { label: "Paused", icon: Pause, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  triggered: { label: "Triggered", icon: CheckCircle, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  expired: { label: "Expired", icon: Clock, color: "text-muted-foreground", bg: "bg-muted/10 border-border/30" },
};

export default function Alerts() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const { data: alerts, isLoading } = trpc.alerts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [filter, setFilter] = useState<AlertStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAlert, setEditingAlert] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const updateAlert = trpc.alerts.update.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      utils.alerts.count.invalidate();
      toast.success("Alert updated");
      setEditingAlert(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAlert = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      utils.alerts.count.invalidate();
      toast.success("Alert deleted");
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    let result = [...alerts];
    if (filter !== "all") {
      result = result.filter((a) => a.status === filter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.strainName.toLowerCase().includes(q) ||
          (a.dispensary && a.dispensary.toLowerCase().includes(q))
      );
    }
    return result;
  }, [alerts, filter, searchQuery]);

  const statusCounts = useMemo(() => {
    if (!alerts) return { all: 0, active: 0, paused: 0, triggered: 0, expired: 0 };
    return {
      all: alerts.length,
      active: alerts.filter((a) => a.status === "active").length,
      paused: alerts.filter((a) => a.status === "paused").length,
      triggered: alerts.filter((a) => a.status === "triggered").length,
      expired: alerts.filter((a) => a.status === "expired").length,
    };
  }, [alerts]);

  // Not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cta/10 flex items-center justify-center mx-auto mb-6">
            <Bell className="w-8 h-8 text-cta" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-3">Price Alerts</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to create price alerts and get notified when your favorite strains drop in price.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover transition-all shadow-cta"
          >
            Sign In to Get Started
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground">My Price Alerts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {statusCounts.active} active · {statusCounts.triggered} triggered · Max 20 alerts
            </p>
          </div>
          <Link href="/compare">
            <Button className="bg-cta text-cta-foreground hover:bg-cta-hover shadow-cta">
              <Bell className="w-4 h-4 mr-2" />
              Browse Strains
            </Button>
          </Link>
        </div>

        {/* Filter Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(["all", "active", "paused", "triggered", "expired"] as const).map((status) => {
              const count = statusCounts[status];
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                    filter === status
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-card border-border/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex-1 sm:max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border/30 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(isLoading || authLoading) && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading alerts...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !authLoading && filteredAlerts.length === 0 && (
          <div className="text-center py-16 bg-card border border-border/30 rounded-lg">
            <BellOff className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-foreground mb-2">
              {filter !== "all" ? `No ${filter} alerts` : "No alerts yet"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              {filter !== "all"
                ? "Try a different filter or create new alerts from strain pages."
                : "Browse strains and tap the Alert Me button to get notified when prices drop."}
            </p>
            <Link href="/compare">
              <Button className="bg-cta text-cta-foreground hover:bg-cta-hover shadow-cta">
                Browse Strains
              </Button>
            </Link>
          </div>
        )}

        {/* Alerts List */}
        {!isLoading && filteredAlerts.length > 0 && (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const config = STATUS_CONFIG[alert.status as AlertStatus] || STATUS_CONFIG.active;
              const StatusIcon = config.icon;
              const isEditing = editingAlert === alert.id;
              const isActive = alert.status === "active";
              const isPaused = alert.status === "paused";
              const canModify = isActive || isPaused;

              return (
                <div
                  key={alert.id}
                  className={`bg-card border rounded-lg overflow-hidden transition-all ${
                    alert.status === "triggered"
                      ? "border-primary/30 shadow-lg shadow-primary/5"
                      : alert.status === "expired"
                      ? "border-border/20 opacity-70"
                      : "border-border/30"
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Status Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color} shrink-0 w-fit`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </div>

                      {/* Strain Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/strain/${alert.strainId}`}
                          className="text-foreground font-medium hover:text-primary transition-colors text-sm sm:text-base truncate block"
                        >
                          {alert.strainName}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {alert.dispensary ? (
                            <span>at {alert.dispensary}</span>
                          ) : (
                            <span>Any dispensary</span>
                          )}
                          <span className="text-border">·</span>
                          <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
                          {alert.expiresAt && (
                            <>
                              <span className="text-border">·</span>
                              <span>Expires {new Date(alert.expiresAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Price Info */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase">Target</p>
                          <p className="font-price text-lg font-bold text-foreground">
                            ${Number(alert.targetPrice).toFixed(0)}
                          </p>
                        </div>
                        {alert.currentPrice && (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase">Current</p>
                            <p className="font-price text-lg font-bold text-savings">
                              ${Number(alert.currentPrice).toFixed(0)}
                            </p>
                          </div>
                        )}

                        {/* Triggered info */}
                        {alert.status === "triggered" && alert.triggeredPrice && (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase">Hit</p>
                            <p className="font-price text-lg font-bold text-primary">
                              ${Number(alert.triggeredPrice).toFixed(0)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {canModify && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Pause/Resume */}
                          <button
                            onClick={() => {
                              updateAlert.mutate({
                                id: alert.id,
                                status: isActive ? "paused" : "active",
                              });
                            }}
                            disabled={updateAlert.isPending}
                            className="p-2 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
                            title={isActive ? "Pause alert" : "Resume alert"}
                          >
                            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingAlert(alert.id);
                              setEditPrice(String(Number(alert.targetPrice)));
                            }}
                            className="p-2 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit target price"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirm(alert.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete alert"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Triggered: link to strain */}
                      {alert.status === "triggered" && (
                        <Link href={`/strain/${alert.strainId}`}>
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                            View Deal
                          </Button>
                        </Link>
                      )}
                    </div>

                    {/* Triggered details with notification history */}
                    {alert.status === "triggered" && alert.triggeredDispensary && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                        <p className="text-sm text-foreground">
                          <CheckCircle className="w-4 h-4 text-primary inline mr-1.5" />
                          Price dropped to <span className="font-price font-bold text-primary">${Number(alert.triggeredPrice).toFixed(0)}</span> at{" "}
                          <span className="font-medium">{alert.triggeredDispensary}</span>
                          {alert.triggeredAt && (
                            <span className="text-muted-foreground"> on {new Date(alert.triggeredAt).toLocaleDateString()}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-primary/10">
                          <span className="inline-flex items-center gap-1">
                            <Bell className="w-3 h-3 text-primary" />
                            Notification sent
                          </span>
                          {alert.triggeredAt && (
                            <span>
                              {new Date(alert.triggeredAt).toLocaleString("en-US", {
                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true
                              })}
                            </span>
                          )}
                          {alert.targetPrice && alert.triggeredPrice && (
                            <span className="text-savings font-price font-medium">
                              Saved ${(Number(alert.targetPrice) - Number(alert.triggeredPrice)).toFixed(0)} vs target
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        {!isLoading && alerts && alerts.length > 0 && (
          <div className="mt-8 p-4 rounded-lg bg-card border border-border/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How alerts work</p>
                <p>
                  We check prices every Tuesday and Friday against the Maryland dispensary catalog.
                  When a strain hits your target price, the alert triggers and you'll see it here.
                  Alerts expire after 90 days of no trigger. You can have up to 20 active alerts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={editingAlert !== null} onOpenChange={(open) => !open && setEditingAlert(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground">Edit Target Price</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Update the price at which you want to be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-price">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full bg-background/80 border border-border/50 rounded-lg pl-8 pr-4 py-3 text-sm text-foreground font-price focus:outline-none focus:border-cta/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingAlert(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cta text-cta-foreground hover:bg-cta-hover"
                disabled={!editPrice || parseFloat(editPrice) <= 0 || updateAlert.isPending}
                onClick={() => {
                  if (editingAlert) {
                    updateAlert.mutate({
                      id: editingAlert,
                      targetPrice: parseFloat(editPrice),
                    });
                  }
                }}
              >
                {updateAlert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground">Delete Alert</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Are you sure you want to delete this price alert? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteAlert.isPending}
              onClick={() => {
                if (deleteConfirm) {
                  deleteAlert.mutate({ id: deleteConfirm });
                }
              }}
            >
              {deleteAlert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

```

---

## 3. `client/src/pages/MarketDashboard.tsx`

**Lines:** 900

```tsx
/**
 * StrainScout MD — Market Intelligence Dashboard
 * Sprint 10: Interactive charts, filters, and responsive layout
 * Uses Recharts + trpc.market.dashboard for data
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Activity,
  Building2,
  ArrowRight,
  Loader2,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { trackPageViewed, trackFilterApplied, trackMarketDashboardViewed } from "@/lib/analytics";

// ============================================================
// Color palette matching the Botanical Data Lab theme
// ============================================================

const CHART_COLORS = {
  primary: "#4ade80",     // emerald-400
  secondary: "#22c55e",   // emerald-500
  accent: "#f59e0b",      // amber-500
  danger: "#ef4444",      // red-500
  muted: "#6b7280",       // gray-500
  regions: [
    "#4ade80", // Baltimore Metro — green
    "#f59e0b", // DC Suburbs — amber
    "#3b82f6", // Western Maryland — blue
    "#a855f7", // Eastern Shore — purple
    "#ec4899", // Southern Maryland — pink
    "#6b7280", // Other — gray
  ],
  types: {
    Hybrid: "#4ade80",
    Indica: "#a855f7",
    Sativa: "#f59e0b",
  } as Record<string, string>,
};

// ============================================================
// Custom Tooltip Component
// ============================================================

function ChartTooltip({ active, payload, label, prefix = "$" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-price" style={{ color: entry.color }}>
          {entry.name}: {prefix}{typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ============================================================
// Stat Card Component
// ============================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-primary",
  subtext,
}: {
  label: string;
  value: string | number;
  icon: any;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="bg-card/80 backdrop-blur border border-border/30 rounded-lg p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="font-price text-xl sm:text-2xl font-bold text-foreground">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Section Header Component
// ============================================================

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4 sm:mb-6">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="font-serif text-xl sm:text-2xl text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ============================================================
// Filter Pill Component
// ============================================================

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-card border border-border/30 text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================
// Main Dashboard Component
// ============================================================

export default function MarketDashboard() {
  const { data, isLoading, error } = trpc.market.dashboard.useQuery();

  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [regionFilter, setRegionFilter] = useState<string>("All");

  // Analytics: track page view on mount
  useEffect(() => {
    trackPageViewed("market_dashboard");
    trackMarketDashboardViewed();
  }, []);

  // Analytics: track filter changes
  useEffect(() => {
    if (typeFilter !== "All") {
      trackFilterApplied("strain_type", typeFilter, "market_dashboard");
    }
  }, [typeFilter]);

  useEffect(() => {
    if (regionFilter !== "All") {
      trackFilterApplied("region", regionFilter, "market_dashboard");
    }
  }, [regionFilter]);

  // ---- Derived data ----

  const filteredRegional = useMemo(() => {
    if (!data?.regional) return [];
    if (regionFilter === "All") return data.regional;
    return data.regional.filter((r) => r.region === regionFilter);
  }, [data?.regional, regionFilter]);

  const filteredTopStrains = useMemo(() => {
    if (!data?.topAvailable) return [];
    if (typeFilter === "All") return data.topAvailable.slice(0, 10);
    return data.topAvailable.filter((s) => s.type === typeFilter).slice(0, 10);
  }, [data?.topAvailable, typeFilter]);

  const filteredVolatile = useMemo(() => {
    if (!data?.topVolatile) return [];
    if (typeFilter === "All") return data.topVolatile.slice(0, 10);
    return data.topVolatile.filter((s) => s.type === typeFilter).slice(0, 10);
  }, [data?.topVolatile, typeFilter]);

  const brandChartData = useMemo(() => {
    if (!data?.brandShare) return [];
    return data.brandShare.slice(0, 12).map((b) => ({
      name: b.brand.length > 14 ? b.brand.slice(0, 12) + "…" : b.brand,
      fullName: b.brand,
      strains: b.strainCount,
      listings: b.totalListings,
      avgPrice: b.avgPrice,
    }));
  }, [data?.brandShare]);

  const typeDistribution = useMemo(() => {
    if (!data?.overview?.priceByType) return [];
    return data.overview.priceByType.map((t) => ({
      name: t.type,
      value: t.count,
      avgPrice: t.avgPrice,
    }));
  }, [data?.overview?.priceByType]);

  const regionNames = useMemo(() => {
    if (!data?.regional) return ["All"];
    return ["All", ...data.regional.map((r) => r.region)];
  }, [data?.regional]);

  // ---- Loading / Error states ----

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading market data...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground text-lg">Unable to load market data. Please try again later.</p>
        </div>
      </div>
    );
  }

  const { overview } = data;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Market Intelligence — StrainScout MD</title>
        <meta
          name="description"
          content={`Maryland cannabis market analytics: ${overview.totalStrains.toLocaleString()} strains across ${overview.totalDispensaries} dispensaries. Average 1/8th price $${overview.avgPrice}. Regional price comparison, brand market share, and price volatility data.`}
        />
      </Helmet>

      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container py-8 sm:py-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
              <BarChart3 className="w-3 h-3" />
              Market Intelligence
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-foreground leading-[1.1] mb-3">
              Maryland Cannabis{" "}
              <span className="text-primary">Market Data</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
              Real-time analytics across {overview.totalDispensaries} dispensaries and{" "}
              <span className="font-price text-primary">{overview.totalStrains.toLocaleString()}</span>{" "}
              strains. Updated {new Date(overview.lastUpdated).toLocaleDateString()}.
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 sm:mt-8">
            <StatCard
              label="Total Strains"
              value={overview.totalStrains.toLocaleString()}
              icon={Activity}
              color="text-primary"
            />
            <StatCard
              label="Average 1/8th"
              value={`$${overview.avgPrice}`}
              icon={TrendingUp}
              color="text-amber-400"
            />
            <StatCard
              label="Lowest Price"
              value={`$${overview.lowestPrice}`}
              icon={TrendingUp}
              color="text-savings"
              subtext={`Median: $${overview.medianPrice}`}
            />
            <StatCard
              label="Dispensaries"
              value={overview.totalDispensaries}
              icon={Building2}
              color="text-primary"
            />
          </div>
        </div>
      </section>

      {/* Global Filters */}
      <section className="border-b border-border/30 bg-card/30">
        <div className="container py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mr-1">Strain Type:</span>
            {["All", "Hybrid", "Indica", "Sativa"].map((t) => (
              <FilterPill key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
            ))}
            <span className="text-xs text-muted-foreground uppercase tracking-wider ml-4 mr-1 hidden sm:inline">Region:</span>
            <div className="hidden sm:flex flex-wrap gap-2">
              {regionNames.map((r) => (
                <FilterPill key={r} label={r} active={regionFilter === r} onClick={() => setRegionFilter(r)} />
              ))}
            </div>
            {/* Mobile region dropdown */}
            <div className="sm:hidden relative">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="appearance-none bg-card border border-border/30 rounded-full px-3 py-1.5 pr-7 text-xs text-foreground"
              >
                {regionNames.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Price by Strain Type + Type Distribution */}
      <section className="container py-8 sm:py-12">
        <SectionHeader
          icon={BarChart3}
          title="Price by Strain Type"
          description="Average 1/8th price comparison across Indica, Sativa, and Hybrid strains"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Type Price Bar Chart */}
          <div className="lg:col-span-2 bg-card/60 border border-border/30 rounded-lg p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overview.priceByType} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="type" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <RechartsTooltip content={<ChartTooltip />} />
                <Bar dataKey="avgPrice" name="Avg Price" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {overview.priceByType.map((entry, i) => (
                    <Cell
                      key={entry.type}
                      fill={CHART_COLORS.types[entry.type] || CHART_COLORS.muted}
                    />
                  ))}
                </Bar>
                <Bar dataKey="minPrice" name="Min Price" radius={[4, 4, 0, 0]} maxBarSize={60} fill="rgba(74,222,128,0.3)" />
                <Bar dataKey="maxPrice" name="Max Price" radius={[4, 4, 0, 0]} maxBarSize={60} fill="rgba(239,68,68,0.3)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Type Distribution Pie */}
          <div className="bg-card/60 border border-border/30 rounded-lg p-4 sm:p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Strain Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {typeDistribution.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS.types[entry.name] || CHART_COLORS.muted}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border/50 rounded-lg px-3 py-2 shadow-lg text-sm">
                        <p className="text-foreground font-medium">{d.name}</p>
                        <p className="text-muted-foreground">{d.value} strains</p>
                        <p className="font-price text-primary">${d.avgPrice} avg</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Regional Price Comparison */}
      <section className="bg-card/20 border-y border-border/30">
        <div className="container py-8 sm:py-12">
          <SectionHeader
            icon={MapPin}
            title="Regional Price Comparison"
            description="Average 1/8th prices across Maryland's 5 cannabis market regions"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Regional Bar Chart */}
            <div className="lg:col-span-2 bg-card/60 border border-border/30 rounded-lg p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={filteredRegional}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="region"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    width={130}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border/50 rounded-lg px-3 py-2 shadow-lg text-sm">
                          <p className="text-foreground font-medium">{d.region}</p>
                          <p className="font-price text-primary">Avg: ${d.avgPrice}</p>
                          <p className="font-price text-muted-foreground">Range: ${d.minPrice} – ${d.maxPrice}</p>
                          <p className="text-muted-foreground">{d.dispensaryCount} dispensaries · {d.strainCount} strains</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avgPrice" name="Avg Price" radius={[0, 4, 4, 0]} maxBarSize={30}>
                    {filteredRegional.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS.regions[i % CHART_COLORS.regions.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Regional Stats Cards */}
            <div className="space-y-3">
              {filteredRegional.map((r, i) => (
                <div
                  key={r.region}
                  className="bg-card/60 border border-border/30 rounded-lg p-4 flex items-center gap-3"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS.regions[i % CHART_COLORS.regions.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.region}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.dispensaryCount} dispensaries · {r.strainCount} strains
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-price text-sm font-bold text-foreground">${r.avgPrice}</p>
                    <p className="font-price text-[10px] text-muted-foreground">
                      ${r.minPrice}–${r.maxPrice}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Top Strains by Availability */}
      <section className="container py-8 sm:py-12">
        <SectionHeader
          icon={TrendingUp}
          title="Most Available Strains"
          description="Top strains by number of dispensaries carrying them"
        />

        <div className="bg-card/60 border border-border/30 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-card/80">
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Strain</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Brand</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Dispensaries</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Avg Price</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Range</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopStrains.map((strain, i) => (
                  <tr
                    key={strain.id}
                    className="border-b border-border/20 hover:bg-card/80 transition-colors"
                  >
                    <td className="px-4 py-3 font-price text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/strain/${strain.id}`}
                        className="text-foreground hover:text-primary transition-colors font-medium"
                      >
                        {strain.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{strain.brand}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${CHART_COLORS.types[strain.type] || CHART_COLORS.muted}20`,
                          color: CHART_COLORS.types[strain.type] || CHART_COLORS.muted,
                        }}
                      >
                        {strain.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-price font-bold text-primary">
                      {strain.dispensaryCount}
                    </td>
                    <td className="px-4 py-3 text-right font-price text-foreground">
                      ${strain.avgPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-price text-muted-foreground hidden sm:table-cell">
                      ${strain.minPrice}–${strain.maxPrice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTopStrains.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No strains match the current filter.
            </div>
          )}
        </div>
      </section>

      {/* Brand Market Share */}
      <section className="bg-card/20 border-y border-border/30">
        <div className="container py-8 sm:py-12">
          <SectionHeader
            icon={Building2}
            title="Brand Market Share"
            description="Top brands by number of unique strains in the Maryland market"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Brand Bar Chart */}
            <div className="bg-card/60 border border-border/30 rounded-lg p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={brandChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    width={110}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border/50 rounded-lg px-3 py-2 shadow-lg text-sm">
                          <p className="text-foreground font-medium">{d.fullName}</p>
                          <p className="text-primary">{d.strains} strains</p>
                          <p className="text-muted-foreground">{d.listings} total listings</p>
                          <p className="font-price text-amber-400">${d.avgPrice} avg</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="strains" name="Strains" radius={[0, 4, 4, 0]} maxBarSize={24} fill={CHART_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Brand Listings Chart */}
            <div className="bg-card/60 border border-border/30 rounded-lg p-4 sm:p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Total Dispensary Listings</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={brandChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    width={110}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border/50 rounded-lg px-3 py-2 shadow-lg text-sm">
                          <p className="text-foreground font-medium">{d.fullName}</p>
                          <p className="text-amber-400">{d.listings} listings</p>
                          <p className="font-price text-muted-foreground">${d.avgPrice} avg price</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="listings" name="Listings" radius={[0, 4, 4, 0]} maxBarSize={24} fill={CHART_COLORS.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Price Volatility */}
      <section className="container py-8 sm:py-12">
        <SectionHeader
          icon={Activity}
          title="Price Volatility"
          description="Strains with the biggest price swings across dispensaries — shop around for savings"
        />

        <div className="bg-card/60 border border-border/30 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-card/80">
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Strain</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1">
                      Volatility
                      <span title="Standard deviation / average price × 100. Higher = more price variation across dispensaries.">
                        <Info className="w-3 h-3" />
                      </span>
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Avg</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Range</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Dispensaries</th>
                </tr>
              </thead>
              <tbody>
                {filteredVolatile.map((strain, i) => {
                  const volatilityColor =
                    strain.volatilityIndex > 30
                      ? "text-red-400"
                      : strain.volatilityIndex > 20
                      ? "text-amber-400"
                      : "text-primary";
                  return (
                    <tr
                      key={strain.strainId}
                      className="border-b border-border/20 hover:bg-card/80 transition-colors"
                    >
                      <td className="px-4 py-3 font-price text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/strain/${strain.strainId}`}
                          className="text-foreground hover:text-primary transition-colors font-medium"
                        >
                          {strain.strainName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${CHART_COLORS.types[strain.type] || CHART_COLORS.muted}20`,
                            color: CHART_COLORS.types[strain.type] || CHART_COLORS.muted,
                          }}
                        >
                          {strain.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-price font-bold ${volatilityColor}`}>
                        {strain.volatilityIndex.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-price text-foreground">
                        ${strain.avgPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-price text-muted-foreground">
                        ${strain.minPrice}–${strain.maxPrice}
                      </td>
                      <td className="px-4 py-3 text-right font-price text-muted-foreground hidden sm:table-cell">
                        {strain.dispensaryCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredVolatile.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No strains match the current filter.
            </div>
          )}
        </div>

        {/* Insight box */}
        <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="text-amber-400 font-medium mb-1">Shopping Tip</p>
            <p>
              High volatility means the same strain can vary significantly in price between dispensaries.
              For strains with volatility above 25%, you could save ${filteredVolatile.length > 0 ? `$${(filteredVolatile[0].maxPrice - filteredVolatile[0].minPrice).toFixed(0)}` : "significant amounts"} or more by comparing prices before buying.
            </p>
          </div>
        </div>
      </section>

      {/* Price Trends (Historical) */}
      {data.priceTrends.length > 0 && (
        <section className="bg-card/20 border-y border-border/30">
          <div className="container py-8 sm:py-12">
            <SectionHeader
              icon={TrendingUp}
              title="Price Trends"
              description={
                data.priceTrends.length > 1
                  ? `Historical average 1/8th price over ${data.priceTrends.length} data points`
                  : "Price trend tracking will improve as more weekly data is collected"
              }
            />

            <div className="bg-card/60 border border-border/30 rounded-lg p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.priceTrends}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                    domain={["dataMin - 5", "dataMax + 5"]}
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="avgPrice"
                    name="Avg Price"
                    stroke={CHART_COLORS.primary}
                    fill="url(#priceGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="minPrice"
                    name="Min Price"
                    stroke={CHART_COLORS.secondary}
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="maxPrice"
                    name="Max Price"
                    stroke={CHART_COLORS.danger}
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>

              {data.priceTrends.length <= 1 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <Info className="w-4 h-4 inline mr-1" />
                  Historical trend data will grow as weekly catalog snapshots are collected.
                  Currently showing a single data point from the live catalog.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="container py-8 sm:py-12">
        <div className="bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20 rounded-xl p-6 sm:p-8 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-3">
            Ready to Find the Best Deals?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Use our comparison tools to find the cheapest prices on your favorite strains across Maryland dispensaries.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/compare"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-all shadow-cta"
            >
              Compare Strains
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/deals"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-semibold text-sm hover:bg-accent transition-colors"
            >
              Browse Deals
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

```

---

## 4. `client/src/pages/TopValue.tsx`

**Lines:** 236

```tsx
/*
 * StrainScout MD — Top Value Page
 * Design: Botanical Data Lab
 * Value leaderboard, dispensary rankings, and price spread analysis
 * Powered by real verified catalog data
 */

import { useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Trophy, TrendingDown, Store, Zap, Crown, Medal, Award, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TopValuePageSEO } from "@/components/SEO";
import { useCatalog } from "@/hooks/useCatalog";
import { trackPageViewed } from "@/lib/analytics";

const VALUE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/value-bg-eRxb3HbYXqKrASp3vrsLyJ.webp";

export default function TopValue() {
  const { catalog, loading } = useCatalog();

  // Analytics: track page view
  useEffect(() => { trackPageViewed("top_value"); }, []);

  // Value score: (THC / lowestPrice) * availability multiplier
  const valueRanked = useMemo(() => {
    if (!catalog) return [];
    return catalog.strains
      .filter((s) => s.price_min != null && s.price_min > 0 && s.thc)
      .map((s) => {
        const thcNum = typeof s.thc === 'number' ? s.thc : (parseFloat(String(s.thc)) || 0);
        const price = s.price_min!;
        const availBonus = 1 + ((s.dispensary_count ?? 0) / 64); // normalize by total dispensaries
        return {
          ...s,
          valueScore: ((thcNum / price) * availBonus * 100).toFixed(1),
        };
      })
      .sort((a, b) => Number(b.valueScore) - Number(a.valueScore))
      .slice(0, 50);
  }, [catalog]);

  // Dispensary rankings by average lowest price
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
          city: dInfo?.city || "",
        };
      })
      .sort((a, b) => Number(a.avgPrice) - Number(b.avgPrice));
  }, [catalog]);

  // Biggest price spreads (potential savings)
  const biggestSpreads = useMemo(() => {
    if (!catalog) return [];
    return catalog.strains
      .filter((s) => s.price_min != null && s.price_max != null && s.price_max > s.price_min)
      .map((s) => ({
        ...s,
        spread: s.price_max! - s.price_min!,
        spreadPct: Math.round(((s.price_max! - s.price_min!) / s.price_max!) * 100),
        bestDispensary: s.prices.sort((a, b) => a.price - b.price)[0]?.dispensary || "",
      }))
      .sort((a, b) => b.spread - a.spread)
      .slice(0, 8);
  }, [catalog]);

  const typeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  const rankIcon = (i: number) => {
    if (i === 0) return <Crown className="w-5 h-5 text-amber-400" />;
    if (i === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (i === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center font-price text-xs text-muted-foreground">{i + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopValuePageSEO />
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 opacity-30">
          <img src={VALUE_BG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background" />
        <div className="relative container py-10">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Top Value</h1>
          <p className="text-muted-foreground">The best bang for your buck in Maryland cannabis. Ranked by our proprietary value score.</p>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading catalog...</span>
        </div>
      ) : (
        <div className="container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Value Leaderboard — Main Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Value Score Explanation */}
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

              {/* Leaderboard */}
              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="font-serif text-xl text-foreground">Value Leaderboard</h2>
                </div>

                <div className="divide-y divide-border/20">
                  {valueRanked.map((strain, i) => (
                    <Link key={strain.id} href={`/strain/${strain.id}`}>
                      <div className={`flex items-center gap-4 px-5 py-4 hover:bg-accent/20 transition-colors ${i < 3 ? "bg-accent/10" : ""}`}>
                        <div className="w-8 shrink-0 flex justify-center">
                          {rankIcon(i)}
                        </div>

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
                            {strain.thc} THC · {strain.brand || "Unknown"} · {(strain.dispensary_count ?? 0)} dispensaries
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
              {/* Dispensary Rankings */}
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

              {/* Biggest Price Spreads */}
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

      <Footer />
    </div>
  );
}

```

---

## 5. `client/src/pages/PartnerPortal.tsx`

**Lines:** 792

```tsx
/*
 * StrainScout MD — Partner Portal
 * Design: Botanical Data Lab
 * Three states: (1) Not logged in → CTA to login
 *               (2) No partnership → Claim wizard
 *               (3) Active partner → Dashboard + price update
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCatalog, type CatalogDispensary, type CatalogStrain } from "@/hooks/useCatalog";
import { toast } from "sonner";
import { trackPartnerClaimed, trackPartnerPriceSubmitted } from "@/lib/analytics";
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Search,
  DollarSign,
  Package,
  TrendingUp,
  Shield,
  Loader2,
  ArrowRight,
  LogIn,
  BadgeCheck,
} from "lucide-react";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Claim Wizard ────────────────────────────────────────────────────────────

function ClaimWizard({ dispensaries, onSuccess }: {
  dispensaries: CatalogDispensary[];
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDispensary, setSelectedDispensary] = useState<CatalogDispensary | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const claimMutation = trpc.partners.claim.useMutation({
    onSuccess: () => {
      if (selectedDispensary) {
        trackPartnerClaimed(
          slugify(selectedDispensary.name),
          selectedDispensary.name,
          businessName
        );
      }
      toast.success("Partnership claim submitted!", {
        description: "We'll review your claim and get back to you within 48 hours.",
      });
      onSuccess();
    },
    onError: (err) => {
      toast.error("Claim failed", { description: err.message });
    },
  });

  const filteredDispensaries = useMemo(() => {
    if (!searchQuery) return dispensaries.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return dispensaries
      .filter((d) => d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q))
      .slice(0, 20);
  }, [dispensaries, searchQuery]);

  const handleSubmit = () => {
    if (!selectedDispensary) return;
    claimMutation.mutate({
      dispensarySlug: slugify(selectedDispensary.name),
      dispensaryName: selectedDispensary.name,
      businessName,
      contactEmail,
      contactPhone: contactPhone || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  s < step ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Dispensary */}
      {step === 1 && (
        <div className="bg-card border border-border/30 rounded-xl p-6">
          <h3 className="font-serif text-xl text-foreground mb-2">
            Select Your Dispensary
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Search for the dispensary you own or operate in Maryland.
          </p>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dispensaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredDispensaries.map((d) => (
              <button
                key={d.name}
                onClick={() => setSelectedDispensary(d)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  selectedDispensary?.name === d.name
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/30 bg-background hover:border-primary/30 text-foreground/80"
                }`}
              >
                <div className="font-medium text-sm">{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  {d.city} · {d.strain_count} strains tracked
                </div>
              </button>
            ))}
            {filteredDispensaries.length === 0 && (
              <p className="text-center py-4 text-muted-foreground text-sm">
                No dispensaries found. Try a different search.
              </p>
            )}
          </div>

          <button
            onClick={() => selectedDispensary && setStep(2)}
            disabled={!selectedDispensary}
            className="mt-4 w-full px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue with {selectedDispensary?.name || "..."}
          </button>
        </div>
      )}

      {/* Step 2: Business Information */}
      {step === 2 && (
        <div className="bg-card border border-border/30 rounded-xl p-6">
          <h3 className="font-serif text-xl text-foreground mb-2">
            Business Information
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Provide your business details for verification. We'll verify ownership
            within 48 hours.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Legal Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Green Leaf Wellness LLC"
                className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="owner@dispensary.com"
                className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(410) 555-0123"
                className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-border text-foreground text-sm rounded-lg hover:bg-accent transition-colors"
            >
              Back
            </button>
            <button
              onClick={() =>
                businessName.trim() && contactEmail.trim() && setStep(3)
              }
              disabled={!businessName.trim() || !contactEmail.trim()}
              className="flex-1 px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Review & Submit
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="bg-card border border-border/30 rounded-xl p-6">
          <h3 className="font-serif text-xl text-foreground mb-2">
            Review Your Claim
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please confirm the details below are correct.
          </p>

          <div className="space-y-3 bg-background rounded-lg p-4 border border-border/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dispensary</span>
              <span className="text-foreground font-medium">
                {selectedDispensary?.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span className="text-foreground">{selectedDispensary?.city}</span>
            </div>
            <div className="border-t border-border/30 pt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Business Name</span>
              <span className="text-foreground">{businessName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{contactEmail}</span>
            </div>
            {contactPhone && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-foreground">{contactPhone}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-border text-foreground text-sm rounded-lg hover:bg-accent transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={claimMutation.isPending}
              className="flex-1 px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {claimMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Claim
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Price Update Form ───────────────────────────────────────────────────────

function PriceUpdateForm({ strains }: { strains: CatalogStrain[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrain, setSelectedStrain] = useState<CatalogStrain | null>(null);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<"3.5g" | "7g" | "14g" | "28g">("3.5g");

  const submitMutation = trpc.partners.submitPrice.useMutation({
    onSuccess: () => {
      if (selectedStrain) {
        trackPartnerPriceSubmitted(
          selectedStrain.id,
          selectedStrain.name,
          price,
          unit,
          "partner-portal"
        );
      }
      toast.success("Price submitted!", {
        description: "Your price update is pending review.",
      });
      setSelectedStrain(null);
      setPrice("");
      setSearchQuery("");
    },
    onError: (err) => {
      toast.error("Submission failed", { description: err.message });
    },
  });

  const filteredStrains = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return strains
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [strains, searchQuery]);

  const handleSubmit = () => {
    if (!selectedStrain || !price) return;
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Invalid price", { description: "Please enter a valid price." });
      return;
    }
    submitMutation.mutate({
      strainId: selectedStrain.id,
      strainName: selectedStrain.name,
      price: priceNum,
      unit,
    });
  };

  return (
    <div className="bg-card border border-border/30 rounded-xl p-6">
      <h3 className="font-serif text-xl text-foreground mb-1">
        Submit Price Update
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Submit current prices for strains you carry. Approved prices receive a
        "Partner Verified" badge.
      </p>

      <div className="space-y-4">
        {/* Strain Search */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Strain *
          </label>
          {selectedStrain ? (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-4 py-3">
              <div>
                <span className="text-sm font-medium text-foreground">
                  {selectedStrain.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  by {selectedStrain.brand}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedStrain(null);
                  setSearchQuery("");
                }}
                className="text-xs text-primary hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search strains (min 2 characters)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              {filteredStrains.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredStrains.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStrain(s);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent/50 transition-colors border-b border-border/20 last:border-0"
                    >
                      <div className="text-sm font-medium text-foreground">
                        {s.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.brand} · {s.type}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Price *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Unit Size
            </label>
            <select
              value={unit}
              onChange={(e) =>
                setUnit(e.target.value as "3.5g" | "7g" | "14g" | "28g")
              }
              className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="3.5g">3.5g (Eighth)</option>
              <option value="7g">7g (Quarter)</option>
              <option value="14g">14g (Half)</option>
              <option value="28g">28g (Ounce)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedStrain || !price || submitMutation.isPending}
          className="w-full px-6 py-3 bg-cta text-cta-foreground font-semibold text-sm rounded-lg hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Price
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Partner Dashboard ───────────────────────────────────────────────────────

function PartnerDashboard({ strains }: { strains: CatalogStrain[] }) {
  const { data: statsData, isLoading: statsLoading } =
    trpc.partners.myStats.useQuery();
  const { data: priceUpdates } = trpc.partners.myPriceUpdates.useQuery();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!statsData) return null;

  const { partner, stats } = statsData;

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/15",
      label: "Pending Verification",
      desc: "Your claim is being reviewed. You'll be able to submit prices once verified.",
    },
    verified: {
      icon: CheckCircle2,
      color: "text-savings",
      bg: "bg-savings/15",
      label: "Verified Partner",
      desc: "Your dispensary is verified. Submit prices to earn the Partner Verified badge.",
    },
    rejected: {
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/15",
      label: "Claim Rejected",
      desc: partner.adminNote || "Your claim was not approved. Contact support for details.",
    },
  };

  const status = statusConfig[partner.verificationStatus];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`${status.bg} border border-border/30 rounded-xl p-5`}>
        <div className="flex items-start gap-3">
          <StatusIcon className={`w-6 h-6 ${status.color} shrink-0 mt-0.5`} />
          <div>
            <h3 className="font-serif text-lg text-foreground">
              {partner.dispensaryName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bg}`}
              >
                {status.label}
              </span>
              <span className="text-xs text-muted-foreground">
                Claimed{" "}
                {new Date(partner.claimedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{status.desc}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {partner.verificationStatus === "verified" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Total Submitted
                </span>
              </div>
              <p className="font-price text-2xl font-bold text-foreground">
                {stats.totalSubmitted}
              </p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-savings" />
                <span className="text-xs text-muted-foreground">Approved</span>
              </div>
              <p className="font-price text-2xl font-bold text-savings">
                {stats.approved}
              </p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="font-price text-2xl font-bold text-amber-400">
                {stats.pending}
              </p>
            </div>
            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Rejected</span>
              </div>
              <p className="font-price text-2xl font-bold text-destructive">
                {stats.rejected}
              </p>
            </div>
          </div>

          {/* Price Update Form */}
          <PriceUpdateForm strains={strains} />

          {/* Recent Submissions */}
          {priceUpdates && priceUpdates.length > 0 && (
            <div className="bg-card border border-border/30 rounded-xl p-6">
              <h3 className="font-serif text-xl text-foreground mb-4">
                Recent Submissions
              </h3>
              <div className="space-y-2">
                {priceUpdates.slice(0, 10).map((pu) => (
                  <div
                    key={pu.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background border border-border/20"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {pu.strainName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {pu.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-price text-sm font-bold text-foreground">
                        ${pu.price}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          pu.status === "approved"
                            ? "text-savings bg-savings/15"
                            : pu.status === "pending"
                            ? "text-amber-400 bg-amber-500/15"
                            : "text-destructive bg-destructive/15"
                        }`}
                      >
                        {pu.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PartnerPortal() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { catalog, loading: catalogLoading } = useCatalog();
  const { data: partnership, isLoading: partnerLoading, refetch } =
    trpc.partners.myPartnership.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  const dispensaries = catalog?.dispensaries ?? [];
  const strains = catalog?.strains ?? [];

  const isLoading = authLoading || catalogLoading || (isAuthenticated && partnerLoading);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">
                Partner Portal
              </h1>
              <p className="text-sm text-muted-foreground">
                For Maryland dispensary owners and operators
              </p>
            </div>
          </div>

          {!isAuthenticated && !authLoading && (
            <p className="text-muted-foreground max-w-xl mt-2">
              Claim your dispensary listing, submit verified prices, and earn the
              Partner Verified badge that builds trust with customers.
            </p>
          )}
        </div>
      </section>

      <div className="container py-8 sm:py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading...</span>
          </div>
        ) : !isAuthenticated ? (
          /* Not logged in — show benefits + CTA */
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                {
                  icon: BadgeCheck,
                  title: "Partner Verified Badge",
                  desc: "Your prices display with a trusted verification badge across the site.",
                },
                {
                  icon: TrendingUp,
                  title: "Increase Visibility",
                  desc: "Verified dispensaries rank higher in search results and comparisons.",
                },
                {
                  icon: DollarSign,
                  title: "Real-Time Pricing",
                  desc: "Submit current prices so customers see accurate, up-to-date information.",
                },
                {
                  icon: Shield,
                  title: "Build Trust",
                  desc: "Show customers you're committed to price transparency in Maryland.",
                },
              ].map((benefit) => (
                <div
                  key={benefit.title}
                  className="bg-card border border-border/30 rounded-lg p-5"
                >
                  <benefit.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-serif text-base text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <a
                href={getLoginUrl()}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-cta text-cta-foreground font-semibold rounded-lg hover:bg-cta-hover transition-colors shadow-cta"
              >
                <LogIn className="w-5 h-5" />
                Sign In to Claim Your Dispensary
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                Free to join. No credit card required.
              </p>
            </div>
          </div>
        ) : !partnership ? (
          /* Logged in but no claim — show wizard */
          <ClaimWizard
            dispensaries={dispensaries}
            onSuccess={() => refetch()}
          />
        ) : (
          /* Active partner — show dashboard */
          <PartnerDashboard strains={strains} />
        )}
      </div>

      <Footer />
    </div>
  );
}

```

---

## 6. `client/src/pages/AdminPartners.tsx`

**Lines:** 502

```tsx
/*
 * StrainScout MD — Admin Partner Management
 * Admin-only page for reviewing partner claims and price submissions.
 * Two tabs: Partner Claims and Price Updates.
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import {
  Shield, CheckCircle, XCircle, Clock,
  Building2, DollarSign, User, ChevronDown,
  Loader2, ArrowLeft, BadgeCheck, Send
} from "lucide-react";
import { toast } from "sonner";

type Tab = "claims" | "prices";
type ClaimFilter = "all" | "pending" | "verified" | "rejected";
type PriceFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminPartners() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("claims");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("pending");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("pending");
  const [adminNote, setAdminNote] = useState<Record<number, string>>({});
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Partner claims queries
  const claimStatus = claimFilter === "all" ? undefined : claimFilter;
  const { data: partners, isLoading: partnersLoading } = trpc.partners.adminList.useQuery(
    { status: claimStatus as "pending" | "verified" | "rejected" | undefined, limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: pendingClaimCount } = trpc.partners.adminPendingCount.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  // Price updates queries
  const priceStatus = priceFilter === "all" ? undefined : priceFilter;
  const { data: priceUpdates, isLoading: pricesLoading } = trpc.partners.adminPriceUpdates.useQuery(
    { status: priceStatus as "pending" | "approved" | "rejected" | undefined, limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: pendingPriceCount } = trpc.partners.adminPendingPriceCount.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  // Mutations
  const verifyMutation = trpc.partners.adminVerify.useMutation({
    onSuccess: (data) => {
      toast.success(`Partner ${data.verificationStatus === "verified" ? "verified" : "rejected"}`);
      utils.partners.adminList.invalidate();
      utils.partners.adminPendingCount.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const reviewPriceMutation = trpc.partners.adminReviewPrice.useMutation({
    onSuccess: (data) => {
      toast.success(`Price ${data.status === "approved" ? "approved" : "rejected"}`);
      utils.partners.adminPriceUpdates.invalidate();
      utils.partners.adminPendingPriceCount.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleVerify = (partnerId: number, action: "verified" | "rejected") => {
    verifyMutation.mutate({
      partnerId,
      action,
      adminNote: adminNote[partnerId] || undefined,
    });
  };

  const handleReviewPrice = (priceUpdateId: number, action: "approved" | "rejected") => {
    reviewPriceMutation.mutate({
      priceUpdateId,
      action,
      reviewNote: reviewNote[priceUpdateId] || undefined,
    });
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">
            This page is restricted to site administrators.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Return to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
      pending: { color: "text-amber-400", bg: "bg-amber-500/15", icon: Clock },
      verified: { color: "text-savings", bg: "bg-savings/15", icon: CheckCircle },
      rejected: { color: "text-destructive", bg: "bg-destructive/15", icon: XCircle },
      approved: { color: "text-savings", bg: "bg-savings/15", icon: CheckCircle },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color} ${c.bg}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/moderation" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-foreground">
                Partner Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Review claims and price submissions
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-card border border-border/30 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("claims")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === "claims"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Claims
            {typeof pendingClaimCount === "number" && pendingClaimCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                {pendingClaimCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("prices")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === "prices"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Price Updates
            {typeof pendingPriceCount === "number" && pendingPriceCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                {pendingPriceCount}
              </span>
            )}
          </button>
        </div>

        {/* Claims Tab */}
        {tab === "claims" && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {(["pending", "verified", "rejected", "all"] as ClaimFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setClaimFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    claimFilter === f
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground bg-card border border-border/30"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {partnersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : !partners || partners.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No partner claims found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map((p) => (
                  <div
                    key={p.id}
                    className="bg-card border border-border/30 rounded-lg overflow-hidden"
                  >
                    <div
                      className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-accent/5 transition-colors"
                      onClick={() =>
                        setExpandedItem(expandedItem === p.id ? null : p.id)
                      }
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {p.dispensaryName}
                          </span>
                          {statusBadge(p.verificationStatus)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.businessName} · {p.contactEmail}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {new Date(p.claimedAt).toLocaleDateString()}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedItem === p.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    {expandedItem === p.id && (
                      <div className="px-5 pb-4 border-t border-border/20 pt-3">
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div>
                            <span className="text-muted-foreground text-xs">Dispensary Slug</span>
                            <p className="text-foreground">{p.dispensarySlug}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Business Name</span>
                            <p className="text-foreground">{p.businessName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Contact Email</span>
                            <p className="text-foreground">{p.contactEmail}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Phone</span>
                            <p className="text-foreground">{p.contactPhone || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Partner Tier</span>
                            <p className="text-foreground capitalize">{p.partnerTier}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">User ID</span>
                            <p className="text-foreground">{p.userId}</p>
                          </div>
                        </div>

                        {p.adminNote && (
                          <div className="mb-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                            <strong>Admin Note:</strong> {p.adminNote}
                          </div>
                        )}

                        {p.verificationStatus === "pending" && (
                          <div className="space-y-3">
                            <textarea
                              placeholder="Admin note (optional)..."
                              value={adminNote[p.id] || ""}
                              onChange={(e) =>
                                setAdminNote((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerify(p.id, "verified")}
                                disabled={verifyMutation.isPending}
                                className="flex-1 px-4 py-2 bg-savings/15 text-savings border border-savings/25 rounded-lg text-sm font-medium hover:bg-savings/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Verify
                              </button>
                              <button
                                onClick={() => handleVerify(p.id, "rejected")}
                                disabled={verifyMutation.isPending}
                                className="flex-1 px-4 py-2 bg-destructive/15 text-destructive border border-destructive/25 rounded-lg text-sm font-medium hover:bg-destructive/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price Updates Tab */}
        {tab === "prices" && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {(["pending", "approved", "rejected", "all"] as PriceFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setPriceFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    priceFilter === f
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground bg-card border border-border/30"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {pricesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : !priceUpdates || priceUpdates.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No price updates found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {priceUpdates.map((pu) => (
                  <div
                    key={pu.id}
                    className="bg-card border border-border/30 rounded-lg overflow-hidden"
                  >
                    <div
                      className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-accent/5 transition-colors"
                      onClick={() =>
                        setExpandedItem(
                          expandedItem === pu.id + 10000 ? null : pu.id + 10000
                        )
                      }
                    >
                      <div className="w-9 h-9 rounded-full bg-cta/15 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4 text-cta" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {pu.strainName}
                          </span>
                          <span className="font-price text-sm font-bold text-foreground">
                            ${pu.price}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            / {pu.unit}
                          </span>
                          {statusBadge(pu.status)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {pu.dispensaryName} · Partner #{pu.partnerId}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {new Date(pu.submittedAt).toLocaleDateString()}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedItem === pu.id + 10000 ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    {expandedItem === pu.id + 10000 && (
                      <div className="px-5 pb-4 border-t border-border/20 pt-3">
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div>
                            <span className="text-muted-foreground text-xs">Strain ID</span>
                            <p className="text-foreground font-mono text-xs">{pu.strainId}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Dispensary</span>
                            <p className="text-foreground">{pu.dispensaryName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Expires</span>
                            <p className="text-foreground">
                              {pu.expiresAt
                                ? new Date(pu.expiresAt).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Reviewed</span>
                            <p className="text-foreground">
                              {pu.reviewedAt
                                ? new Date(pu.reviewedAt).toLocaleDateString()
                                : "Not yet"}
                            </p>
                          </div>
                        </div>

                        {pu.reviewNote && (
                          <div className="mb-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                            <strong>Review Note:</strong> {pu.reviewNote}
                          </div>
                        )}

                        {pu.status === "pending" && (
                          <div className="space-y-3">
                            <textarea
                              placeholder="Review note (optional)..."
                              value={reviewNote[pu.id] || ""}
                              onChange={(e) =>
                                setReviewNote((prev) => ({
                                  ...prev,
                                  [pu.id]: e.target.value,
                                }))
                              }
                              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewPrice(pu.id, "approved")}
                                disabled={reviewPriceMutation.isPending}
                                className="flex-1 px-4 py-2 bg-savings/15 text-savings border border-savings/25 rounded-lg text-sm font-medium hover:bg-savings/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewPrice(pu.id, "rejected")}
                                disabled={reviewPriceMutation.isPending}
                                className="flex-1 px-4 py-2 bg-destructive/15 text-destructive border border-destructive/25 rounded-lg text-sm font-medium hover:bg-destructive/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

```

---

## 7. `client/src/pages/Moderation.tsx`

**Lines:** 289

```tsx
/**
 * Moderation Queue — Admin-only page for reviewing flagged/pending comments.
 * Features: filter by status, approve/reject with notes, bulk actions.
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import {
  Shield, CheckCircle, XCircle, Clock, AlertTriangle,
  MessageSquare, User, Flag, ChevronDown, Loader2, ArrowLeft
} from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function Moderation() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [moderationNote, setModerationNote] = useState<Record<number, string>>({});
  const [expandedComment, setExpandedComment] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const queryStatus = statusFilter === "all" ? undefined : statusFilter;
  const { data: comments, isLoading } = trpc.comments.moderation.useQuery(
    { status: queryStatus, limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: pendingCount } = trpc.comments.pendingCount.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const moderateMutation = trpc.comments.moderate.useMutation({
    onSuccess: () => {
      utils.comments.moderation.invalidate();
      utils.comments.pendingCount.invalidate();
    },
  });

  const handleModerate = (commentId: number, action: "approved" | "rejected") => {
    moderateMutation.mutate({
      commentId,
      action,
      moderationNote: moderationNote[commentId] || undefined,
    });
    setModerationNote((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
    setExpandedComment(null);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    approved: <CheckCircle className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">This page is only accessible to administrators.</p>
          <Link href="/" className="text-primary text-sm hover:underline">
            Return to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Comment Moderation</h1>
            {pendingCount !== undefined && pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Review and moderate community comments. Flagged comments require manual approval.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["pending", "all", "approved", "rejected"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "pending" && <Clock className="w-3 h-3 inline mr-1" />}
              {status === "all" && <MessageSquare className="w-3 h-3 inline mr-1" />}
              {status === "approved" && <CheckCircle className="w-3 h-3 inline mr-1" />}
              {status === "rejected" && <XCircle className="w-3 h-3 inline mr-1" />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === "pending" && pendingCount !== undefined && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Comments List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-2 text-muted-foreground text-sm">Loading comments...</span>
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`bg-card border rounded-xl p-4 sm:p-5 transition-colors ${
                  comment.flagged === "flagged"
                    ? "border-amber-500/30"
                    : "border-border/30"
                }`}
              >
                {/* Comment Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {comment.userName || `User #${comment.userId}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      on <Link href={`/strain/${comment.strainId}`} className="text-primary hover:underline">
                        {comment.strainName}
                      </Link>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.flagged === "flagged" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
                        <Flag className="w-2.5 h-2.5" />
                        Flagged
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusColors[comment.status]}`}>
                      {statusIcons[comment.status]}
                      {comment.status}
                    </span>
                  </div>
                </div>

                {/* Comment Content */}
                <p className="text-sm text-foreground/90 leading-relaxed mb-3 pl-8">
                  {comment.content}
                </p>

                {/* Moderation Note (if exists) */}
                {comment.moderationNote && (
                  <div className="ml-8 mb-3 px-3 py-2 bg-muted/30 border border-border/20 rounded-lg text-xs text-muted-foreground">
                    <span className="font-medium">Moderation note:</span> {comment.moderationNote}
                  </div>
                )}

                {/* Action Buttons */}
                {comment.status === "pending" && (
                  <div className="pl-8">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleModerate(comment.id, "approved")}
                        disabled={moderateMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          if (expandedComment === comment.id) {
                            handleModerate(comment.id, "rejected");
                          } else {
                            setExpandedComment(comment.id);
                          }
                        }}
                        disabled={moderateMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                      <button
                        onClick={() => setExpandedComment(expandedComment === comment.id ? null : comment.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-xs hover:text-foreground transition-colors"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedComment === comment.id ? "rotate-180" : ""}`} />
                        Add Note
                      </button>
                    </div>

                    {/* Expanded Note Input */}
                    {expandedComment === comment.id && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={moderationNote[comment.id] || ""}
                          onChange={(e) => setModerationNote((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                          placeholder="Optional moderation note (e.g., reason for rejection)..."
                          className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                          maxLength={256}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {statusFilter === "pending"
                ? "No comments awaiting moderation."
                : `No ${statusFilter === "all" ? "" : statusFilter + " "}comments found.`}
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

```

---

## 8. `client/src/pages/Account.tsx`

**Lines:** 66

```tsx
/*
 * StrainScout MD — Account Page (Shell)
 * Design: Botanical Data Lab
 * Placeholder for saved strains, deal alerts, and preferences
 */

import { Bell, Bookmark, Settings, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

export default function Account() {
  const handleFeatureClick = () => {
    toast("Feature coming soon", {
      description: "Account features will be available in a future update.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-12">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Your Account</h1>
        <p className="text-muted-foreground mb-8">Manage your saved strains, deal alerts, and preferences.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button onClick={handleFeatureClick} className="bg-card border border-border/30 rounded-lg p-6 text-left hover:border-primary/30 hover:bg-accent/20 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
              <Bookmark className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Saved Strains</h3>
            <p className="text-sm text-muted-foreground">Bookmark your favorite strains for quick access and price tracking.</p>
          </button>

          <button onClick={handleFeatureClick} className="bg-card border border-border/30 rounded-lg p-6 text-left hover:border-primary/30 hover:bg-accent/20 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-savings flex items-center justify-center mb-4 group-hover:opacity-80 transition-opacity">
              <Bell className="w-6 h-6 text-savings" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Deal Alerts</h3>
            <p className="text-sm text-muted-foreground">Get notified when your saved strains drop in price at nearby dispensaries.</p>
          </button>

          <button onClick={handleFeatureClick} className="bg-card border border-border/30 rounded-lg p-6 text-left hover:border-primary/30 hover:bg-accent/20 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-amber-500/15 flex items-center justify-center mb-4 group-hover:bg-amber-500/25 transition-colors">
              <Heart className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Preferences</h3>
            <p className="text-sm text-muted-foreground">Set your preferred dispensaries, location, and product categories.</p>
          </button>

          <button onClick={handleFeatureClick} className="bg-card border border-border/30 rounded-lg p-6 text-left hover:border-primary/30 hover:bg-accent/20 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:bg-accent/80 transition-colors">
              <Settings className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Settings</h3>
            <p className="text-sm text-muted-foreground">Manage your account settings, email notifications, and data preferences.</p>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

```

---

## 9. `client/src/pages/NotFound.tsx`

**Lines:** 53

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>

          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            Page Not Found
          </h2>

          <p className="text-slate-600 mb-8 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

```

---

## 10. `client/src/pages/ComponentShowcase.tsx`

**Lines:** 1438

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  AlertCircle,
  CalendarIcon,
  Check,
  Clock,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast as sonnerToast } from "sonner";
import { AIChatBox, type Message } from "@/components/AIChatBox";

export default function ComponentsShowcase() {
  const { theme, toggleTheme } = useTheme();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [datePickerDate, setDatePickerDate] = useState<Date>();
  const [selectedFruits, setSelectedFruits] = useState<string[]>([]);
  const [progress, setProgress] = useState(33);
  const [currentPage, setCurrentPage] = useState(2);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [dialogInput, setDialogInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // AI ChatBox demo state
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: "system", content: "You are a helpful assistant." },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleDialogSubmit = () => {
    console.log("Dialog submitted with value:", dialogInput);
    sonnerToast.success("Submitted successfully", {
      description: `Input: ${dialogInput}`,
    });
    setDialogInput("");
    setDialogOpen(false);
  };

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleDialogSubmit();
    }
  };

  const handleChatSend = (content: string) => {
    // Add user message
    const newMessages: Message[] = [...chatMessages, { role: "user", content }];
    setChatMessages(newMessages);

    // Simulate AI response with delay
    setIsChatLoading(true);
    setTimeout(() => {
      const aiResponse: Message = {
        role: "assistant",
        content: `This is a **demo response**. In a real app, you would call a tRPC mutation here:\n\n\`\`\`typescript\nconst chatMutation = trpc.ai.chat.useMutation({\n  onSuccess: (response) => {\n    setChatMessages(prev => [...prev, {\n      role: "assistant",\n      content: response.choices[0].message.content\n    }]);\n  }\n});\n\nchatMutation.mutate({ messages: newMessages });\n\`\`\`\n\nYour message was: "${content}"`,
      };
      setChatMessages([...newMessages, aiResponse]);
      setIsChatLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container max-w-6xl mx-auto">
        <div className="space-y-2 justify-between flex">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            Shadcn/ui Component Library
          </h2>
          <Button variant="outline" size="icon" onClick={toggleTheme}>
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="space-y-12">
          {/* Text Colors Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Text Colors</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Foreground (Default)
                      </p>
                      <p className="text-foreground text-lg">
                        Default text color for main content
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Muted Foreground
                      </p>
                      <p className="text-muted-foreground text-lg">
                        Muted text for secondary information
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Primary
                      </p>
                      <p className="text-primary text-lg font-medium">
                        Primary brand color text
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Secondary Foreground
                      </p>
                      <p className="text-secondary-foreground text-lg">
                        Secondary action text color
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Accent Foreground
                      </p>
                      <p className="text-accent-foreground text-lg">
                        Accent text for emphasis
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Destructive
                      </p>
                      <p className="text-destructive text-lg font-medium">
                        Error or destructive action text
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Card Foreground
                      </p>
                      <p className="text-card-foreground text-lg">
                        Text color on card backgrounds
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Popover Foreground
                      </p>
                      <p className="text-popover-foreground text-lg">
                        Text color in popovers
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Color Combinations Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Color Combinations</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-primary text-primary-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Primary</p>
                    <p className="text-sm opacity-90">
                      Primary background with foreground text
                    </p>
                  </div>
                  <div className="bg-secondary text-secondary-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Secondary</p>
                    <p className="text-sm opacity-90">
                      Secondary background with foreground text
                    </p>
                  </div>
                  <div className="bg-muted text-muted-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Muted</p>
                    <p className="text-sm opacity-90">
                      Muted background with foreground text
                    </p>
                  </div>
                  <div className="bg-accent text-accent-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Accent</p>
                    <p className="text-sm opacity-90">
                      Accent background with foreground text
                    </p>
                  </div>
                  <div className="bg-destructive text-destructive-foreground rounded-lg p-4">
                    <p className="font-medium mb-1">Destructive</p>
                    <p className="text-sm opacity-90">
                      Destructive background with foreground text
                    </p>
                  </div>
                  <div className="bg-card text-card-foreground rounded-lg p-4 border">
                    <p className="font-medium mb-1">Card</p>
                    <p className="text-sm opacity-90">
                      Card background with foreground text
                    </p>
                  </div>
                  <div className="bg-popover text-popover-foreground rounded-lg p-4 border">
                    <p className="font-medium mb-1">Popover</p>
                    <p className="text-sm opacity-90">
                      Popover background with foreground text
                    </p>
                  </div>
                  <div className="bg-background text-foreground rounded-lg p-4 border">
                    <p className="font-medium mb-1">Background</p>
                    <p className="text-sm opacity-90">
                      Default background with foreground text
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Buttons Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Buttons</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button size="sm">Small</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Form Inputs Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Form Inputs</h3>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a fruit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apple">Apple</SelectItem>
                      <SelectItem value="banana">Banana</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">Accept terms and conditions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="airplane-mode" />
                  <Label htmlFor="airplane-mode">Airplane Mode</Label>
                </div>
                <div className="space-y-2">
                  <Label>Radio Group</Label>
                  <RadioGroup defaultValue="option-one">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option-one" id="option-one" />
                      <Label htmlFor="option-one">Option One</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option-two" id="option-two" />
                      <Label htmlFor="option-two">Option Two</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Slider</Label>
                  <Slider defaultValue={[50]} max={100} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>Input OTP</Label>
                  <InputOTP maxLength={6}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="space-y-2">
                  <Label>Date Time Picker</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !datePickerDate && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {datePickerDate ? (
                          format(datePickerDate, "PPP HH:mm", { locale: zhCN })
                        ) : (
                          <span>Select date and time</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3 space-y-3">
                        <Calendar
                          mode="single"
                          selected={datePickerDate}
                          onSelect={setDatePickerDate}
                        />
                        <div className="border-t pt-3 space-y-2">
                          <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Time
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={
                                datePickerDate
                                  ? format(datePickerDate, "HH:mm")
                                  : "00:00"
                              }
                              onChange={e => {
                                const [hours, minutes] =
                                  e.target.value.split(":");
                                const newDate = datePickerDate
                                  ? new Date(datePickerDate)
                                  : new Date();
                                newDate.setHours(parseInt(hours));
                                newDate.setMinutes(parseInt(minutes));
                                setDatePickerDate(newDate);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {datePickerDate && (
                    <p className="text-sm text-muted-foreground">
                      Selected:{" "}
                      {format(datePickerDate, "yyyy/MM/dd  HH:mm", {
                        locale: zhCN,
                      })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Searchable Dropdown</Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between"
                      >
                        {selectedFramework
                          ? [
                              { value: "react", label: "React" },
                              { value: "vue", label: "Vue" },
                              { value: "angular", label: "Angular" },
                              { value: "svelte", label: "Svelte" },
                              { value: "nextjs", label: "Next.js" },
                              { value: "nuxt", label: "Nuxt" },
                              { value: "remix", label: "Remix" },
                            ].find(fw => fw.value === selectedFramework)?.label
                          : "Select framework..."}
                        <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search frameworks..." />
                        <CommandList>
                          <CommandEmpty>No framework found</CommandEmpty>
                          <CommandGroup>
                            {[
                              { value: "react", label: "React" },
                              { value: "vue", label: "Vue" },
                              { value: "angular", label: "Angular" },
                              { value: "svelte", label: "Svelte" },
                              { value: "nextjs", label: "Next.js" },
                              { value: "nuxt", label: "Nuxt" },
                              { value: "remix", label: "Remix" },
                            ].map(framework => (
                              <CommandItem
                                key={framework.value}
                                value={framework.value}
                                onSelect={currentValue => {
                                  setSelectedFramework(
                                    currentValue === selectedFramework
                                      ? ""
                                      : currentValue
                                  );
                                  setOpenCombobox(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedFramework === framework.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {framework.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedFramework && (
                    <p className="text-sm text-muted-foreground">
                      Selected:{" "}
                      {
                        [
                          { value: "react", label: "React" },
                          { value: "vue", label: "Vue" },
                          { value: "angular", label: "Angular" },
                          { value: "svelte", label: "Svelte" },
                          { value: "nextjs", label: "Next.js" },
                          { value: "nuxt", label: "Nuxt" },
                          { value: "remix", label: "Remix" },
                        ].find(fw => fw.value === selectedFramework)?.label
                      }
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month" className="text-sm font-medium">
                        Month
                      </Label>
                      <Select
                        value={selectedMonth}
                        onValueChange={setSelectedMonth}
                      >
                        <SelectTrigger id="month">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            month => (
                              <SelectItem
                                key={month}
                                value={month.toString().padStart(2, "0")}
                              >
                                {month.toString().padStart(2, "0")}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year" className="text-sm font-medium">
                        Year
                      </Label>
                      <Select
                        value={selectedYear}
                        onValueChange={setSelectedYear}
                      >
                        <SelectTrigger id="year">
                          <SelectValue placeholder="YYYY" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: 10 },
                            (_, i) => new Date().getFullYear() - 5 + i
                          ).map(year => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {selectedMonth && selectedYear && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedYear}/{selectedMonth}/
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Data Display Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Data Display</h3>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Badges</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex gap-4">
                    <Avatar>
                      <AvatarImage src="https://github.com/shadcn.png" />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>AB</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Progress</Label>
                  <Progress value={progress} />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setProgress(Math.max(0, progress - 10))}
                    >
                      -10
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setProgress(Math.min(100, progress + 10))}
                    >
                      +10
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Skeleton</Label>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Pagination</Label>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={e => {
                            e.preventDefault();
                            setCurrentPage(Math.max(1, currentPage - 1));
                          }}
                        />
                      </PaginationItem>
                      {[1, 2, 3, 4, 5].map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === page}
                            onClick={e => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={e => {
                            e.preventDefault();
                            setCurrentPage(Math.min(5, currentPage + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <p className="text-sm text-muted-foreground text-center">
                    Current page: {currentPage}
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Table</Label>
                  <Table>
                    <TableCaption>A list of your recent invoices.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">INV001</TableCell>
                        <TableCell>Paid</TableCell>
                        <TableCell>Credit Card</TableCell>
                        <TableCell className="text-right">$250.00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">INV002</TableCell>
                        <TableCell>Pending</TableCell>
                        <TableCell>PayPal</TableCell>
                        <TableCell className="text-right">$150.00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">INV003</TableCell>
                        <TableCell>Unpaid</TableCell>
                        <TableCell>Bank Transfer</TableCell>
                        <TableCell className="text-right">$350.00</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Menubar</Label>
                  <Menubar>
                    <MenubarMenu>
                      <MenubarTrigger>File</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>New Tab</MenubarItem>
                        <MenubarItem>New Window</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem>Share</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem>Print</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>Edit</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>Undo</MenubarItem>
                        <MenubarItem>Redo</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>View</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>Reload</MenubarItem>
                        <MenubarItem>Force Reload</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                  </Menubar>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Breadcrumb</Label>
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/components">
                          Components
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Alerts Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Alerts</h3>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>
                  You can add components to your app using the cli.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Your session has expired. Please log in again.
                </AlertDescription>
              </Alert>
            </div>
          </section>

          {/* Tabs Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Tabs</h3>
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>
                      Make changes to your account here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" defaultValue="Pedro Duarte" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>Save changes</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                      Change your password here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="current">Current password</Label>
                      <Input id="current" type="password" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new">New password</Label>
                      <Input id="new" type="password" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>Save password</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>
                      Manage your settings here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Settings content goes here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          {/* Accordion Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Accordion</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                  Yes. It comes with default styles that matches the other
                  components' aesthetic.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>
                  Yes. It's animated by default, but you can disable it if you
                  prefer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Collapsible Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Collapsible</h3>
            <Collapsible>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <CardTitle>@peduarte starred 3 repositories</CardTitle>
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="rounded-md border px-4 py-3 font-mono text-sm">
                        @radix-ui/primitives
                      </div>
                      <div className="rounded-md border px-4 py-3 font-mono text-sm">
                        @radix-ui/colors
                      </div>
                      <div className="rounded-md border px-4 py-3 font-mono text-sm">
                        @stitches/react
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </section>

          {/* Dialog, Sheet, Drawer Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Overlays</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Test Input</DialogTitle>
                        <DialogDescription>
                          Enter some text below. Press Enter to submit (IME composition supported).
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="dialog-input">Input</Label>
                          <Input
                            id="dialog-input"
                            placeholder="Type something..."
                            value={dialogInput}
                            onChange={(e) => setDialogInput(e.target.value)}
                            onKeyDown={handleDialogKeyDown}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleDialogSubmit}>Submit</Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">Open Sheet</Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Edit profile</SheetTitle>
                        <SheetDescription>
                          Make changes to your profile here. Click save when
                          you're done.
                        </SheetDescription>
                      </SheetHeader>
                    </SheetContent>
                  </Sheet>

                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button variant="outline">Open Drawer</Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                        <DrawerDescription>
                          This action cannot be undone.
                        </DrawerDescription>
                      </DrawerHeader>
                      <DrawerFooter>
                        <Button>Submit</Button>
                        <DrawerClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">Open Popover</Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Dimensions</h4>
                        <p className="text-sm text-muted-foreground">
                          Set the dimensions for the layer.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover me</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to library</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Menus Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Menus</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">Dropdown Menu</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Profile</DropdownMenuItem>
                      <DropdownMenuItem>Billing</DropdownMenuItem>
                      <DropdownMenuItem>Team</DropdownMenuItem>
                      <DropdownMenuItem>Subscription</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <Button variant="outline">Right Click Me</Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem>Profile</ContextMenuItem>
                      <ContextMenuItem>Billing</ContextMenuItem>
                      <ContextMenuItem>Team</ContextMenuItem>
                      <ContextMenuItem>Subscription</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>

                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button variant="outline">Hover Card</Button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">@nextjs</h4>
                        <p className="text-sm">
                          The React Framework – created and maintained by
                          @vercel.
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Calendar Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Calendar</h3>
            <Card>
              <CardContent className="pt-6 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </section>

          {/* Carousel Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Carousel</h3>
            <Card>
              <CardContent className="pt-6">
                <Carousel className="w-full max-w-xs mx-auto">
                  <CarouselContent>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <CarouselItem key={index}>
                        <div className="p-1">
                          <Card>
                            <CardContent className="flex aspect-square items-center justify-center p-6">
                              <span className="text-4xl font-semibold">
                                {index + 1}
                              </span>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </CardContent>
            </Card>
          </section>

          {/* Toggle Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Toggle</h3>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Toggle</Label>
                  <div className="flex gap-2">
                    <Toggle aria-label="Toggle italic">
                      <span className="font-bold">B</span>
                    </Toggle>
                    <Toggle aria-label="Toggle italic">
                      <span className="italic">I</span>
                    </Toggle>
                    <Toggle aria-label="Toggle underline">
                      <span className="underline">U</span>
                    </Toggle>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Toggle Group</Label>
                  <ToggleGroup type="multiple">
                    <ToggleGroupItem value="bold" aria-label="Toggle bold">
                      <span className="font-bold">B</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Toggle italic">
                      <span className="italic">I</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="underline"
                      aria-label="Toggle underline"
                    >
                      <span className="underline">U</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Aspect Ratio & Scroll Area Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Layout Components</h3>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Aspect Ratio (16/9)</Label>
                  <AspectRatio ratio={16 / 9} className="bg-muted">
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">16:9 Aspect Ratio</p>
                    </div>
                  </AspectRatio>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Scroll Area</Label>
                  <ScrollArea className="h-[200px] w-full rounded-md border overflow-hidden">
                    <div className="p-4">
                      <div className="space-y-4">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className="text-sm">
                            Item {i + 1}: This is a scrollable content area
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Resizable Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Resizable Panels</h3>
            <Card>
              <CardContent className="pt-6">
                <ResizablePanelGroup
                  direction="horizontal"
                  className="min-h-[200px] rounded-lg border"
                >
                  <ResizablePanel defaultSize={50}>
                    <div className="flex h-full items-center justify-center p-6">
                      <span className="font-semibold">Panel One</span>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={50}>
                    <div className="flex h-full items-center justify-center p-6">
                      <span className="font-semibold">Panel Two</span>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </CardContent>
            </Card>
          </section>

          {/* Toast Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">Toast</h3>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Sonner Toast</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.success("Operation successful", {
                          description: "Your changes have been saved",
                        });
                      }}
                    >
                      Success
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.error("Operation failed", {
                          description:
                            "Cannot complete operation, please try again",
                        });
                      }}
                    >
                      Error
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.info("Information", {
                          description: "This is an information message",
                        });
                      }}
                    >
                      Info
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.warning("Warning", {
                          description:
                            "Please note the impact of this operation",
                        });
                      }}
                    >
                      Warning
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sonnerToast.loading("Loading", {
                          description: "Please wait",
                        });
                      }}
                    >
                      Loading
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const promise = new Promise(resolve =>
                          setTimeout(resolve, 2000)
                        );
                        sonnerToast.promise(promise, {
                          loading: "Processing...",
                          success: "Processing complete!",
                          error: "Processing failed",
                        });
                      }}
                    >
                      Promise
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* AI ChatBox Section */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold">AI ChatBox</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      A ready-to-use chat interface component that integrates with the LLM system.
                      Features markdown rendering, auto-scrolling, and loading states.
                    </p>
                    <p className="mt-2">
                      This is a demo with simulated responses. In a real app, you'd connect it to a tRPC mutation.
                    </p>
                  </div>
                  <AIChatBox
                    messages={chatMessages}
                    onSendMessage={handleChatSend}
                    isLoading={isChatLoading}
                    placeholder="Try sending a message..."
                    height="500px"
                    emptyStateMessage="How can I help you today?"
                    suggestedPrompts={[
                      "What is React?",
                      "Explain TypeScript",
                      "How to use tRPC?",
                      "Best practices for web development",
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Shadcn/ui Component Showcase</p>
        </div>
      </footer>
    </div>
  );
}

```

---
