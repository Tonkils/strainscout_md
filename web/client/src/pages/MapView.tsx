/*
 * StrainScout MD — Dispensary Finder (Option C: Split-View Directory + Map)
 * Design: Botanical Data Lab
 * Left: Searchable/filterable dispensary directory with full details
 * Right: Interactive Google Map with numbered markers
 * Features: geolocation, strain filter, distance sorting, directions
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link, useSearch } from "wouter";
import {
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  Navigation,
  ExternalLink,
  ChevronDown,
  X,
  Loader2,
  Leaf,
  ArrowUpDown,
  Crosshair,
  Route,
  Maximize2,
  Minimize2,
  Clock,
  Car,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPageSEO } from "@/components/SEO";
import { MapView as GoogleMap } from "@/components/Map";
import { useCatalog, type CatalogStrain } from "@/hooks/useCatalog";
import {
  useDispensaryDirectory,
  haversineDistance,
  type DirectoryDispensary,
} from "@/hooks/useDispensaryDirectory";
import { useDriveTime } from "@/hooks/useDriveTime";
import { trackPageViewed, trackMapInteracted } from "@/lib/analytics";

// Maryland center
const MD_CENTER = { lat: 39.05, lng: -76.85 };
const MD_ZOOM = 8;

type SortMode = "distance" | "strains" | "price" | "rating" | "name";

export default function MapViewPage() {
  const { catalog, loading: catalogLoading } = useCatalog();

  // Analytics: track page view
  useEffect(() => { trackPageViewed("map"); }, []);
  const { dispensaries: directory, loading: dirLoading } =
    useDispensaryDirectory();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrain, setSelectedStrain] = useState<CatalogStrain | null>(
    null
  );
  const [strainSearchOpen, setStrainSearchOpen] = useState(false);
  const [strainSearchQuery, setStrainSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("strains");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [selectedDispensary, setSelectedDispensary] =
    useState<DirectoryDispensary | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [hoveredDispensary, setHoveredDispensary] = useState<string | null>(
    null
  );
  const [autoLocateAttempted, setAutoLocateAttempted] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState("");
  const [zipLocating, setZipLocating] = useState(false);
  const [geoLocFailed, setGeoLocFailed] = useState(false);
  // Mobile bottom sheet state (must be declared before any early returns)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Drive time hook
  const { driveTimesMap, loading: driveTimeLoading, fetchDriveTimes } = useDriveTime();

  // Refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const sidebarRef = useRef<HTMLDivElement>(null);

  const loading = catalogLoading || dirLoading;
  const strains = catalog?.strains || [];

  // Filter strains for the strain search dropdown — only show strains with dispensaries
  const strainsWithDisps = useMemo(() => {
    return strains
      .filter((s) => (s.dispensary_count ?? 0) > 0)
      .sort((a, b) => (b.dispensary_count ?? 0) - (a.dispensary_count ?? 0));
  }, [strains]);

  const filteredStrainOptions = useMemo(() => {
    if (!strainSearchQuery) return strainsWithDisps.slice(0, 20);
    const q = strainSearchQuery.toLowerCase();
    return strainsWithDisps
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [strainsWithDisps, strainSearchQuery]);

  // Compute dispensary list with distance + strain filter
  const processedDispensaries = useMemo(() => {
    let list = [...directory];

    // Add distance if user location is available
    if (userLocation) {
      list = list.map((d) => ({
        ...d,
        distance: haversineDistance(
          userLocation.lat,
          userLocation.lng,
          d.lat,
          d.lng
        ),
      }));
    }

    // Filter by search query (name, city, address)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q) ||
          d.full_address.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q)
      );
    }

    // If a strain is selected, filter to dispensaries that carry it
    // Use fuzzy matching to handle minor name differences between catalog and directory
    if (selectedStrain) {
      const strainDispNames = [
        ...(selectedStrain.dispensaries || []),
        ...(selectedStrain.prices || []).map((p) => p.dispensary),
      ];
      const strainDisps = new Set(strainDispNames);

      // Build a normalized lookup for fuzzy matching
      const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normalizedCatalogNames = new Map(
        strainDispNames.map((n) => [normalize(n), n])
      );

      const normalizedCatalogKeys = Array.from(normalizedCatalogNames.keys());

      list = list.filter((d) => {
        if (strainDisps.has(d.name)) return true;
        // Try normalized match
        const normDir = normalize(d.name);
        return normalizedCatalogKeys.some(
          (normCat) => normDir === normCat || normDir.includes(normCat) || normCat.includes(normDir)
        );
      });
    }

    // Sort
    switch (sortMode) {
      case "distance":
        list.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
        break;
      case "strains":
        list.sort((a, b) => b.strain_count - a.strain_count);
        break;
      case "price":
        list.sort(
          (a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999)
        );
        break;
      case "rating":
        list.sort((a, b) => {
          const ra = parseFloat(a.google_rating) || 0;
          const rb = parseFloat(b.google_rating) || 0;
          return rb - ra;
        });
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [directory, searchQuery, selectedStrain, sortMode, userLocation]);

  // Get the price for a specific strain at a dispensary
  const getStrainPrice = useCallback(
    (dispName: string): number | null => {
      if (!selectedStrain) return null;
      const price = selectedStrain.prices.find(
        (p) => p.dispensary === dispName
      );
      return price?.price ?? null;
    },
    [selectedStrain]
  );

  // Helper to place user marker on map
  const placeUserMarker = useCallback((loc: { lat: number; lng: number }) => {
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
    }
    if (mapRef.current && window.google) {
      const pin = document.createElement("div");
      pin.innerHTML = `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6);"></div>`;
      userMarkerRef.current =
        new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: loc,
          content: pin,
          title: "Your Location",
          zIndex: 1000,
        });
    }
  }, []);

  // Geolocation
  const requestLocation = useCallback((autoDetect = false) => {
    if (!navigator.geolocation) {
      setGeoLocFailed(true);
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setSortMode("distance");
        setLocatingUser(false);
        setGeoLocFailed(false);

        // Center map on user (only if manual request, not auto-detect)
        if (mapRef.current && !autoDetect) {
          mapRef.current.setCenter(loc);
          mapRef.current.setZoom(10);
        }

        placeUserMarker(loc);
      },
      () => {
        setLocatingUser(false);
        setGeoLocFailed(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [placeUserMarker]);

  // Zip code geocoding fallback
  const geocodeZip = useCallback((zip: string) => {
    if (!/^\d{5}$/.test(zip)) {
      setZipError("Enter a valid 5-digit zip code");
      return;
    }
    setZipError("");
    setZipLocating(true);
    if (!window.google) {
      setZipError("Maps not loaded yet");
      setZipLocating(false);
      return;
    }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { address: `${zip}, Maryland, USA` },
      (results, status) => {
        setZipLocating(false);
        if (status === "OK" && results && results[0]) {
          const loc = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          setUserLocation(loc);
          setSortMode("distance");
          if (mapRef.current) {
            mapRef.current.setCenter(loc);
            mapRef.current.setZoom(10);
          }
          placeUserMarker(loc);
        } else {
          setZipError("Zip code not found in Maryland");
        }
      }
    );
  }, [placeUserMarker]);

  // Read URL query params (?strain=xxx&locate=true)
  const searchString = useSearch();
  const urlParamsProcessed = useRef(false);

  useEffect(() => {
    if (urlParamsProcessed.current || loading || !catalog) return;
    const params = new URLSearchParams(searchString);
    const strainParam = params.get("strain");
    const locateParam = params.get("locate");

    if (strainParam) {
      const match = catalog.strains.find((s) => s.id === strainParam);
      if (match) {
        setSelectedStrain(match);
        urlParamsProcessed.current = true;
      }
    }

    if (locateParam === "true") {
      requestLocation(false);
      urlParamsProcessed.current = true;
    }
  }, [loading, catalog, searchString, requestLocation]);

  // Auto-detect location on first visit
  useEffect(() => {
    if (autoLocateAttempted || loading) return;
    setAutoLocateAttempted(true);
    // Check if geolocation permission was previously granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          requestLocation(true);
        }
      }).catch(() => {
        // permissions API not supported, skip auto-detect
      });
    }
  }, [autoLocateAttempted, loading, requestLocation]);

  // Fetch drive times when user location changes and dispensaries are loaded
  useEffect(() => {
    if (userLocation && processedDispensaries.length > 0) {
      fetchDriveTimes(userLocation, processedDispensaries, 15);
    }
  }, [userLocation, processedDispensaries, fetchDriveTimes]);

  // Create a marker pin element
  const createMarkerContent = useCallback(
    (index: number, dispensary: DirectoryDispensary, isSelected: boolean) => {
      const hasStrain = selectedStrain
        ? selectedStrain.prices.some((p) => p.dispensary === dispensary.name) ||
          (selectedStrain.dispensaries || []).includes(dispensary.name)
        : true;

      const price = getStrainPrice(dispensary.name);
      const isGoodDeal =
        price !== null &&
        selectedStrain?.price_avg &&
        price <= selectedStrain.price_avg * 0.85;

      const bgColor = !hasStrain
        ? "#4b5563"
        : isGoodDeal
          ? "#22c55e"
          : isSelected
            ? "#3b82f6"
            : "#10b981";

      const size = isSelected ? 36 : 28;

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width:${size}px;height:${size}px;
          background:${bgColor};
          border:2px solid white;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:${isSelected ? 14 : 11}px;font-weight:700;color:white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          transition:all 0.2s;
          cursor:pointer;
        ">${index + 1}</div>
      `;
      return el;
    },
    [selectedStrain, getStrainPrice]
  );

  // Build info window content
  const buildInfoContent = useCallback(
    (d: DirectoryDispensary) => {
      const price = getStrainPrice(d.name);
      const ratingNum = parseFloat(d.google_rating) || 0;
      const stars = "★".repeat(Math.round(ratingNum)) + "☆".repeat(5 - Math.round(ratingNum));

      return `
        <div style="font-family:'Space Grotesk',system-ui,sans-serif;max-width:280px;padding:4px;">
          <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111;">${d.name}</h3>
          <p style="margin:0 0 4px;font-size:12px;color:#555;">${d.full_address}</p>
          ${d.phone ? `<p style="margin:0 0 4px;font-size:12px;color:#555;">📞 ${d.phone}</p>` : ""}
          ${ratingNum > 0 ? `<p style="margin:0 0 6px;font-size:12px;color:#f59e0b;">${stars} <span style="color:#555;">${d.google_rating}</span></p>` : ""}
          <p style="margin:0 0 6px;font-size:12px;color:#555;">${d.strain_count} strains available</p>
          ${driveTimesMap.get(d.name) ? `<p style="margin:0 0 6px;font-size:12px;color:#f59e0b;font-weight:600;">🚗 ${driveTimesMap.get(d.name)!.driveTime} (${driveTimesMap.get(d.name)!.driveDistance})</p>` : ""}
          ${price !== null ? `<p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#10b981;font-family:'JetBrains Mono',monospace;">$${price} <span style="font-size:11px;font-weight:400;color:#555;">for ${selectedStrain?.name}</span></p>` : ""}
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.full_address)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#10b981;color:white;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">🧭 Directions</a>
            ${d.website ? `<a href="${d.website}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#3b82f6;color:white;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">🌐 Website</a>` : ""}
          </div>
        </div>
      `;
    },
    [selectedStrain, getStrainPrice, driveTimesMap]
  );

  // Update markers when dispensaries change
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    // Clear existing markers
    for (const m of markersRef.current) {
      m.map = null;
    }
    markersRef.current = [];

    // Close info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    // Create new markers
    processedDispensaries.forEach((d, i) => {
      if (!d.lat || !d.lng) return;

      const content = createMarkerContent(
        i,
        d,
        selectedDispensary?.name === d.name
      );

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: d.lat, lng: d.lng },
        content,
        title: d.name,
        zIndex: selectedDispensary?.name === d.name ? 100 : 10,
      });

      marker.addListener("click", () => {
        setSelectedDispensary(d);

        if (!infoWindowRef.current) {
          infoWindowRef.current = new google.maps.InfoWindow();
        }
        infoWindowRef.current.setContent(buildInfoContent(d));
        infoWindowRef.current.open({
          anchor: marker,
          map: mapRef.current!,
        });

        // Scroll sidebar to this dispensary
        const el = document.getElementById(`disp-card-${d.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });

      markersRef.current.push(marker);
    });
  }, [
    processedDispensaries,
    selectedDispensary,
    createMarkerContent,
    buildInfoContent,
  ]);

  // Update markers when data changes
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Handle map ready
  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      updateMarkers();
    },
    [updateMarkers]
  );

  // Click a dispensary card in the sidebar
  const handleCardClick = useCallback(
    (d: DirectoryDispensary) => {
      setSelectedDispensary(d);

      if (mapRef.current) {
        mapRef.current.panTo({ lat: d.lat, lng: d.lng });
        mapRef.current.setZoom(13);
      }

      // Find the marker and open info window
      const idx = processedDispensaries.findIndex(
        (pd) => pd.name === d.name
      );
      if (idx >= 0 && markersRef.current[idx] && infoWindowRef.current) {
        infoWindowRef.current.setContent(buildInfoContent(d));
        infoWindowRef.current.open({
          anchor: markersRef.current[idx],
          map: mapRef.current!,
        });
      }
    },
    [processedDispensaries, buildInfoContent]
  );

  // Clear strain filter
  const clearStrainFilter = useCallback(() => {
    setSelectedStrain(null);
    setStrainSearchQuery("");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">
            Loading dispensary data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <MapPageSEO />
      <Navbar />

      {/* Search & Filter Bar */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search dispensaries, cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-2 sm:py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Strain filter */}
            <div className="relative">
              {selectedStrain ? (
                <div className="flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-lg px-4 py-2.5">
                  <Leaf className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground font-medium truncate max-w-[180px]">
                    {selectedStrain.name}
                  </span>
                  <button
                    onClick={clearStrainFilter}
                    className="text-muted-foreground hover:text-foreground ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setStrainSearchOpen(!strainSearchOpen)}
                  className="flex items-center gap-2 bg-background border border-border/50 rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <Leaf className="w-4 h-4" />
                  Filter by Strain
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}

              {strainSearchOpen && !selectedStrain && (
                <div
                  className="absolute top-full mt-1 right-0 w-80 bg-card border border-border/50 rounded-lg shadow-xl overflow-hidden"
                  style={{ zIndex: 9999 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-border/30">
                    <input
                      type="text"
                      placeholder="Type a strain name..."
                      value={strainSearchQuery}
                      onChange={(e) => setStrainSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredStrainOptions.map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStrain(s);
                          setStrainSearchOpen(false);
                          setStrainSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="text-foreground">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.type} · {s.dispensary_count} disp.
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Location button */}
            <button
              onClick={() => requestLocation()}
              disabled={locatingUser}
              className="flex items-center justify-center gap-2 bg-background border border-border/50 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-muted-foreground hover:text-primary hover:border-primary/30 active:bg-accent transition-colors disabled:opacity-50"
            >
              {locatingUser ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {userLocation ? "Update Location" : "Use My Location"}
              </span>
            </button>
          </div>

          {/* Zip code fallback — shown when geolocation fails or user prefers zip */}
          {(geoLocFailed || !userLocation) && (
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="Zip code"
                  value={zipCode}
                  onChange={(e) => {
                    setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5));
                    setZipError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") geocodeZip(zipCode); }}
                  className="w-24 bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={() => geocodeZip(zipCode)}
                disabled={zipLocating || zipCode.length < 5}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
              >
                {zipLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Go"}
              </button>
              {geoLocFailed && !userLocation && (
                <span className="text-[10px] text-muted-foreground">Location unavailable — enter your zip</span>
              )}
              {zipError && (
                <span className="text-[10px] text-red-400">{zipError}</span>
              )}
            </div>
          )}

          {/* Sort + Stats Row */}
          <div className="flex items-center justify-between mt-2 sm:mt-3">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground mr-0.5 sm:mr-1 shrink-0 hidden sm:inline">
                Sort:
              </span>
              {(
                [
                  { key: "distance", label: "Distance", needsLoc: true },
                  { key: "strains", label: "Most Strains" },
                  { key: "price", label: "Lowest Price" },
                  { key: "rating", label: "Rating" },
                  { key: "name", label: "A–Z" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === "distance" && !userLocation) {
                      requestLocation(false);
                    }
                    setSortMode(opt.key);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    sortMode === opt.key
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  } ${opt.key === "distance" && !userLocation ? "opacity-50" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {processedDispensaries.length} dispensar
              {processedDispensaries.length === 1 ? "y" : "ies"}
              {selectedStrain && (
                <> carrying <span className="text-primary">{selectedStrain.name}</span></>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Split View (Desktop) / Full Map + Bottom Sheet (Mobile) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Directory Sidebar — hidden on mobile, shown as bottom sheet instead */}
        <div
          ref={sidebarRef}
          className={`hidden md:block overflow-y-auto border-r border-border/30 transition-all duration-300 ${
            mapExpanded ? "w-0 opacity-0 overflow-hidden" : "lg:w-[420px] xl:w-[480px]"
          }`}
        >
          {/* Nearest Dispensary Quick Card */}
          {userLocation && processedDispensaries.length > 0 && sortMode === "distance" && (() => {
            const nearest = processedDispensaries[0];
            const dt = driveTimesMap.get(nearest.name);
            return (
              <div
                className="px-5 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-all"
                onClick={() => handleCardClick(nearest)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Nearest Dispensary</span>
                </div>
                <h3 className="text-sm font-bold text-foreground">{nearest.name}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  {nearest.distance !== undefined && (
                    <span className="text-xs text-primary font-medium">
                      {nearest.distance < 1 ? `${(nearest.distance * 5280).toFixed(0)} ft` : `${nearest.distance.toFixed(1)} mi`}
                    </span>
                  )}
                  {dt && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                      <Car className="w-3 h-3" />
                      {dt.driveTime}
                    </span>
                  )}
                  {driveTimeLoading && !dt && (
                    <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                  )}
                  <span className="text-xs text-muted-foreground">{nearest.strain_count} strains</span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nearest.full_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 text-xs rounded-md bg-cta text-cta-foreground font-semibold hover:bg-cta-hover transition-colors shadow-cta"
                >
                  <Route className="w-3 h-3" />
                  Get Directions
                </a>
              </div>
            );
          })()}

          {processedDispensaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">
                No dispensaries match your search.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  clearStrainFilter();
                }}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            processedDispensaries.map((d, i) => {
              const price = getStrainPrice(d.name);
              const ratingNum = parseFloat(d.google_rating) || 0;
              const isSelected = selectedDispensary?.name === d.name;
              const isHovered = hoveredDispensary === d.name;

              return (
                <div
                  key={d.id}
                  id={`disp-card-${d.id}`}
                  onClick={() => handleCardClick(d)}
                  onMouseEnter={() => setHoveredDispensary(d.name)}
                  onMouseLeave={() => setHoveredDispensary(null)}
                  className={`border-b border-border/20 px-5 py-4 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : isHovered
                        ? "bg-accent/50"
                        : "hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Number badge */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-emerald-800/50 text-emerald-400"
                      }`}
                    >
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + Rating */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground leading-tight">
                          {d.name}
                        </h3>
                        {ratingNum > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-foreground font-medium">
                              {d.google_rating}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Address */}
                      <p className="text-xs text-muted-foreground mt-1">
                        {d.full_address}
                      </p>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {d.distance !== undefined && (
                          <span className="text-xs text-primary font-medium">
                            {d.distance < 1
                              ? `${(d.distance * 5280).toFixed(0)} ft`
                              : `${d.distance.toFixed(1)} mi`}
                          </span>
                        )}
                        {driveTimesMap.get(d.name) && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                            <Car className="w-3 h-3" />
                            {driveTimesMap.get(d.name)!.driveTime}
                          </span>
                        )}
                        {driveTimeLoading && d.distance !== undefined && !driveTimesMap.get(d.name) && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {d.strain_count} strains
                        </span>
                        {d.price_avg && (
                          <span className="text-xs font-price text-muted-foreground">
                            avg ${d.price_avg.toFixed(0)}
                          </span>
                        )}
                        {price !== null && (
                          <span className="text-xs font-price font-bold text-savings">
                            ${price}
                          </span>
                        )}
                      </div>

                      {/* Contact + Actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {d.phone && (
                          <a
                            href={`tel:${d.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            {d.phone}
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.full_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md bg-primary/15 text-primary font-medium hover:bg-primary/25 transition-colors"
                        >
                          <Route className="w-3 h-3" />
                          Directions
                        </a>
                        {d.website && (
                          <a
                            href={d.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Globe className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Google Map */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          {/* Map expand/collapse toggle */}
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className="absolute top-3 left-3 z-10 w-9 h-9 bg-card/90 backdrop-blur border border-border/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-md"
            title={mapExpanded ? "Show sidebar" : "Expand map"}
          >
            {mapExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Map legend */}
          <div className="absolute bottom-4 left-3 z-10 bg-card/90 backdrop-blur border border-border/50 rounded-lg px-3 py-2 shadow-md">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Dispensary
              </span>
              {selectedStrain && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  Best Deal
                </span>
              )}
              {userLocation && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  You
                </span>
              )}
            </div>
          </div>

          <GoogleMap
            className="w-full h-full"
            initialCenter={MD_CENTER}
            initialZoom={MD_ZOOM}
            onMapReady={handleMapReady}
          />
        </div>

        {/* Mobile Bottom Sheet */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-20">
          {/* Pull-up handle */}
          {!sheetOpen && (
            <button
              onClick={() => setSheetOpen(true)}
              className="w-full bg-card/95 backdrop-blur-lg border-t border-border/50 rounded-t-2xl px-4 py-3 flex flex-col items-center gap-1 active:bg-accent transition-colors"
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-sm font-medium text-foreground">
                {processedDispensaries.length} dispensar{processedDispensaries.length === 1 ? "y" : "ies"}
                {selectedStrain && <span className="text-primary"> carrying {selectedStrain.name}</span>}
              </span>
              <span className="text-xs text-muted-foreground">Tap to view list</span>
            </button>
          )}

          {/* Expanded sheet */}
          {sheetOpen && (
            <div
              className={`bg-card/98 backdrop-blur-lg border-t border-border/50 rounded-t-2xl transition-all duration-300 ${
                sheetExpanded ? "h-[80vh]" : "h-[45vh]"
              }`}
            >
              {/* Sheet header with handle */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <button
                  onClick={() => {
                    if (sheetExpanded) {
                      setSheetExpanded(false);
                    } else {
                      setSheetExpanded(true);
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground active:text-foreground"
                >
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                  {sheetExpanded ? "Collapse" : "Expand"}
                </button>
                <span className="text-xs text-muted-foreground font-medium">
                  {processedDispensaries.length} results
                </span>
                <button
                  onClick={() => { setSheetOpen(false); setSheetExpanded(false); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet content — scrollable dispensary list */}
              <div className="overflow-y-auto" style={{ height: "calc(100% - 52px)" }}>
                {processedDispensaries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <MapPin className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">No dispensaries match your search.</p>
                  </div>
                ) : (
                  processedDispensaries.map((d, i) => {
                    const price = getStrainPrice(d.name);
                    const ratingNum = parseFloat(d.google_rating) || 0;
                    const isSelected = selectedDispensary?.name === d.name;

                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          handleCardClick(d);
                          setSheetOpen(false);
                          setSheetExpanded(false);
                        }}
                        className={`border-b border-border/20 px-4 py-3.5 active:bg-accent/50 transition-colors ${
                          isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-emerald-800/50 text-emerald-400"
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold text-foreground leading-tight">{d.name}</h3>
                              <div className="flex items-center gap-2 shrink-0">
                                {price !== null && (
                                  <span className="text-sm font-price font-bold text-savings">${price}</span>
                                )}
                                {ratingNum > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-xs text-foreground">{d.google_rating}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.full_address}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {d.distance !== undefined && (
                                <span className="text-xs text-primary font-medium">
                                  {d.distance < 1 ? `${(d.distance * 5280).toFixed(0)} ft` : `${d.distance.toFixed(1)} mi`}
                                </span>
                              )}
                              {driveTimesMap.get(d.name) && (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                                  <Car className="w-3 h-3" />
                                  {driveTimesMap.get(d.name)!.driveTime}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{d.strain_count} strains</span>
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.full_address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-md bg-primary/15 text-primary font-medium active:bg-primary/25"
                              >
                                <Route className="w-3 h-3" />
                                Directions
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
