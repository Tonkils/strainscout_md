"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { MapPin, Loader2, Leaf, Cigarette, Wind, Beaker, Cookie, Globe, Navigation } from "lucide-react";
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

const INK = "#1A1A2E";
const CREAM = "#FFF8EE";
const MINT = "#7ECEB0";
const CORAL = "#FF6B57";
const BUTTER = "#FFD66B";
const SKY = "#6BC5E8";
const LAVENDER = "#B8A9E8";
const LEAF = "#8BC34A";
const GREEN = "#4EC96B";

const CAT_HOVER_COLORS: Record<string, string> = {
  Flower: MINT,
  "Pre-Roll": LAVENDER,
  Vape: BUTTER,
  Concentrate: SKY,
  Edible: "#FFB3B0",
};

const BROWSE_CATEGORIES: { cat: ProductCategory; icon: React.ReactNode; emoji: string }[] = [
  { cat: "Flower",      icon: <Leaf style={{ width: 20, height: 20 }} />,      emoji: "🌿" },
  { cat: "Pre-Roll",    icon: <Cigarette style={{ width: 20, height: 20 }} />, emoji: "🚬" },
  { cat: "Vape",        icon: <Wind style={{ width: 20, height: 20 }} />,       emoji: "💨" },
  { cat: "Concentrate", icon: <Beaker style={{ width: 20, height: 20 }} />,    emoji: "🧪" },
  { cat: "Edible",      icon: <Cookie style={{ width: 20, height: 20 }} />,    emoji: "🍬" },
];

const FALLBACK_STATS = {
  totalStrains: 844,
  totalDispensaries: 66,
  lastUpdated: "April 2026",
};

