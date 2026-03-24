"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, MapPin, Star, Leaf, ArrowUpDown,
  ChevronRight, Loader2, Building2, Phone,
} from "lucide-react";
import { useDispensaryDirectory, type DirectoryDispensary } from "@/hooks/useDispensaryDirectory";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type SortKey = "name" | "strain_count" | "price_min" | "google_rating";

function DispensaryCard({ dispensary: d }: { dispensary: DirectoryDispensary }) {
  const slug = slugify(d.name);
  const rating = parseFloat(d.google_rating || "0");

  return (
    <Link href={`/dispensary/${slug}`}>
      <div className="group bg-card border border-border/30 rounded-lg p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{d.name}</h3>
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
              <span className="font-price font-semibold text-savings">${d.price_min}</span>
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

export default function DispensaryDirectoryPage() {
  const { dispensaries, loading, error } = useDispensaryDirectory();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("strain_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const cities = useMemo(() => {
    const citySet = new Set(dispensaries.map((d) => d.city).filter(Boolean));
    return Array.from(citySet).sort();
  }, [dispensaries]);

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
    if (cityFilter) result = result.filter((d) => d.city === cityFilter);
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "strain_count") cmp = (a.strain_count ?? 0) - (b.strain_count ?? 0);
      else if (sortBy === "price_min") cmp = (a.price_min ?? 999) - (b.price_min ?? 999);
      else if (sortBy === "google_rating") cmp = parseFloat(a.google_rating || "0") - parseFloat(b.google_rating || "0");
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [dispensaries, search, cityFilter, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  return (
    <div className="min-h-screen bg-background">
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
          <p className="text-muted-foreground max-w-2xl">
            Browse all licensed dispensaries in Maryland. Compare strain selections, price ranges, and ratings.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border/20 bg-background sticky top-14 sm:top-16 z-20">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center flex-1 bg-card border border-border/50 rounded-lg overflow-hidden focus-within:border-primary/50 transition-colors">
              <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search dispensary name, city, or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-card border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary/50 min-w-[160px]"
            >
              <option value="">All Cities</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
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
                  {sortBy === key && <ArrowUpDown className="w-3 h-3" />}
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
          <div role="status" className="flex items-center justify-center py-20">
            <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading dispensaries...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((d) => <DispensaryCard key={d.id} dispensary={d} />)}
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
    </div>
  );
}
