"use client";

import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GoogleMapView } from "@/components/GoogleMap";
import type { DirectoryDispensary } from "@/hooks/useDispensaryDirectory";

const MD_CENTER = { lat: 39.05, lng: -76.85 };

declare global {
  interface Window {
    google?: typeof google;
  }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function HomeMap({
  dispensaries,
  userLocation,
  className,
}: {
  dispensaries: DirectoryDispensary[];
  userLocation: { lat: number; lng: number } | null;
  className?: string;
}) {
  const router = useRouter();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !window.google?.maps?.marker) return;
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    dispensaries.forEach((d, i) => {
      if (!d.lat || !d.lng) return;
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:26px;height:26px;background:#10b981;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:pointer;">${i + 1}</div>`;
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: d.lat, lng: d.lng },
        content: el,
        title: d.name,
      });
      marker.addListener("click", () => {
        router.push(`/dispensary/${toSlug(d.name)}`);
      });
      markersRef.current.push(marker);
    });
  }, [dispensaries, router]);

  // Re-draw markers when dispensaries load
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Update user location marker and recenter when zip is geocoded
  useEffect(() => {
    if (!userLocation || !mapRef.current || !window.google?.maps?.marker) return;
    if (userMarkerRef.current) userMarkerRef.current.map = null;
    const pin = document.createElement("div");
    pin.innerHTML = `<div style="width:14px;height:14px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.7);"></div>`;
    userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: userLocation,
      content: pin,
      title: "Your Location",
      zIndex: 1000,
    });
    mapRef.current.setCenter(userLocation);
    mapRef.current.setZoom(10);
  }, [userLocation]);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      updateMarkers();
    },
    [updateMarkers]
  );

  return (
    <GoogleMapView
      className={className ?? "w-full h-[380px] rounded-xl overflow-hidden"}
      initialCenter={MD_CENTER}
      initialZoom={8}
      onMapReady={handleMapReady}
    />
  );
}
