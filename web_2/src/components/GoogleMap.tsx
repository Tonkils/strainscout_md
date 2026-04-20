"use client";

/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
    _mapsLoading?: Promise<void>;
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "AIzaSyDbgiKDoThs7iE_tyiCiAXlTqrEoLQ8I-8";

function loadMapScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window._mapsLoading) return window._mapsLoading;

  window._mapsLoading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => { console.error("Failed to load Google Maps"); resolve(); };
    document.head.appendChild(script);
  });

  return window._mapsLoading;
}

interface GoogleMapProps {
  className?: string;
  style?: React.CSSProperties;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function GoogleMapView({
  className,
  style,
  initialCenter = { lat: 39.05, lng: -76.85 },
  initialZoom = 8,
  onMapReady,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const init = usePersistFn(async () => {
    await loadMapScript();
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new window.google!.maps.Map(containerRef.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: true,
      mapId: "DEMO_MAP_ID",
    });
    onMapReady?.(mapRef.current);
  });

  useEffect(() => { init(); }, [init]);

  return <div ref={containerRef} className={cn("w-full h-[500px]", className)} style={style} />;
}
