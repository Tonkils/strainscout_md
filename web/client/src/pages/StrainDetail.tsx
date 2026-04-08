import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, MapPin, Beaker, Store, Loader2, ShieldCheck, Tag, ExternalLink, Dna, Sparkles, Cherry, BadgeCheck, ShoppingBag, ChevronDown } from "lucide-react";
import { getBuyLink, getProductCategory, CATEGORY_COLORS } from "@/lib/utils";
import PriceAlertSignup from "@/components/PriceAlertSignup";
import { VerificationBadge, StrainVerificationSummary } from "@/components/VerificationBadge";
import { PartnerVerifiedBadge, PartnerPriceBadge } from "@/components/PartnerVerifiedBadge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { StrainDetailSEO } from "@/components/SEO";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { trpc } from "@/lib/trpc";
import { trackPageViewed, trackStrainViewed, trackOutboundLinkClicked, trackDispensaryClicked } from "@/lib/analytics";

const STRAIN_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strain-detail-bg-MuBFq8w4dgZqkcQFoZjuYp.webp";

/** Get the best action link for a dispensary — prioritizes direct ordering links */
function getDispensaryLink(strain: CatalogStrain, dispensaryName: string, isBestPrice = false): {
  url: string; label: string; classes: string; icon: "order" | "visit" | "external";
} | null {
  // 1. Direct ordering link (Weedmaps menu, Dutchie, dispensary shop page)
  const orderUrl = (strain as any).ordering_links?.[dispensaryName];
  if (orderUrl) {
    const isWeedmaps = orderUrl.includes("weedmaps.com");
    const isDutchie = orderUrl.includes("dutchie.com");
    return {
      url: orderUrl,
      label: isBestPrice ? "Order — Best Price" : (isWeedmaps ? "Order on Weedmaps" : isDutchie ? "Order on Dutchie" : "Order Here"),
      classes: isBestPrice
        ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30 font-semibold"
        : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20",
      icon: "order",
    };
  }
  // 2. Dispensary website
  const website = strain.dispensary_links?.[dispensaryName];
  if (website) return {
    url: website,
    label: "Visit Store",
    classes: "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20",
    icon: "visit",
  };
  // 3. Leafly strain page
  if (strain.leafly_url) return {
    url: strain.leafly_url,
    label: "View on Leafly",
    classes: "bg-muted/50 border-border/30 text-muted-foreground hover:bg-muted",
    icon: "external",
  };
  return null;
}

