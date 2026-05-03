"use client";

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
    _mapsLoading?: Promise<void> | undefined;
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

function loadMapScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window._mapsLoading) return window._mapsLoading;

  window._mapsLoading = new Promise<void>((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set"));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => {
      window._mapsLoading = undefined;
      reject(new Error("Failed to load Google Maps — check your API key and network"));
    };
    document.head.appendChild(script);
  });

  return window._mapsLoading;
}

interface GoogleMapProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function GoogleMapView({
  className,
  initialCenter = { lat: 39.05, lng: -76.85 },
  initialZoom = 8,
  onMapReady,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Map failed to load";
      console.error(msg);
      setLoadError(msg);
      return;
    }
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

  if (loadError) {
    return (
      <div className={cn("w-full h-[500px] flex items-center justify-center bg-muted rounded-md", className)}>
        <p className="text-sm text-muted-foreground text-center px-4">
          Map unavailable — {loadError}
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className={cn("w-full h-[500px]", className)} />;
}
