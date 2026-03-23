/*
 * StrainScout MD — Individual Dispensary Page
 * Shows dispensary details, available strains, price range, and map.
 * Internal links to strain pages for SEO cross-linking.
 */

import { useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  MapPin, Star, Leaf, Phone, Globe, ArrowLeft,
  Loader2, ExternalLink, Navigation, DollarSign, BadgeCheck
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import DealCard from "@/components/DealCard";
import { PartnerVerifiedBadge } from "@/components/PartnerVerifiedBadge";
import { useDispensaryDirectory, type DirectoryDispensary } from "@/hooks/useDispensaryDirectory";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { trpc } from "@/lib/trpc";
import { trackPageViewed, trackDispensaryClicked } from "@/lib/analytics";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function DispensaryDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { dispensaries, loading: dirLoading } = useDispensaryDirectory();
  const { catalog, loading: catLoading } = useCatalog();

  // Find dispensary by slug
  const dispensary = useMemo(() => {
    return dispensaries.find((d) => slugify(d.name) === slug) || null;
  }, [dispensaries, slug]);

  // Find strains available at this dispensary
  const strains = useMemo(() => {
    if (!catalog || !dispensary) return [];
    return catalog.strains
      .filter(
        (s) =>
          s.dispensaries.some(
            (d) => d.toLowerCase() === dispensary.name.toLowerCase()
          ) ||
          s.prices.some(
            (p) => p.dispensary.toLowerCase() === dispensary.name.toLowerCase()
          )
      )
      .sort((a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999));
  }, [catalog, dispensary]);

  // Price stats from strains at this dispensary — MUST be before any early return
  const priceStats = useMemo(() => {
    if (!dispensary) return null;
    const prices = strains
      .flatMap((s) =>
        s.prices
          .filter((p) => p.dispensary.toLowerCase() === dispensary.name.toLowerCase())
          .map((p) => p.price)
      )
      .filter((p) => p > 0);

    if (prices.length === 0) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
      count: prices.length,
    };
  }, [strains, dispensary]);

  // Type distribution — MUST be before any early return
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of strains) {
      counts[s.type] = (counts[s.type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [strains]);

  // Partner verification status for this dispensary
  const { data: partnerInfo } = trpc.partners.bySlug.useQuery(
    { dispensarySlug: slug },
    { enabled: !!slug }
  );

  // Track page view
  useEffect(() => {
    if (dispensary) {
      trackPageViewed("dispensary_detail", dispensary.name);
    }
  }, [dispensary]);

  const loading = dirLoading || catLoading;
  const rating = parseFloat(dispensary?.google_rating || "0");

  // --- Early returns AFTER all hooks ---

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading dispensary...</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (!dispensary) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="font-serif text-2xl text-foreground mb-4">Dispensary Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find a dispensary matching "{slug}".
          </p>
          <Link href="/dispensaries" className="text-primary hover:underline">
            Browse all dispensaries
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: dispensary.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: dispensary.address,
      addressLocality: dispensary.city,
      addressRegion: "MD",
    },
    telephone: dispensary.phone || undefined,
    url: dispensary.website || undefined,
    aggregateRating: rating > 0 ? {
      "@type": "AggregateRating",
      ratingValue: dispensary.google_rating,
      bestRating: "5",
    } : undefined,
    geo: dispensary.lat ? {
      "@type": "GeoCoordinates",
      latitude: dispensary.lat,
      longitude: dispensary.lng,
    } : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${dispensary.name} — Strains, Prices & Info | StrainScout MD`}
        description={`${dispensary.name} in ${dispensary.city}, MD carries ${strains.length} strains${priceStats ? ` starting at $${priceStats.min}` : ""}. Compare prices, view menu, and get directions.`}
        path={`/dispensary/${slug}`}
        type="website"
        jsonLd={jsonLd}
      />
      <Navbar />

      {/* Breadcrumb + Back */}
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
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">
                  {dispensary.name}
                </h1>
                {partnerInfo && (
                  <PartnerVerifiedBadge tooltip={`Verified partner since ${partnerInfo.verifiedAt ? new Date(partnerInfo.verifiedAt).toLocaleDateString() : "recently"}`} />
                )}
              </div>
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

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {dispensary.website && (
                  <a
                    href={dispensary.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDispensaryClicked(dispensary.name, "website")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors shadow-cta"
                  >
                    <Globe className="w-4 h-4" />
                    Visit Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {dispensary.phone && (
                  <a
                    href={`tel:${dispensary.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border/50 text-foreground text-sm hover:border-primary/40 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {dispensary.phone}
                  </a>
                )}
                {dispensary.lat && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${dispensary.lat},${dispensary.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border/50 text-foreground text-sm hover:border-primary/40 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </a>
                )}
              </div>
            </div>

            {/* Stats cards */}
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
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-muted-foreground">Lowest</span>
                    </div>
                    <p className="font-price text-2xl font-bold text-emerald-400">${priceStats.min}</p>
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

      {/* Strains at this dispensary */}
      <section className="container py-8 sm:py-12">
        <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-6">
          Available Strains ({strains.length})
        </h2>

        {strains.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {strains.map((strain) => (
              <DealCard key={strain.id} strain={strain} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No strain data available for this dispensary yet.
            </p>
          </div>
        )}
      </section>

      {/* Internal links to nearby dispensaries */}
      <NearbyDispensaries current={dispensary} all={dispensaries} />

      <Footer />
    </div>
  );
}

function NearbyDispensaries({
  current,
  all,
}: {
  current: DirectoryDispensary;
  all: DirectoryDispensary[];
}) {
  const nearby = useMemo(() => {
    if (!current.lat) return [];
    return all
      .filter((d) => d.id !== current.id && d.lat)
      .map((d) => {
        const R = 3959;
        const dLat = ((d.lat - current.lat) * Math.PI) / 180;
        const dLng = ((d.lng - current.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((current.lat * Math.PI) / 180) *
            Math.cos((d.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...d, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [current, all]);

  if (nearby.length === 0) return null;

  return (
    <section className="border-t border-border/30 bg-card/20">
      <div className="container py-8 sm:py-12">
        <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-6">
          Nearby Dispensaries
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nearby.map((d) => (
            <Link key={d.id} href={`/dispensary/${slugify(d.name)}`}>
              <div className="group bg-card border border-border/30 rounded-lg p-4 hover:border-primary/40 transition-all cursor-pointer">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  {d.name}
                </h3>
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
