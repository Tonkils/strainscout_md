"use client";

import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { MapPin, ArrowRight, Loader2, Leaf, Cigarette, Wind, Beaker, Cookie, Globe, Navigation } from "lucide-react";
import DealDigestBanner from "@/components/DealDigestBanner";
import AgeGate from "@/components/AgeGate";
import EmailPopup from "@/components/EmailPopup";
import HomeMap from "@/components/HomeMap";
import { useCatalog, useCatalogStats } from "@/hooks/useCatalog";
import { useDispensaryDirectory, haversineDistance } from "@/hooks/useDispensaryDirectory";
import { getCategoryFromStrain, type ProductCategory } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
    _mapsLoading?: Promise<void>;
  }
}

const BROWSE_CATEGORIES: { cat: ProductCategory; icon: React.ReactNode; desc: string }[] = [
  { cat: "Flower",      icon: <Leaf className="w-5 h-5" />,      desc: "Traditional buds" },
  { cat: "Pre-Roll",    icon: <Cigarette className="w-5 h-5" />, desc: "Ready-to-smoke" },
  { cat: "Vape",        icon: <Wind className="w-5 h-5" />,       desc: "Carts & pods" },
  { cat: "Concentrate", icon: <Beaker className="w-5 h-5" />,    desc: "Wax, rosin & more" },
  { cat: "Edible",      icon: <Cookie className="w-5 h-5" />,    desc: "Gummies & edibles" },
];