export default function StrainDetail() {
  const params = useParams<{ id: string }>();
  const { catalog, loading } = useCatalog();

  const strain = useMemo(() => {
    if (!catalog) return null;
    return catalog.strains.find((s) => s.id === params.id) || null;
  }, [catalog, params.id]);

  // Partner data: verified dispensary slugs + partner-verified prices for this strain
  const { data: verifiedSlugs } = trpc.partners.verifiedSlugs.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes — verified partners change rarely
  });
  const { data: partnerPrices } = trpc.partners.verifiedPrices.useQuery(
    { strainId: params.id },
    { enabled: !!params.id }
  );
  const verifiedSlugSet = useMemo(() => new Set(verifiedSlugs ?? []), [verifiedSlugs]);

  // Similar strains — must be before early returns to maintain hooks order
  const similarStrains = useMemo(() => {
    if (!catalog || !strain) return [];
    return catalog.strains
      .filter((s) => s.id !== strain.id && s.price_min != null)
      .map((s) => ({
        ...s,
        similarity:
          (s.type === strain.type ? 30 : 0) +
          (s.terpenes || []).filter((t) => (strain.terpenes || []).includes(t)).length * 20 +
          (s.brand === strain.brand ? 15 : 0),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);
  }, [catalog, strain]);

  // Analytics: track page view + strain view
  useEffect(() => {
    trackPageViewed("strain_detail", params.id);
  }, [params.id]);
  useEffect(() => {
    if (strain) {
      trackStrainViewed(strain.id, strain.name, strain.type, strain.thc ? String(strain.thc) + "%" : undefined);
    }
  }, [strain]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading strain data...</span>
        </div>
      </div>
    );
  }

  if (!strain) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">Strain Not Found</h1>
          <Link href="/compare" className="text-primary hover:underline">Browse all strains &rarr;</Link>
        </div>
      </div>
    );
  }

  const typeLabel = strain.type.charAt(0).toUpperCase() + strain.type.slice(1);
  const terpenes = strain.terpenes.filter((t) => t && t !== "Not_Found");
  const effects = strain.effects || [];
  const flavors = strain.flavors || [];

  const similar = (() => {
    if (!catalog) return [];
    return catalog.strains
      .filter((s) => s.id !== strain.id)
      .map((s) => ({
        ...s,
        similarity:
          (s.type === strain.type ? 30 : 0) +
          s.terpenes.filter((t) => strain.terpenes.includes(t)).length * 20 +
          (s.brand === strain.brand ? 15 : 0),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);
  })();

  const dispensaryDetails = catalog?.dispensaries || [];
  const dispLinks = strain.dispensary_links || {};
  const category = getProductCategory(strain.name);

  // Count dispensaries with direct website links
  const withWebsites = strain.dispensaries.filter(d => strain.dispensary_links?.[d]).length;

  return (
    <div className="min-h-screen bg-background">
      <StrainDetailSEO
        name={strain.name}
        brand={strain.brand}
        type={strain.type}
        thc={strain.thc ? `${strain.thc}%` : undefined}
        priceMin={strain.price_min ?? undefined}
        priceMax={strain.price_max ?? undefined}
        slug={params.id || strain.id}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 opacity-30">
          <img src={STRAIN_BG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        <div className="relative container py-5 sm:py-8">
          <Link href="/compare" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 sm:mb-4 transition-colors active:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to all strains
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  strain.type.toLowerCase() === "indica" ? "bg-indigo-500/15 text-indigo-400" :
                  strain.type.toLowerCase() === "sativa" ? "bg-amber-500/15 text-amber-400" :
                  "bg-emerald-500/15 text-emerald-400"
                }`}>{typeLabel}</span>
                {category !== "Flower" && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[category]}`}>
                    {category}
                  </span>
                )}
                {strain.brand && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                    <Tag className="w-3 h-3" />
                    {strain.brand}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  strain.grade === "A" ? "bg-primary/15 text-primary" :
                  strain.grade === "B" ? "bg-blue-500/15 text-blue-400" :
                  "bg-yellow-500/15 text-yellow-400"
                }`}>
                  Grade {strain.grade}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl text-foreground mb-2 sm:mb-3">{strain.name}</h1>

              {/* External Links Row */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {strain.leafly_url && (
                  <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    View on Leafly
                    {strain.leafly_verified && <span className="ml-1 text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded-full">Verified</span>}
                  </a>
                )}
                {strain.weedmaps_url && (
                  <a href={strain.weedmaps_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    Find on Weedmaps
                    {strain.weedmaps_verified && <span className="ml-1 text-[9px] bg-orange-500/20 px-1.5 py-0.5 rounded-full">Verified</span>}
                  </a>
                )}
                {(strain.dispensary_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                    <Store className="w-3 h-3" />
                    {strain.dispensary_count} dispensar{(strain.dispensary_count ?? 0) === 1 ? "y" : "ies"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              {strain.thc > 0 && (
                <div className="text-center">
                  <p className="font-price text-2xl sm:text-3xl font-bold text-foreground">{strain.thc}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">THC</p>
                </div>
              )}
              {strain.price_min != null && (
                <div className="text-center">
                  <p className="font-price text-2xl sm:text-3xl font-bold text-savings">${strain.price_min}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">From</p>
                </div>
              )}
              {strain.prices.length > 0 && (
                <div className="text-center">
                  <StrainVerificationSummary prices={strain.prices} />
                  <p className="text-[10px] text-muted-foreground uppercase mt-1">Price Status</p>
                </div>
              )}
              {/* Jump to Prices — mobile shortcut */}
              {strain.prices.length > 0 && (
                <a
                  href="#prices-section"
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-cta/10 border border-cta/20 hover:bg-cta/20 transition-colors group"
                >
                  <ChevronDown className="w-5 h-5 text-cta group-hover:translate-y-0.5 transition-transform" />
                  <span className="text-[10px] text-cta font-medium uppercase">See Prices</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Description */}
            {strain.description && strain.description.length > 10 && (
              <div className="bg-card border border-border/30 rounded-lg p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{strain.description}</p>
              </div>
            )}

            {/* Genetics */}
            {strain.genetics && strain.genetics.length > 3 && (
              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <Dna className="w-4 h-4 text-primary" />
                  <h2 className="font-serif text-xl text-foreground">Genetics / Lineage</h2>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-foreground">{strain.genetics}</p>
                </div>
              </div>
            )}

            {/* Effects & Flavors */}
            {(effects.length > 0 || flavors.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {effects.length > 0 && (
                  <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="font-serif text-lg text-foreground">Effects</h3>
                    </div>
                    <div className="p-5 flex flex-wrap gap-2">
                      {effects.map((e) => (
                        <span key={e} className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {flavors.length > 0 && (
                  <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                      <Cherry className="w-4 h-4 text-primary" />
                      <h3 className="font-serif text-lg text-foreground">Flavors</h3>
                    </div>
                    <div className="p-5 flex flex-wrap gap-2">
                      {flavors.map((fl) => (
                        <span key={fl} className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                          {fl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prices by Dispensary — with Buy Now links */}
            {strain.prices.length > 0 && (
              <div id="prices-section" className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl text-foreground">Prices by Dispensary</h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Per 1/8 oz (3.5g) unless noted</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{strain.prices.length} dispensar{strain.prices.length === 1 ? "y" : "ies"}</span>
                </div>
                <div className="divide-y divide-border/20">
                  {strain.prices.map((p, i) => {
                    const isBestPrice = i === 0;
                    const link = getDispensaryLink(strain, p.dispensary, isBestPrice);
                    const LinkIcon = link?.icon === "order" ? ShoppingBag : ExternalLink;
                    return (
                      <div key={`${p.dispensary}-${i}`} className={`px-4 sm:px-5 py-3 hover:bg-accent/10 transition-colors ${isBestPrice ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                        {/* Desktop: single row */}
                        <div className="hidden sm:flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isBestPrice ? "bg-savings/20 text-savings" : "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground truncate">{p.dispensary}</p>
                            <p className="text-[10px] text-muted-foreground">{p.source || "Flower"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-price text-lg font-bold block ${isBestPrice ? "text-savings" : "text-foreground"}`}>
                              ${p.price}
                            </span>
                            <span className="font-price text-[10px] text-muted-foreground">${(p.price / 3.5).toFixed(2)}/g</span>
                          </div>
                          <VerificationBadge
                            timestamp={p.last_verified}
                            dispensaryName={p.dispensary}
                            compact
                          />
                          {link && (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackOutboundLinkClicked(link.url, p.dispensary, "price_row")}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors border ${link.classes}`}
                            >
                              <LinkIcon className="w-3 h-3" />
                              {link.label}
                            </a>
                          )}
                        </div>
                        {/* Mobile: stacked card */}
                        <div className="sm:hidden">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                isBestPrice ? "bg-savings/20 text-savings" : "bg-muted text-muted-foreground"
                              }`}>{i + 1}</span>
                              <p className="text-sm text-foreground truncate">{p.dispensary}</p>
                            </div>
                            <span className={`font-price text-lg font-bold shrink-0 ${isBestPrice ? "text-savings" : "text-foreground"}`}>
                              ${p.price}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-7">
                            <VerificationBadge
                              timestamp={p.last_verified}
                              dispensaryName={p.dispensary}
                              compact
                            />
                            {link && (
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackOutboundLinkClicked(link.url, p.dispensary, "price_row_mobile")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border active:scale-95 ${link.classes}`}
                              >
                                <LinkIcon className="w-3 h-3" />
                                {link.label}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dispensary Availability — with ordering links */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  <h2 className="font-serif text-xl text-foreground">Available At</h2>
                </div>
                <div className="flex items-center gap-2">
                  {withWebsites > 0 && (
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {withWebsites} with websites
                    </span>
                  )}
                  <Link
                    href={`/map?strain=${strain.id}&locate=true`}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-cta bg-cta/10 px-2 py-0.5 rounded-full hover:bg-cta/20 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    Find Nearest
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-border/20">
                {strain.dispensaries.map((dName) => {
                  const dInfo = dispensaryDetails.find((d) => d.name === dName);
                  const dPrices = strain.prices.filter((p) => p.dispensary === dName);
                  const lowestPrice = dPrices.length > 0 ? Math.min(...dPrices.map((p) => p.price)) : null;
                  const dUrl = dispLinks[dName] || (dInfo?.website) || "";

                  return (
                    <div key={dName} className="px-4 sm:px-5 py-3 hover:bg-accent/10 transition-colors">
                      {/* Desktop: single row */}
                      <div className="hidden sm:flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/dispensary/${dName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} className="text-sm text-foreground hover:text-primary transition-colors truncate block">{dName}</Link>
                          {dInfo?.city && (
                            <p className="text-[10px] text-muted-foreground">{dInfo.city}</p>
                          )}
                        </div>
                        {lowestPrice != null && (
                          <span className="font-price text-sm font-bold text-foreground shrink-0">${lowestPrice}</span>
                        )}
                        {verifiedSlugSet.has(dName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) && (
                          <PartnerVerifiedBadge compact />
                        )}
                        {dPrices[0]?.last_verified && (
                          <VerificationBadge
                            timestamp={dPrices[0].last_verified}
                            dispensaryName={dName}
                            compact
                          />
                        )}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {dUrl && (
                            <a href={dUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                              Website
                            </a>
                          )}
                          {strain.leafly_url && (
                            <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                              Leafly
                            </a>
                          )}
                          {strain.weedmaps_url && (
                            <a href={strain.weedmaps_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 transition-colors">
                              Weedmaps
                            </a>
                          )}
                        </div>
                      </div>
                      {/* Mobile: stacked card */}
                      <div className="sm:hidden">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <Link href={`/dispensary/${dName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} className="text-sm text-foreground hover:text-primary transition-colors truncate">{dName}</Link>
                            {verifiedSlugSet.has(dName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) && (
                              <PartnerVerifiedBadge compact />
                            )}
                          </div>
                          {lowestPrice != null && (
                            <span className="font-price text-sm font-bold text-foreground shrink-0">${lowestPrice}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 ml-5.5 flex-wrap">
                          {dPrices[0]?.last_verified && (
                            <VerificationBadge
                              timestamp={dPrices[0].last_verified}
                              dispensaryName={dName}
                              compact
                            />
                          )}
                          {dUrl && (
                            <a href={dUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 active:bg-blue-500/20 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                              Website
                            </a>
                          )}
                          {strain.leafly_url && (
                            <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 active:bg-emerald-500/20 transition-colors">
                              Leafly
                            </a>
                          )}
                          {strain.weedmaps_url && (
                            <a href={strain.weedmaps_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-orange-500/10 border border-orange-500/25 text-orange-400 active:bg-orange-500/20 transition-colors">
                              Weedmaps
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {strain.dispensaries.length === 0 && (
                  <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No dispensary data available for this strain.
                  </div>
                )}
              </div>
            </div>

            {/* Partner Verified Prices */}
            {partnerPrices && partnerPrices.length > 0 && (
              <div className="bg-card border border-primary/20 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-primary/20 bg-primary/5 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                  <h3 className="font-serif text-lg text-foreground">Partner Verified Prices</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">Submitted by dispensary partners</span>
                </div>
                <div className="p-4 space-y-2">
                  {partnerPrices.map((pp, i) => (
                    <PartnerPriceBadge
                      key={i}
                      price={pp.price}
                      unit={pp.unit}
                      dispensaryName={pp.dispensaryName}
                      submittedAt={pp.submittedAt}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Price Alert Signup — High-intent capture point */}
            <PriceAlertSignup
              strainId={strain.id}
              strainName={strain.name}
              currentLowest={strain.price_min}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Terpene Profile */}
            {terpenes.length > 0 && (
              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-primary" />
                  <h3 className="font-serif text-lg text-foreground">Terpene Profile</h3>
                </div>
                <div className="p-5 flex flex-wrap gap-2">
                  {terpenes.map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-full bg-accent border border-border/30 text-sm text-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-card border border-border/30 rounded-lg p-5 space-y-3">
              {strain.price_avg != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Price</span>
                  <span className="font-price font-bold text-foreground">${strain.price_avg}</span>
                </div>
              )}
              {strain.price_min != null && strain.price_max != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price Range</span>
                  <span className="font-price text-foreground">${strain.price_min} &ndash; ${strain.price_max}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dispensaries</span>
                <span className="text-foreground">{strain.dispensary_count ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">With Websites</span>
                <span className="text-blue-400">{withWebsites} available</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brand</span>
                <span className="text-foreground">{strain.brand || "Unknown"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data Confidence</span>
                <span className={`font-bold ${
                  strain.grade === "A" ? "text-primary" :
                  strain.grade === "B" ? "text-blue-400" :
                  "text-yellow-400"
                }`}>Grade {strain.grade}</span>
              </div>
              {strain.price_min != null && strain.price_max != null && (
                <div className="h-1.5 rounded-full price-bar opacity-60 mt-2" />
              )}
            </div>

            {/* Cross-Reference Links */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-primary" />
                <h3 className="font-serif text-lg text-foreground">Cross-Reference</h3>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground mb-3">Verify this strain's data on external sources:</p>
                {strain.leafly_url && (
                  <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">L</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-emerald-400 transition-colors">Leafly</p>
                      <p className="text-[10px] text-muted-foreground truncate">Reviews, photos, lab data</p>
                    </div>
                    {strain.leafly_verified ? <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full shrink-0">Verified</span> : <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />}
                  </a>
                )}
                {strain.weedmaps_url && (
                  <a href={strain.weedmaps_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-500/5 border border-orange-500/15 hover:bg-orange-500/10 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">W</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-orange-400 transition-colors">Weedmaps</p>
                      <p className="text-[10px] text-muted-foreground truncate">Nearby menus, deals, ordering</p>
                    </div>
                    {strain.weedmaps_verified ? <span className="ml-auto text-[9px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full shrink-0">Verified</span> : <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />}
                  </a>
                )}
                {Object.keys(dispLinks).length > 0 && (
                  <div className="pt-2 border-t border-border/20">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Dispensary Websites</p>
                    <div className="space-y-1.5">
                      {Object.entries(dispLinks).slice(0, 5).map(([name, url]) => (
                        <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Store className="w-3 h-3 shrink-0" />
                          <span className="truncate">{name}</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-auto shrink-0" />
                        </a>
                      ))}
                      {Object.keys(dispLinks).length > 5 && (
                        <p className="text-[10px] text-muted-foreground">+{Object.keys(dispLinks).length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Data Quality Badge */}
            <div className="bg-card border border-border/30 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className={`w-5 h-5 shrink-0 ${
                  strain.grade === "A" ? "text-primary" :
                  strain.grade === "B" ? "text-blue-400" :
                  "text-yellow-400"
                }`} />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Data Quality: Grade {strain.grade}</p>
                  <p className="text-xs text-muted-foreground">
                    {strain.grade === "A"
                      ? "Highest confidence. Verified brand, terpenes, THC, and pricing from multiple sources."
                      : strain.grade === "B"
                      ? "High confidence. Verified brand and pricing. Some terpene or THC data may be estimated."
                      : "Limited data. Brand or pricing information may be incomplete. Use as reference only."}
                  </p>
                </div>
              </div>
            </div>

            {/* Similar Strains */}
            <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30">
                <h3 className="font-serif text-lg text-foreground">Similar Strains</h3>
              </div>
              <div className="divide-y divide-border/20">
                {similar.map((s) => (
                  <Link key={s.id} href={`/strain/${s.id}`}>
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-accent/20 transition-colors">
                      <div>
                        <p className="text-sm text-foreground">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.type} &middot; {s.brand || "Unknown"}
                        </p>
                      </div>
                      <span className="font-price text-sm font-bold text-foreground">
                        {s.price_min != null ? `$${s.price_min}` : "\u2014"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Strains — keeps users engaged and exploring */}
      {similarStrains.length > 0 && (
        <section className="container py-8 border-t border-border/30">
          <h2 className="font-serif text-xl text-foreground mb-4">Similar Strains</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {similarStrains.map((s) => {
              const bestPrice = s.prices?.[0];
              const sBuyLink = bestPrice ? getBuyLink(s, bestPrice.dispensary) : null;
              return (
                <div
                  key={s.id}
                  onClick={() => window.location.href = `/strain/${s.id}`}
                  className="bg-card border border-border/30 rounded-lg p-3 hover:border-primary/30 transition-all group cursor-pointer h-full flex flex-col"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      s.type?.toLowerCase() === "indica" ? "bg-indigo-500/15 text-indigo-400" :
                      s.type?.toLowerCase() === "sativa" ? "bg-amber-500/15 text-amber-400" :
                      "bg-emerald-500/15 text-emerald-400"
                    }`}>{s.type}</span>
                  </div>
                  <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">{s.name}</h3>
                  {s.brand && <p className="text-[9px] text-muted-foreground truncate mb-2">{s.brand}</p>}
                  <div className="mt-auto flex items-center justify-between">
                    {s.price_min != null ? (
                      <span className="font-price text-sm font-bold text-savings">${s.price_min}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                    {sBuyLink && (
                      <a
                        href={sBuyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-semibold hover:bg-primary/25 transition-colors"
                      >
                        Buy
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Footer />

      {/* Sticky mobile "Best Price" bar — shows cheapest dispensary with direct order link */}
      {strain.prices.length > 0 && (() => {
        const best = strain.prices[0];
        const bestLink = getDispensaryLink(strain, best.dispensary, true);
        if (!bestLink) return null;
        return (
          <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden">
            <div className="bg-background/95 backdrop-blur-lg border-t border-border/50 px-4 py-3 safe-area-bottom">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">Best price at {best.dispensary}</p>
                  <p className="text-lg font-bold text-savings">${best.price}<span className="text-xs font-normal text-muted-foreground ml-1">/ 8th</span></p>
                </div>
                <a
                  href={bestLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackOutboundLinkClicked(bestLink.url, best.dispensary, "sticky_bar")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg hover:bg-primary/90 active:scale-95 transition-all shrink-0"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Order Now
                </a>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
