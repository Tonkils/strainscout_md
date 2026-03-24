"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { trackStrainViewed } from "@/lib/analytics";
import {
  ArrowLeft, MapPin, Beaker, Store, Loader2, ShieldCheck,
  Tag, ExternalLink, Dna, Sparkles, Cherry, ChevronDown, Bell,
} from "lucide-react";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { VerificationBadge, StrainVerificationSummary } from "@/components/VerificationBadge";

function getDispensaryLink(
  strain: CatalogStrain,
  dispensaryName: string
): { url: string; label: string; classes: string } | null {
  const website = strain.dispensary_links?.[dispensaryName];
  if (website) return { url: website, label: "Visit Website", classes: "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20" };
  if (strain.leafly_url) return { url: strain.leafly_url, label: "View on Leafly", classes: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20" };
  if (strain.weedmaps_url) return { url: strain.weedmaps_url, label: "Find on Weedmaps", classes: "bg-orange-500/10 border-orange-500/25 text-orange-400 hover:bg-orange-500/20" };
  return null;
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function StrainDetailClient({ id }: { id: string }) {
  const { catalog, loading } = useCatalog();
  const [alertEmail, setAlertEmail] = useState("");
  const [alertSubmitted, setAlertSubmitted] = useState(false);

  const strain = useMemo(() => {
    if (!catalog) return null;
    return catalog.strains.find((s) => s.id === id) ?? null;
  }, [catalog, id]);

  // Analytics: track strain view
  useEffect(() => {
    if (strain) trackStrainViewed(strain.id, strain.name, strain.type, strain.thc ? `${strain.thc}%` : undefined);
  }, [strain]);

  const similar = useMemo(() => {
    if (!catalog || !strain) return [];
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
  }, [catalog, strain]);

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center py-32">
        <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Loading strain data...</span>
      </div>
    );
  }

  if (!strain) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-serif text-3xl text-foreground mb-4">Strain Not Found</h1>
        <Link href="/compare" className="text-primary hover:underline">Browse all strains &rarr;</Link>
      </div>
    );
  }

  const typeLabel = strain.type.charAt(0).toUpperCase() + strain.type.slice(1);
  const terpenes = strain.terpenes.filter((t) => t && t !== "Not_Found");
  const effects = strain.effects || [];
  const flavors = strain.flavors || [];
  const dispLinks = strain.dispensary_links || {};
  const withWebsites = strain.dispensaries.filter((d) => strain.dispensary_links?.[d]).length;
  const dispensaryDetails = catalog?.dispensaries || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30 bg-card/30">
        <div className="relative container py-5 sm:py-8">
          <Link
            href="/compare"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 sm:mb-4 transition-colors"
          >
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
              <a
                href="#prices-section"
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors group"
              >
                <ChevronDown className="w-5 h-5 text-primary" />
                <span className="text-[10px] text-primary font-medium uppercase">See Prices</span>
              </a>
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
                        <span key={e} className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">{e}</span>
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
                        <span key={fl} className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">{fl}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prices by Dispensary */}
            {strain.prices.length > 0 && (
              <div id="prices-section" className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl text-foreground">Prices by Dispensary</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Per 1/8 oz (3.5g) unless noted</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{strain.prices.length} dispensar{strain.prices.length === 1 ? "y" : "ies"}</span>
                </div>
                <div className="divide-y divide-border/20">
                  {strain.prices.map((p, i) => {
                    const link = getDispensaryLink(strain, p.dispensary);
                    return (
                      <div key={`${p.dispensary}-${i}`} className="px-4 sm:px-5 py-3 hover:bg-accent/10 transition-colors">
                        {/* Desktop */}
                        <div className="hidden sm:flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            i === 0 ? "bg-savings/20 text-savings" : "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground truncate">{p.dispensary}</p>
                            <p className="text-[10px] text-muted-foreground">{p.source || "Flower"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-price text-lg font-bold block ${i === 0 ? "text-savings" : "text-foreground"}`}>
                              ${p.price}
                            </span>
                            <span className="text-[10px] text-muted-foreground">${(p.price / 3.5).toFixed(2)}/g</span>
                          </div>
                          <VerificationBadge timestamp={p.last_verified} dispensaryName={p.dispensary} compact />
                          {link && (
                            <a href={link.url} target="_blank" rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors border ${link.classes}`}>
                              <ExternalLink className="w-3 h-3" />
                              {link.label}
                            </a>
                          )}
                        </div>
                        {/* Mobile */}
                        <div className="sm:hidden">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                i === 0 ? "bg-savings/20 text-savings" : "bg-muted text-muted-foreground"
                              }`}>{i + 1}</span>
                              <p className="text-sm text-foreground truncate">{p.dispensary}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`font-price text-lg font-bold block ${i === 0 ? "text-savings" : "text-foreground"}`}>
                                ${p.price}
                              </span>
                              <span className="text-[10px] text-muted-foreground">${(p.price / 3.5).toFixed(2)}/g</span>
                            </div>
                          </div>
                          {link && (
                            <div className="flex items-center gap-2 ml-7">
                              <a href={link.url} target="_blank" rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${link.classes}`}>
                                <ExternalLink className="w-3 h-3" />
                                {link.label}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dispensary Availability */}
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
                </div>
              </div>
              <div className="divide-y divide-border/20">
                {strain.dispensaries.map((dName) => {
                  const dInfo = dispensaryDetails.find((d) => d.name === dName);
                  const dPrices = strain.prices.filter((p) => p.dispensary === dName);
                  const lowestPrice = dPrices.length > 0 ? Math.min(...dPrices.map((p) => p.price)) : null;
                  const dUrl = dispLinks[dName] || (dInfo as { website?: string })?.website || "";

                  return (
                    <div key={dName} className="px-4 sm:px-5 py-3 hover:bg-accent/10 transition-colors">
                      {/* Desktop */}
                      <div className="hidden sm:flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/dispensary/${toSlug(dName)}`} className="text-sm text-foreground hover:text-primary transition-colors truncate block">{dName}</Link>
                          {dInfo && (dInfo as { city?: string }).city && (
                            <p className="text-[10px] text-muted-foreground">{(dInfo as { city: string }).city}</p>
                          )}
                        </div>
                        {lowestPrice != null && (
                          <span className="font-price text-sm font-bold text-foreground shrink-0">${lowestPrice}</span>
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
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="sm:hidden">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <Link href={`/dispensary/${toSlug(dName)}`} className="text-sm text-foreground hover:text-primary transition-colors truncate">{dName}</Link>
                          </div>
                          {lowestPrice != null && (
                            <span className="font-price text-sm font-bold text-foreground shrink-0">${lowestPrice}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 ml-5 flex-wrap">
                          {dUrl && (
                            <a href={dUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                              Website
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

            {/* Price Alert Signup */}
            <div id="alert-signup" className="bg-card border border-cta/20 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-cta" />
                <h3 className="font-serif text-lg text-foreground">Get Price Alerts</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Be notified when <span className="text-foreground font-medium">{strain.name}</span> drops in price.
                {strain.price_min && <> Currently from <span className="font-price text-savings">${strain.price_min}</span>.</>}
              </p>
              {alertSubmitted ? (
                <p className="text-sm text-savings font-medium">You&apos;re on the list! We&apos;ll email you when prices drop.</p>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); if (alertEmail) setAlertSubmitted(true); }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    required
                    className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-cta/50"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cta text-cta-foreground rounded-lg text-sm font-semibold hover:bg-cta-hover transition-colors shadow-cta"
                  >
                    Alert Me
                  </button>
                </form>
              )}
            </div>
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
                    <span key={t} className="px-3 py-1.5 rounded-full bg-accent border border-border/30 text-sm text-foreground">{t}</span>
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
                  <span className="font-price text-foreground">${strain.price_min}&ndash;${strain.price_max}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dispensaries</span>
                <span className="text-foreground">{strain.dispensary_count ?? 0}</span>
              </div>
              {withWebsites > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">With Websites</span>
                  <span className="text-blue-400">{withWebsites} available</span>
                </div>
              )}
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
            {(strain.leafly_url || strain.weedmaps_url || Object.keys(dispLinks).length > 0) && (
              <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <h3 className="font-serif text-lg text-foreground">Cross-Reference</h3>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-xs text-muted-foreground mb-3">Verify this strain&apos;s data on external sources:</p>
                  {strain.leafly_url && (
                    <a href={strain.leafly_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">L</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-emerald-400 transition-colors">Leafly</p>
                        <p className="text-[10px] text-muted-foreground truncate">Reviews, photos, lab data</p>
                      </div>
                      {strain.leafly_verified
                        ? <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full shrink-0">Verified</span>
                        : <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />}
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
                      {strain.weedmaps_verified
                        ? <span className="ml-auto text-[9px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full shrink-0">Verified</span>
                        : <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />}
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
            )}

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
            {similar.length > 0 && (
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
                          <p className="text-[10px] text-muted-foreground">{s.type} &middot; {s.brand || "Unknown"}</p>
                        </div>
                        <span className="font-price text-sm font-bold text-foreground">
                          {s.price_min != null ? `$${s.price_min}` : "—"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
