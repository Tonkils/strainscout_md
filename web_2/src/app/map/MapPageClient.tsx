"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, MapPin, Phone, Globe, Star, Navigation,
  ChevronDown, X, Loader2, Leaf, Crosshair, Car,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleMapView } from "@/components/GoogleMap";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import { useDispensaryDirectory, haversineDistance, type DirectoryDispensary } from "@/hooks/useDispensaryDirectory";
import { useDriveTime } from "@/hooks/useDriveTime";
import { trackPageViewed, trackMapInteracted, trackDispensaryClicked, trackOutboundLinkClicked } from "@/lib/analytics";
import { slugify } from "@/lib/utils";

const MD_CENTER = { lat: 39.05, lng: -76.85 };
const MD_ZOOM = 8;

type SortMode = "distance" | "strains" | "price" | "rating" | "name";

declare global {
  interface Window { google?: typeof google; }
}

export default function MapPageClient() {
  const { catalog, loading: catalogLoading } = useCatalog();
  const { dispensaries: directory, loading: dirLoading } = useDispensaryDirectory();
  const { driveTimesMap, fetchDriveTimes } = useDriveTime();
  const searchParams = useSearchParams();

  useEffect(() => { trackPageViewed("map"); }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrain, setSelectedStrain] = useState<CatalogStrain | null>(null);
  const [strainSearchOpen, setStrainSearchOpen] = useState(false);
  const [strainSearchQuery, setStrainSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("strains");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [selectedDispensary, setSelectedDispensary] = useState<DirectoryDispensary | null>(null);
  const [autoLocateAttempted, setAutoLocateAttempted] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState("");
  const [zipLocating, setZipLocating] = useState(false);
  const [geoLocFailed, setGeoLocFailed] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const loading = catalogLoading || dirLoading;
  const strains = useMemo(() => catalog?.strains ?? [], [catalog]);

  const strainsWithDisps = useMemo(() =>
    strains.filter(s => (s.dispensary_count ?? 0) > 0)
      .sort((a, b) => (b.dispensary_count ?? 0) - (a.dispensary_count ?? 0)),
    [strains]
  );

  const filteredStrainOptions = useMemo(() => {
    if (!strainSearchQuery) return strainsWithDisps.slice(0, 20);
    const q = strainSearchQuery.toLowerCase();
    return strainsWithDisps.filter(s => s.name.toLowerCase().includes(q)).slice(0, 20);
  }, [strainsWithDisps, strainSearchQuery]);

  const processedDispensaries = useMemo(() => {
    let list = [...directory];

    if (userLocation) {
      list = list.map(d => ({
        ...d,
        distance: haversineDistance(userLocation.lat, userLocation.lng, d.lat, d.lng),
      }));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.full_address.toLowerCase().includes(q) ||
        d.brand.toLowerCase().includes(q)
      );
    }

    if (selectedStrain) {
      const strainDispNames = [
        ...(selectedStrain.dispensaries || []),
        ...(selectedStrain.prices || []).map(p => p.dispensary),
      ];
      const strainDisps = new Set(strainDispNames);
      const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normCatalogKeys = strainDispNames.map(n => normalize(n));

      list = list.filter(d => {
        if (strainDisps.has(d.name)) return true;
        const normDir = normalize(d.name);
        return normCatalogKeys.some(k => normDir === k || normDir.includes(k) || k.includes(normDir));
      });
    }

    switch (sortMode) {
      case "distance": list.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999)); break;
      case "strains": list.sort((a, b) => b.strain_count - a.strain_count); break;
      case "price": list.sort((a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999)); break;
      case "rating": list.sort((a, b) => (parseFloat(b.google_rating) || 0) - (parseFloat(a.google_rating) || 0)); break;
      case "name": list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }

    return list;
  }, [directory, searchQuery, selectedStrain, sortMode, userLocation]);

  const getStrainPrice = useCallback((dispName: string): number | null => {
    if (!selectedStrain) return null;
    return selectedStrain.prices.find(p => p.dispensary === dispName)?.price ?? null;
  }, [selectedStrain]);

  const placeUserMarker = useCallback((loc: { lat: number; lng: number }) => {
    if (userMarkerRef.current) userMarkerRef.current.map = null;
    if (mapRef.current && window.google) {
      const pin = document.createElement("div");
      const dot = document.createElement("div");
      Object.assign(dot.style, {
        width: "16px", height: "16px", background: "#3b82f6",
        border: "3px solid white", borderRadius: "50%",
        boxShadow: "0 0 8px rgba(59,130,246,0.6)",
      });
      pin.appendChild(dot);
      userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current, position: loc, content: pin, title: "Your Location", zIndex: 1000,
      });
    }
  }, []);

  const requestLocation = useCallback((autoDetect = false) => {
    if (!navigator.geolocation) { setGeoLocFailed(true); return; }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setSortMode("distance");
        setLocatingUser(false);
        setGeoLocFailed(false);
        if (mapRef.current && !autoDetect) { mapRef.current.setCenter(loc); mapRef.current.setZoom(10); }
        placeUserMarker(loc);
        trackMapInteracted("locate");
      },
      () => { setLocatingUser(false); setGeoLocFailed(true); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [placeUserMarker]);

  const geocodeZip = useCallback((zip: string) => {
    if (!/^\d{5}$/.test(zip)) { setZipError("Enter a valid 5-digit zip code"); return; }
    setZipError("");
    setZipLocating(true);
    if (!window.google) { setZipError("Maps not loaded yet"); setZipLocating(false); return; }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: `${zip}, Maryland, USA` }, (results, status) => {
      setZipLocating(false);
      if (status === "OK" && results && results[0]) {
        const loc = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
        setUserLocation(loc);
        setSortMode("distance");
        if (mapRef.current) { mapRef.current.setCenter(loc); mapRef.current.setZoom(10); }
        placeUserMarker(loc);
      } else {
        setZipError("Zip code not found in Maryland");
      }
    });
  }, [placeUserMarker]);

  // Process URL params
  useEffect(() => {
    if (loading || !catalog) return;
    const strainParam = searchParams.get("strain");
    const locateParam = searchParams.get("locate");
    if (strainParam) {
      const match = catalog.strains.find(s => s.id === strainParam);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (match) setSelectedStrain(match);
    }
    if (locateParam === "true") requestLocation(false);
  }, [loading, catalog, searchParams, requestLocation]);

  // Auto-detect location
  useEffect(() => {
    if (autoLocateAttempted || loading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoLocateAttempted(true);
    navigator.permissions?.query({ name: "geolocation" }).then(result => {
      if (result.state === "granted") requestLocation(true);
    }).catch(() => {});
  }, [autoLocateAttempted, loading, requestLocation]);

  // Fetch drive times
  useEffect(() => {
    if (userLocation && processedDispensaries.length > 0) {
      fetchDriveTimes(userLocation, processedDispensaries, 15);
    }
  }, [userLocation, processedDispensaries, fetchDriveTimes]);

  const createMarkerContent = useCallback((index: number, d: DirectoryDispensary, isSelected: boolean) => {
    const price = getStrainPrice(d.name);
    const hasStrain = selectedStrain
      ? selectedStrain.prices.some(p => p.dispensary === d.name) || (selectedStrain.dispensaries || []).includes(d.name)
      : true;
    const isGoodDeal = price !== null && selectedStrain?.price_avg && price <= selectedStrain.price_avg * 0.85;
    const bgColor = !hasStrain ? "#4b5563" : isGoodDeal ? "#22c55e" : isSelected ? "#3b82f6" : "#10b981";
    const size = isSelected ? 36 : 28;
    const el = document.createElement("div");
    const circle = document.createElement("div");
    Object.assign(circle.style, {
      width: `${size}px`, height: `${size}px`, background: bgColor,
      border: "2px solid white", borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: `${isSelected ? 14 : 11}px`, fontWeight: "700", color: "white",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)", cursor: "pointer",
    });
    circle.textContent = String(index + 1);
    el.appendChild(circle);
    return el;
  }, [selectedStrain, getStrainPrice]);

  const buildInfoContent = useCallback((d: DirectoryDispensary): HTMLElement => {
    const price = getStrainPrice(d.name);
    const ratingNum = parseFloat(d.google_rating) || 0;
    const stars = "\u2605".repeat(Math.round(ratingNum)) + "\u2606".repeat(5 - Math.round(ratingNum));
    const dt = driveTimesMap.get(d.name);

    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      fontFamily: "'Space Grotesk',system-ui,sans-serif",
      maxWidth: "280px", padding: "4px",
    });

    const heading = document.createElement("h3");
    Object.assign(heading.style, { margin: "0 0 6px", fontSize: "15px", fontWeight: "700", color: "#111" });
    heading.textContent = d.name;
    wrapper.appendChild(heading);

    const addr = document.createElement("p");
    Object.assign(addr.style, { margin: "0 0 4px", fontSize: "12px", color: "#555" });
    addr.textContent = d.full_address;
    wrapper.appendChild(addr);

    if (d.phone) {
      const phone = document.createElement("p");
      Object.assign(phone.style, { margin: "0 0 4px", fontSize: "12px", color: "#555" });
      phone.textContent = "\u{1F4DE} " + d.phone;
      wrapper.appendChild(phone);
    }

    if (ratingNum > 0) {
      const rating = document.createElement("p");
      Object.assign(rating.style, { margin: "0 0 6px", fontSize: "12px", color: "#f59e0b" });
      rating.textContent = stars + " ";
      const ratingVal = document.createElement("span");
      ratingVal.style.color = "#555";
      ratingVal.textContent = d.google_rating;
      rating.appendChild(ratingVal);
      wrapper.appendChild(rating);
    }

    const strainCount = document.createElement("p");
    Object.assign(strainCount.style, { margin: "0 0 6px", fontSize: "12px", color: "#555" });
    strainCount.textContent = d.strain_count + " strains available";
    wrapper.appendChild(strainCount);

    if (dt) {
      const drive = document.createElement("p");
      Object.assign(drive.style, { margin: "0 0 6px", fontSize: "12px", color: "#f59e0b", fontWeight: "600" });
      drive.textContent = "\u{1F697} " + dt.driveTime + " (" + dt.driveDistance + ")";
      wrapper.appendChild(drive);
    }

    if (price !== null) {
      const priceEl = document.createElement("p");
      Object.assign(priceEl.style, {
        margin: "0 0 8px", fontSize: "16px", fontWeight: "700",
        color: "#10b981", fontFamily: "'JetBrains Mono',monospace",
      });
      priceEl.textContent = "$" + price + " ";
      const forStrain = document.createElement("span");
      Object.assign(forStrain.style, { fontSize: "11px", fontWeight: "400", color: "#555" });
      forStrain.textContent = "for " + (selectedStrain?.name ?? "");
      priceEl.appendChild(forStrain);
      wrapper.appendChild(priceEl);
    }

    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "flex", gap: "6px", flexWrap: "wrap" });

    const dirLink = document.createElement("a");
    dirLink.href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(d.full_address);
    dirLink.target = "_blank";
    dirLink.rel = "noopener noreferrer";
    Object.assign(dirLink.style, {
      padding: "6px 12px", background: "#10b981", color: "white",
      borderRadius: "6px", fontSize: "12px", fontWeight: "600", textDecoration: "none",
    });
    dirLink.textContent = "\u{1F9ED} Directions";
    actions.appendChild(dirLink);

    if (d.website) {
      const webLink = document.createElement("a");
      webLink.href = d.website;
      webLink.target = "_blank";
      webLink.rel = "noopener noreferrer";
      Object.assign(webLink.style, {
        padding: "6px 12px", background: "#3b82f6", color: "white",
        borderRadius: "6px", fontSize: "12px", fontWeight: "600", textDecoration: "none",
      });
      webLink.textContent = "\u{1F310} Website";
      actions.appendChild(webLink);
    }

    wrapper.appendChild(actions);
    return wrapper;
  }, [selectedStrain, getStrainPrice, driveTimesMap]);

  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
    if (infoWindowRef.current) infoWindowRef.current.close();

    processedDispensaries.forEach((d, i) => {
      if (!d.lat || !d.lng) return;
      const content = createMarkerContent(i, d, selectedDispensary?.name === d.name);
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!, position: { lat: d.lat, lng: d.lng }, content, title: d.name,
        zIndex: selectedDispensary?.name === d.name ? 100 : 10,
      });
      marker.addListener("click", () => {
        setSelectedDispensary(d);
        if (!infoWindowRef.current) infoWindowRef.current = new google.maps.InfoWindow();
        infoWindowRef.current.setContent(buildInfoContent(d));
        infoWindowRef.current.open({ anchor: marker, map: mapRef.current! });
        document.getElementById(`disp-card-${d.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        trackMapInteracted("marker_click", d.name);
      });
      markersRef.current.push(marker);
    });
  }, [processedDispensaries, selectedDispensary, createMarkerContent, buildInfoContent]);

  useEffect(() => { updateMarkers(); }, [updateMarkers]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();
    updateMarkers();
  }, [updateMarkers]);

  const handleCardClick = useCallback((d: DirectoryDispensary) => {
    setSelectedDispensary(d);
    if (mapRef.current) { mapRef.current.panTo({ lat: d.lat, lng: d.lng }); mapRef.current.setZoom(13); }
    trackMapInteracted("marker_click", d.name);
  }, []);

  // ─── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div role="status" aria-label="Loading dispensary map" className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-full lg:w-[350px] flex flex-col border-r border-border p-4 space-y-3">
          {/* Search bar skeleton */}
          <Skeleton className="h-10 w-full rounded-lg" />
          {/* Sort bar skeleton */}
          <Skeleton className="h-8 w-full rounded-lg" />
          {/* Dispensary card skeletons */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2 py-3 border-b border-border/30">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-3 w-1/4 rounded" />
            </div>
          ))}
        </div>
        {/* Map area skeleton */}
        <div className="flex-1">
          <Skeleton className="w-full h-full min-h-[300px] rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <div className="w-full lg:w-[420px] flex flex-col border-r border-border overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              Dispensary Map
            </h1>
            <span className="text-sm text-muted-foreground">{processedDispensaries.length} shown</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dispensaries…"
              aria-label="Search dispensaries"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Strain filter */}
          <div className="relative">
            <button
              onClick={() => setStrainSearchOpen(o => !o)}
              aria-label={selectedStrain ? `Strain filter: ${selectedStrain.name}` : "Filter by strain"}
              aria-expanded={strainSearchOpen}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Leaf className="w-4 h-4 text-emerald-500" />
                {selectedStrain ? selectedStrain.name : "Filter by strain…"}
              </span>
              {selectedStrain
                ? <button type="button" aria-label="Clear strain filter" onClick={e => { e.stopPropagation(); setSelectedStrain(null); setStrainSearchOpen(false); }}><X className="w-4 h-4" /></button>
                : <ChevronDown aria-hidden="true" className="w-4 h-4" />
              }
            </button>
            {strainSearchOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-xl overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search strains…"
                    aria-label="Search strains"
                    value={strainSearchQuery}
                    onChange={e => setStrainSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-muted/50 border border-border rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {filteredStrainOptions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStrain(s); setStrainSearchOpen(false); setStrainSearchQuery(""); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.dispensary_count}d · {s.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Location + Sort row */}
          <div className="flex gap-2">
            <button
              onClick={() => requestLocation()}
              disabled={locatingUser}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {locatingUser ? <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
              {locatingUser ? "Locating…" : userLocation ? "Re-locate" : "Use my location"}
            </button>
            <select
              value={sortMode}
              aria-label="Sort dispensaries"
              onChange={e => { const mode = e.target.value as SortMode; setSortMode(mode); if (mode === "distance") { trackMapInteracted("sort_distance"); if (!userLocation) requestLocation(); } }}
              className="flex-1 text-xs bg-muted/50 border border-border rounded-lg px-2 py-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            >
              <option value="strains">Most strains</option>
              <option value="distance">Nearest first</option>
              <option value="price">Lowest price</option>
              <option value="rating">Highest rated</option>
              <option value="name">A–Z</option>
            </select>
          </div>

          {/* Zip fallback */}
          {geoLocFailed && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter zip code"
                aria-label="Zip code"
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && geocodeZip(zipCode)}
                maxLength={5}
                className="flex-1 px-3 py-1.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
              <button
                onClick={() => geocodeZip(zipCode)}
                disabled={zipLocating}
                aria-label="Search by zip code"
                className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {zipLocating ? <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" /> : "Go"}
              </button>
            </div>
          )}
          {zipError && <p className="text-xs text-red-400">{zipError}</p>}
        </div>

        {/* Dispensary list */}
        <div className="flex-1 overflow-y-auto">
          {processedDispensaries.map((d, i) => {
            const driveTime = driveTimesMap.get(d.name);
            const strainPrice = getStrainPrice(d.name);
            const isSelected = selectedDispensary?.name === d.name;
            const ratingNum = parseFloat(d.google_rating) || 0;

            return (
              <div
                key={d.id}
                id={`disp-card-${d.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Select ${d.name}`}
                onClick={() => handleCardClick(d)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(d); } }}
                className={`p-3 border-b border-border cursor-pointer transition-colors ${
                  isSelected ? "bg-emerald-500/10 border-l-2 border-l-emerald-500" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Number badge */}
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isSelected ? "bg-blue-500" : "bg-emerald-600"}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <Link
                        href={`/dispensary/${slugify(d.name)}`}
                        onClick={e => { e.stopPropagation(); trackDispensaryClicked(d.name, "map_sidebar"); }}
                        className="font-semibold text-sm text-foreground hover:text-emerald-400 transition-colors truncate"
                      >
                        {d.name}
                      </Link>
                      {strainPrice !== null && (
                        <span className="flex-shrink-0 text-sm font-bold text-emerald-400 font-mono">${strainPrice}</span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground truncate mt-0.5">{d.city}</p>

                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-emerald-500" />
                        {d.strain_count} strains
                      </span>
                      {ratingNum > 0 && (
                        <span className="text-xs text-amber-400 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          {d.google_rating}
                        </span>
                      )}
                      {d.price_avg && (
                        <span className="text-xs text-muted-foreground">avg ${d.price_avg}</span>
                      )}
                      {d.distance !== undefined && (
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {d.distance.toFixed(1)} mi
                        </span>
                      )}
                      {driveTime && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {driveTime.driveTime}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.full_address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => { e.stopPropagation(); trackOutboundLinkClicked(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.full_address)}`, "google_maps", undefined, d.name); }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" /> Directions
                      </a>
                      {d.website && (
                        <a
                          href={d.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => { e.stopPropagation(); trackOutboundLinkClicked(d.website, "dispensary_website", undefined, d.name); }}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" /> Website
                        </a>
                      )}
                      {d.phone && (
                        <a
                          href={`tel:${d.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> {d.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {processedDispensaries.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No dispensaries match your filters.</p>
              {selectedStrain && (
                <button onClick={() => setSelectedStrain(null)} className="mt-2 text-xs text-emerald-400 underline">
                  Clear strain filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <GoogleMapView
          className="w-full h-full"
          initialCenter={MD_CENTER}
          initialZoom={MD_ZOOM}
          onMapReady={handleMapReady}
        />
        {/* Selected dispensary overlay */}
        {selectedDispensary && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur border border-border rounded-xl shadow-xl p-4 max-w-sm w-full mx-4">
            <div className="flex items-start justify-between">
              <div>
                <Link
                  href={`/dispensary/${slugify(selectedDispensary.name)}`}
                  className="font-semibold text-foreground hover:text-emerald-400 transition-colors"
                >
                  {selectedDispensary.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedDispensary.full_address}</p>
              </div>
              <button
                onClick={() => setSelectedDispensary(null)}
                aria-label="Close dispensary details"
                className="p-1 rounded-full hover:bg-muted transition-colors ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedDispensary.full_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Get Directions
              </a>
              <Link
                href={`/dispensary/${slugify(selectedDispensary.name)}`}
                className="flex-1 text-center py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                View Strains
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