const FALLBACK_STATS = {
  totalStrains: 844,
  totalDispensaries: 66,
  totalBrands: 120,
  lastUpdated: "March 2026",
};

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const didAutoGeocode = useRef(false);

  const [ageVerified, setAgeVerified] = useState(false);
  const [zipInput, setZipInput] = useState(() => searchParams.get("zip") ?? "");
  const [zipLocating, setZipLocating] = useState(false);
  const [zipError, setZipError] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { catalog, loading } = useCatalog();
  const { stats } = useCatalogStats();
  const { dispensaries } = useDispensaryDirectory();

  const displayStats = stats.totalStrains > 0 ? stats : FALLBACK_STATS;

  const categoryCounts = useMemo(() => {
    if (!catalog) return {} as Record<ProductCategory, number>;
    const counts = {} as Record<ProductCategory, number>;
    for (const s of catalog.strains) {
      const c = getCategoryFromStrain(s);
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [catalog]);

  const { nearbyDispensaries, activeRadius } = useMemo(() => {
    if (!userLocation || dispensaries.length === 0)
      return { nearbyDispensaries: [], activeRadius: 5 };
    const withDistance = dispensaries.map((d) => ({
      ...d,
      distance: haversineDistance(userLocation.lat, userLocation.lng, d.lat, d.lng),
    }));
    for (const radius of [5, 10, 25, 50]) {
      const filtered = withDistance.filter((d) => d.distance <= radius);
      if (filtered.length > 0)
        return { nearbyDispensaries: filtered.sort((a, b) => a.distance - b.distance), activeRadius: radius };
    }
    return { nearbyDispensaries: [], activeRadius: 50 };
  }, [dispensaries, userLocation]);

  const cheapFlowerNearYou = useMemo(() => {
    if (!catalog || nearbyDispensaries.length === 0) return [];
    const nearbyNames = new Set(
      nearbyDispensaries.map((d) => d.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
    );
    return catalog.strains
      .filter((s) => {
        if (getCategoryFromStrain(s) !== "Flower" || s.price_min == null) return false;
        return (s.prices || []).some((p) =>
          nearbyNames.has(p.dispensary.toLowerCase().replace(/[^a-z0-9]/g, ""))
        );
      })
      .sort((a, b) => (a.price_min ?? 999) - (b.price_min ?? 999))
      .slice(0, 5);
  }, [catalog, nearbyDispensaries]);

  const cheapestNearbyDispensary = useMemo(() => {
    return (
      [...nearbyDispensaries]
        .filter((d) => d.price_avg != null)
        .sort((a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999))[0] ?? null
    );
  }, [nearbyDispensaries]);

  const handleFindNearMe = useCallback(async () => {
    if (!/^\d{5}$/.test(zipInput)) {
      setZipError("Enter a valid 5-digit zip code");
      return;
    }
    setZipError("");
    setZipLocating(true);

    if (!window.google?.maps) {
      if (window._mapsLoading) await window._mapsLoading;
      if (!window.google?.maps) {
        setZipError("Maps still loading — please try again in a moment");
        setZipLocating(false);
        return;
      }
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: `${zipInput}, Maryland, USA` }, (results, status) => {
      setZipLocating(false);
      if (status === "OK" && results?.[0]) {
        const loc = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        };
        setUserLocation(loc);
        const params = new URLSearchParams(window.location.search);
        params.set("zip", zipInput);
        router.replace(`?${params.toString()}`, { scroll: false });
      } else {
        setZipError("Zip code not found in Maryland");
      }
    });
  }, [zipInput, router]);

  // Auto-geocode on mount when a zip code is present in the URL
  useEffect(() => {
    const zipFromUrl = searchParams.get("zip");
    if (!zipFromUrl || !/^\d{5}$/.test(zipFromUrl) || didAutoGeocode.current) return;
    didAutoGeocode.current = true;
    setZipInput(zipFromUrl);
    handleFindNearMe();
  }, [handleFindNearMe, searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <AgeGate onVerified={() => setAgeVerified(true)} />
      <EmailPopup show={ageVerified} delayMs={2000} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-background/80 to-background" />
        <div className="relative container py-12 sm:py-20 md:py-28">
          <div className="max-w-2xl">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl text-foreground leading-[1.1] mb-4 sm:mb-6">
              Find the cheapest{" "}
              <span className="text-primary">weed</span>{" "}
              in Maryland
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-8">
              Compare prices across{" "}
              <span className="font-price text-primary">{displayStats.totalDispensaries}</span>{" "}
              dispensaries. Enter your zip code to find what&apos;s cheapest near you.
            </p>

            {/* Zip Code Input */}
            <div className="max-w-md">
              <div className="flex items-stretch bg-card border border-border/50 rounded-lg overflow-hidden focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10 transition-all">
                <div className="flex items-center flex-1">
                  <MapPin className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter zip code (e.g. 20878)"
                    value={zipInput}
                    maxLength={5}
                    onChange={(e) => {
                      setZipInput(e.target.value.replace(/\D/g, ""));
                      setZipError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleFindNearMe()}
                    className="flex-1 bg-transparent px-3 py-4 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleFindNearMe}
                  disabled={zipLocating}
                  className="shrink-0 px-5 py-4 bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta disabled:opacity-60 flex items-center gap-2"
                >
                  {zipLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Find Near Me"
                  )}
                </button>
              </div>
              {zipError && (
                <p className="text-xs text-red-400 mt-2 pl-1">{zipError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="border-b border-border/30">
        <div className="container py-6 sm:py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-base sm:text-lg text-foreground">Browse by Category</h2>
            <Link href="/compare" className="text-xs text-primary hover:underline flex items-center gap-1">
              All products <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {BROWSE_CATEGORIES.map(({ cat, icon, desc }) => (
              <Link
                key={cat}
                href={`/category/${cat.toLowerCase()}`}
                className="flex flex-col items-center text-center gap-2 p-4 bg-card border border-border/30 rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{cat}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                  {!loading && categoryCounts[cat] != null && (
                    <p className="text-[10px] font-price text-primary mt-0.5">
                      {categoryCounts[cat].toLocaleString()} products
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Cheap Flower Near You */}
      {cheapFlowerNearYou.length > 0 && (
        <section className="border-b border-border/30">
          <div className="container py-6 sm:py-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-serif text-lg sm:text-xl text-foreground">
                  Cheap Flower Near You
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Within {activeRadius} miles of {zipInput} · sorted by price
                </p>
              </div>
              <Link
                href="/compare?category=flower"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                See all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cheapFlowerNearYou.map((strain) => {
                const normalizedNearby = new Set(
                  nearbyDispensaries.map((d) => d.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
                );
                const bestNearbyPrice = [...(strain.prices || [])]
                  .filter((p) =>
                    normalizedNearby.has(p.dispensary.toLowerCase().replace(/[^a-z0-9]/g, ""))
                  )
                  .sort((a, b) => a.price - b.price)[0];

                const dispensarySlug = bestNearbyPrice
                  ? bestNearbyPrice.dispensary.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                  : null;
                const dispensaryDir = bestNearbyPrice
                  ? dispensaries.find(
                      (d) =>
                        d.name.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                        bestNearbyPrice.dispensary.toLowerCase().replace(/[^a-z0-9]/g, "")
                    )
                  : null;

                return (
                  <div
                    key={strain.id}
                    className="bg-card border border-border/40 rounded-xl p-4 hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {getCategoryFromStrain(strain)}
                        </span>
                        <Link
                          href={`/strain/${strain.id}`}
                          className="block font-medium text-foreground hover:text-primary transition-colors line-clamp-2 text-sm mt-0.5"
                        >
                          {strain.name}
                        </Link>
                        {strain.brand && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{strain.brand}</p>
                        )}
                      </div>
                      {bestNearbyPrice && (
                        <p className="font-price text-xl font-bold text-savings shrink-0">
                          ${bestNearbyPrice.price}
                        </p>
                      )}
                    </div>

                    {bestNearbyPrice && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30 flex-wrap">
                        {dispensarySlug && (
                          <Link
                            href={`/dispensary/${dispensarySlug}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{bestNearbyPrice.dispensary}</span>
                          </Link>
                        )}
                        {dispensaryDir?.website && (
                          <a
                            href={dispensaryDir.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            Website
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Dispensary Map */}
      <section className="border-b border-border/30">
        <div className="container py-6 sm:py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-lg sm:text-xl text-foreground">Dispensary Map</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {userLocation
                  ? `Showing dispensaries near ${zipInput}`
                  : "Enter your zip code above to find dispensaries near you"}
              </p>
            </div>
            <Link
              href="/map"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Full map <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <HomeMap
            dispensaries={dispensaries}
            userLocation={userLocation}
            className="w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden"
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            Click a marker to view that dispensary&apos;s menu and pricing.
          </p>
        </div>
      </section>

      {/* Lowest Price Dispensary Near Me */}
      <section className="border-b border-border/30">
        <div className="container py-6 sm:py-8">
          <h2 className="font-serif text-lg sm:text-xl text-foreground mb-4">
            Lowest Price Dispensary Near Me
          </h2>

          {cheapestNearbyDispensary ? (
            <div className="bg-card border border-savings/30 rounded-xl p-5 max-w-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/dispensary/${cheapestNearbyDispensary.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {cheapestNearbyDispensary.name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cheapestNearbyDispensary.city} ·{" "}
                    {cheapestNearbyDispensary.distance?.toFixed(1)} mi away
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {cheapestNearbyDispensary.full_address}
                  </p>
                </div>
                {cheapestNearbyDispensary.price_avg != null && (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">avg price</p>
                    <p className="font-price text-2xl font-bold text-savings">
                      ${cheapestNearbyDispensary.price_avg}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Link
                  href={`/dispensary/${cheapestNearbyDispensary.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Leaf className="w-3.5 h-3.5" />
                  View Menu
                </Link>
                {cheapestNearbyDispensary.website && (
                  <a
                    href={cheapestNearbyDispensary.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 border border-border text-xs text-muted-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Website
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cheapestNearbyDispensary.full_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 border border-border text-xs text-muted-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Directions
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/30 rounded-xl p-6 max-w-lg text-center">
              <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Enter your zip code above to find the cheapest dispensary near you.
              </p>
            </div>
          )}
        </div>
      </section>

      <DealDigestBanner
        totalStrains={displayStats.totalStrains}
        totalDispensaries={displayStats.totalDispensaries}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomePageInner />
    </Suspense>
  );
}
