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