function SectionHead({ title, tag, href, hrefLabel }: { title: string; tag?: string; href?: string; hrefLabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
      <h2 style={{
        fontFamily: "var(--font-heading), Georgia, serif",
        fontSize: "20px",
        fontWeight: 800,
        color: INK,
        whiteSpace: "nowrap",
        letterSpacing: "-0.3px",
      }}>{title}</h2>
      <div style={{ flex: 1, height: "3px", background: INK, borderRadius: "2px" }} />
      {tag && (
        <span style={{
          fontSize: "12px", fontWeight: 700, padding: "3px 12px",
          border: `2px solid ${INK}`, borderRadius: "999px", background: MINT,
          color: INK, whiteSpace: "nowrap",
        }}>{tag}</span>
      )}
      {href && (
        <Link href={href} style={{
          fontSize: "12px", fontWeight: 700, color: INK, textDecoration: "none",
          padding: "3px 12px", border: `2px solid ${INK}`, borderRadius: "999px",
          whiteSpace: "nowrap",
        }}>{hrefLabel ?? "See all →"}</Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const [ageVerified, setAgeVerified] = useState(false);
  const [zipInput, setZipInput] = useState("");
  const [zipLocating, setZipLocating] = useState(false);
  const [zipError, setZipError] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [catHover, setCatHover] = useState<string | null>(null);

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

  const nearbyDispensaries = useMemo(() => {
    if (!userLocation || dispensaries.length === 0) return [];
    return dispensaries
      .map((d) => ({
        ...d,
        distance: haversineDistance(userLocation.lat, userLocation.lng, d.lat, d.lng),
      }))
      .filter((d) => d.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
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
        setUserLocation({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      } else {
        setZipError("Zip code not found in Maryland");
      }
    });
  }, [zipInput]);

  return (
    <div style={{ minHeight: "100vh", background: CREAM }}>
      <AgeGate onVerified={() => setAgeVerified(true)} />
      <EmailPopup show={ageVerified} delayMs={2000} />

      {/* Ticker */}
      <div style={{ background: INK, color: CREAM, fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", padding: "6px 0", overflow: "hidden", whiteSpace: "nowrap", borderBottom: `3px solid ${INK}` }}>
        <div className="animate-marquee" style={{ display: "inline-block" }}>
          {[
            `PRICES UPDATED ${displayStats.lastUpdated.toUpperCase()}`,
            `${displayStats.totalDispensaries} DISPENSARIES TRACKED`,
            `${displayStats.totalStrains.toLocaleString()} STRAINS TRACKED`,
            "ENTER YOUR ZIP TO FIND CHEAP WEED NEAR YOU",
            "WEEKLY PRICE UPDATES EVERY TUESDAY",
            `PRICES UPDATED ${displayStats.lastUpdated.toUpperCase()}`,
            `${displayStats.totalDispensaries} DISPENSARIES TRACKED`,
            `${displayStats.totalStrains.toLocaleString()} STRAINS TRACKED`,
            "ENTER YOUR ZIP TO FIND CHEAP WEED NEAR YOU",
            "WEEKLY PRICE UPDATES EVERY TUESDAY",
          ].map((text, i) => (
            <span key={i} style={{ marginRight: "48px" }}>
              {text} <span style={{ color: CORAL }}>•</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section style={{ padding: "50px 0 36px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Floating zigzag doodles */}
        <svg style={{ position: "absolute", top: "20px", left: "8%", opacity: 0.5, pointerEvents: "none", animation: "none" }} width="80" height="28" viewBox="0 0 80 28">
          <polyline points="0,14 10,4 20,24 30,4 40,24 50,4 60,24 70,4 80,14" fill="none" stroke={MINT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <svg style={{ position: "absolute", top: "60px", right: "6%", opacity: 0.5, pointerEvents: "none" }} width="60" height="22" viewBox="0 0 60 22">
          <polyline points="0,11 8,3 16,19 24,3 32,19 40,3 48,19 52,11 60,11" fill="none" stroke={LAVENDER} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <svg style={{ position: "absolute", bottom: "30px", left: "25%", opacity: 0.5, pointerEvents: "none" }} width="70" height="24" viewBox="0 0 70 24">
          <polyline points="0,12 9,3 18,21 27,3 36,21 45,3 54,21 63,3 70,12" fill="none" stroke={BUTTER} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          {/* Updated badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, padding: "5px 16px", border: `2.5px solid ${INK}`, borderRadius: "999px", background: MINT, color: INK, marginBottom: "20px" }}>
            ⏰ Updated {displayStats.lastUpdated}
          </div>

          <h1 style={{
            fontFamily: "var(--font-heading), Georgia, serif",
            fontSize: "clamp(32px, 5.5vw, 56px)",
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: "-2px",
            color: INK,
            marginBottom: "14px",
          }}>
            Find the{" "}
            <span style={{ position: "relative", display: "inline-block" }}>
              Cheapest Cannabis
              <span style={{
                content: "''",
                position: "absolute",
                bottom: "4px", left: "-4px", right: "-4px",
                height: "14px",
                background: BUTTER,
                border: `2px solid ${INK}`,
                borderRadius: "4px",
                zIndex: -1,
                transform: "rotate(-1deg)",
                display: "block",
              }} />
            </span>
            <br />Near You
          </h1>

          <p style={{ fontSize: "16px", fontWeight: 500, color: INK, opacity: 0.55, marginBottom: "26px" }}>
            Compare prices across{" "}
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: CORAL, opacity: 1 }}>
              {displayStats.totalDispensaries}
            </span>{" "}
            Maryland dispensaries.{" "}
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: CORAL, opacity: 1 }}>
              {displayStats.totalStrains.toLocaleString()}
            </span>{" "}
            strains tracked.
          </p>

          {/* Zip code input */}
          <div style={{ display: "flex", justifyContent: "center", maxWidth: "540px", margin: "0 auto", position: "relative" }}>
            <span style={{ position: "absolute", left: "18px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", opacity: 0.35, zIndex: 2, pointerEvents: "none" }}>📍</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter your zip code..."
              value={zipInput}
              maxLength={5}
              onChange={(e) => { setZipInput(e.target.value.replace(/\D/g, "")); setZipError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleFindNearMe()}
              style={{
                fontFamily: "var(--font-body), system-ui, sans-serif",
                fontSize: "16px",
                fontWeight: 600,
                padding: "14px 20px 14px 44px",
                border: `3px solid ${INK}`,
                borderRight: "none",
                borderRadius: "14px 0 0 14px",
                background: "#fff",
                color: INK,
                flex: 1,
                outline: "none",
              }}
            />
            <button
              onClick={handleFindNearMe}
              disabled={zipLocating}
              style={{
                fontFamily: "var(--font-body), system-ui, sans-serif",
                fontSize: "15px",
                fontWeight: 800,
                padding: "14px 28px",
                background: CORAL,
                color: CREAM,
                border: `3px solid ${INK}`,
                borderRadius: "0 14px 14px 0",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                cursor: zipLocating ? "not-allowed" : "pointer",
                opacity: zipLocating ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.1s",
              }}
            >
              {zipLocating ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : "Find Deals"}
            </button>
          </div>
          {zipError && (
            <p style={{ fontSize: "12px", color: CORAL, fontWeight: 700, marginTop: "8px" }}>{zipError}</p>
          )}
        </div>
      </section>

      {/* Categories */}
      <div className="container" style={{ paddingBottom: "24px" }}>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          {BROWSE_CATEGORIES.map(({ cat, emoji }) => (
            <Link
              key={cat}
              href={`/category/${cat.toLowerCase()}`}
              onMouseEnter={() => setCatHover(cat)}
              onMouseLeave={() => setCatHover(null)}
              style={{
                fontSize: "13px",
                fontWeight: 700,
                padding: "9px 20px",
                border: `3px solid ${INK}`,
                borderRadius: "999px",
                background: catHover === cat ? (CAT_HOVER_COLORS[cat] ?? BUTTER) : "#fff",
                color: INK,
                textDecoration: "none",
                transform: catHover === cat ? "translateY(-3px)" : "none",
                boxShadow: catHover === cat ? `4px 4px 0 ${INK}` : "none",
                transition: "all 0.12s",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{emoji}</span>
              {cat}
              {!loading && categoryCounts[cat] != null && (
                <span style={{ fontSize: "10px", opacity: 0.5, fontWeight: 600 }}>
                  {categoryCounts[cat].toLocaleString()}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Cheap Flower Near You */}
      {cheapFlowerNearYou.length > 0 && (
        <div className="container" style={{ paddingBottom: "28px" }}>
          <SectionHead
            title="Cheapest near you"
            tag={zipInput}
            href="/compare?category=flower"
            hrefLabel="See all →"
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {cheapFlowerNearYou.map((strain) => {
              const normalizedNearby = new Set(
                nearbyDispensaries.map((d) => d.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
              );
              const bestNearbyPrice = [...(strain.prices || [])]
                .filter((p) => normalizedNearby.has(p.dispensary.toLowerCase().replace(/[^a-z0-9]/g, "")))
                .sort((a, b) => a.price - b.price)[0];
              const dispensarySlug = bestNearbyPrice
                ? bestNearbyPrice.dispensary.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                : null;
              const dispensaryDir = bestNearbyPrice
                ? dispensaries.find((d) =>
                    d.name.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                    bestNearbyPrice.dispensary.toLowerCase().replace(/[^a-z0-9]/g, "")
                  )
                : null;

              return (
                <NearbyCard
                  key={strain.id}
                  strainId={strain.id}
                  strainName={strain.name}
                  brand={strain.brand}
                  price={bestNearbyPrice?.price}
                  dispensarySlug={dispensarySlug}
                  dispensaryName={bestNearbyPrice?.dispensary}
                  website={dispensaryDir?.website}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Map section */}
      <div className="container" style={{ paddingBottom: "28px" }}>
        <SectionHead
          title="Dispensary map"
          tag={userLocation ? `Near ${zipInput}` : undefined}
          href="/map"
          hrefLabel="Full map →"
        />
        <div
          style={{
            border: `3px solid ${INK}`,
            borderRadius: "18px",
            background: SKY,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <HomeMap
            dispensaries={dispensaries}
            userLocation={userLocation}
            className="w-full"
            style={{ height: "380px" }}
          />
          {!userLocation && (
            <div style={{
              position: "absolute",
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,248,238,0.95)",
              border: `2.5px solid ${INK}`,
              borderRadius: "12px",
              padding: "8px 18px",
              fontSize: "12px",
              fontWeight: 700,
              color: INK,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}>
              📍 Enter your zip above to find nearby dispensaries
            </div>
          )}
        </div>
        <p style={{ fontSize: "11px", color: "rgba(26,26,46,0.5)", marginTop: "8px", textAlign: "center" }}>
          Click any marker to view that dispensary&apos;s strains and pricing.
        </p>
      </div>

      {/* Lowest Price Dispensary Near Me */}
      <div className="container" style={{ paddingBottom: "28px" }}>
        <SectionHead title="Lowest price dispensary near me" />

        {cheapestNearbyDispensary ? (
          <div
            style={{
              border: `3px solid ${INK}`,
              borderRadius: "16px",
              background: "#fff",
              padding: "24px",
              maxWidth: "520px",
              boxShadow: `6px 6px 0 ${INK}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
              <div style={{ minWidth: 0 }}>
                <Link
                  href={`/dispensary/${cheapestNearbyDispensary.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                  style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 800, color: INK, textDecoration: "none" }}
                >
                  {cheapestNearbyDispensary.name}
                </Link>
                <p style={{ fontSize: "12px", color: "rgba(26,26,46,0.55)", marginTop: "3px" }}>
                  {cheapestNearbyDispensary.city} · {cheapestNearbyDispensary.distance?.toFixed(1)} mi away
                </p>
                <p style={{ fontSize: "11px", color: "rgba(26,26,46,0.45)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cheapestNearbyDispensary.full_address}
                </p>
              </div>
              {cheapestNearbyDispensary.price_avg != null && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(26,26,46,0.45)", fontWeight: 700 }}>avg price</p>
                  <p style={{ fontFamily: "var(--font-heading)", fontSize: "28px", fontWeight: 900, color: GREEN, lineHeight: 1 }}>
                    ${cheapestNearbyDispensary.price_avg}
                  </p>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Link
                href={`/dispensary/${cheapestNearbyDispensary.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: INK, color: CREAM, border: `3px solid ${INK}`, borderRadius: "10px", fontSize: "12px", fontWeight: 800, textDecoration: "none", textTransform: "uppercase" }}
              >
                <Leaf style={{ width: 12, height: 12 }} /> View Menu
              </Link>
              {cheapestNearbyDispensary.website && (
                <a
                  href={cheapestNearbyDispensary.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: "#fff", color: INK, border: `3px solid ${INK}`, borderRadius: "10px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}
                >
                  <Globe style={{ width: 12, height: 12 }} /> Website
                </a>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cheapestNearbyDispensary.full_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: "#fff", color: INK, border: `3px solid ${INK}`, borderRadius: "10px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}
              >
                <Navigation style={{ width: 12, height: 12 }} /> Directions
              </a>
            </div>
          </div>
        ) : (
          <div style={{
            border: `3px solid ${INK}`,
            borderRadius: "16px",
            background: "#fff",
            padding: "32px",
            maxWidth: "420px",
            textAlign: "center",
          }}>
            <MapPin style={{ width: 32, height: 32, color: "rgba(26,26,46,0.25)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(26,26,46,0.55)" }}>
              Enter your zip code above to find the cheapest dispensary within 5 miles.
            </p>
          </div>
        )}
      </div>

      <DealDigestBanner
        totalStrains={displayStats.totalStrains}
        totalDispensaries={displayStats.totalDispensaries}
      />
    </div>
  );
}

function NearbyCard({
  strainId, strainName, brand, price, dispensarySlug, dispensaryName, website,
}: {
  strainId: string; strainName: string; brand?: string; price?: number;
  dispensarySlug: string | null; dispensaryName?: string; website?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `3px solid ${INK}`,
        borderRadius: "16px",
        padding: "20px",
        transform: hovered ? "translateY(-5px)" : "none",
        boxShadow: hovered ? `6px 6px 0 ${INK}` : "none",
        transition: "all 0.12s",
      }}
    >
      {price != null && (
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "28px", fontWeight: 900, color: INK, lineHeight: 1, marginBottom: "8px" }}>
          ${price}
        </div>
      )}
      <Link
        href={`/strain/${strainId}`}
        style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 700, color: INK, textDecoration: "none", display: "block", marginBottom: "4px" }}
      >
        {strainName}
      </Link>
      {brand && (
        <p style={{ fontSize: "11px", color: "rgba(26,26,46,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>{brand}</p>
      )}
      <div style={{ borderTop: `2px dashed ${INK}`, paddingTop: "10px", marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
        {dispensarySlug && dispensaryName && (
          <Link
            href={`/dispensary/${dispensarySlug}`}
            style={{ fontSize: "11px", fontWeight: 600, color: INK, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: MINT, border: `2px solid ${INK}`, flexShrink: 0, display: "inline-block" }} />
            {dispensaryName}
          </Link>
        )}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "11px", fontWeight: 700, color: CORAL, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Globe style={{ width: 11, height: 11 }} /> Site
          </a>
        )}
      </div>
    </div>
  );
}
