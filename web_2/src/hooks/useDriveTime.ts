"use client";

/**
 * StrainScout MD — Drive Time Hook
 * Uses Google Maps Distance Matrix Service to compute drive times.
 * Batches requests (max 25 destinations per call) and caches results.
 */
import { useState, useCallback, useRef } from "react";
import type { DirectoryDispensary } from "./useDispensaryDirectory";

interface DriveTimeResult {
  dispensaryName: string;
  driveTime: string;
  driveDistance: string;
  durationSeconds: number;
}

declare global {
  interface Window {
    google?: typeof google;
  }
}

const driveTimeCache = new Map<string, DriveTimeResult>();

function getCacheKey(lat: number, lng: number, name: string): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}->${name}`;
}

export function useDriveTime() {
  const [driveTimesMap, setDriveTimesMap] = useState<Map<string, DriveTimeResult>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const fetchDriveTimes = useCallback(async (
    userLocation: { lat: number; lng: number },
    dispensaries: DirectoryDispensary[],
    maxDispensaries = 10,
  ) => {
    if (!window.google?.maps) { setError("Google Maps not loaded"); return; }

    abortRef.current = false;
    setLoading(true);
    setError(null);

    try {
      const nearest = dispensaries.filter(d => d.lat && d.lng).slice(0, maxDispensaries);
      if (nearest.length === 0) { setLoading(false); return; }

      const uncached: DirectoryDispensary[] = [];
      const cachedResults = new Map<string, DriveTimeResult>();

      for (const d of nearest) {
        const key = getCacheKey(userLocation.lat, userLocation.lng, d.name);
        const hit = driveTimeCache.get(key);
        if (hit) cachedResults.set(d.name, hit);
        else uncached.push(d);
      }

      if (uncached.length === 0) {
        setDriveTimesMap(cachedResults);
        setLoading(false);
        return;
      }

      const service = new google.maps.DistanceMatrixService();
      const origin = new google.maps.LatLng(userLocation.lat, userLocation.lng);
      const allResults = new Map<string, DriveTimeResult>(cachedResults);

      for (let i = 0; i < uncached.length; i += 25) {
        if (abortRef.current) break;
        const batch = uncached.slice(i, i + 25);
        const destinations = batch.map(d => new google.maps.LatLng(d.lat, d.lng));

        try {
          const response = await new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
            service.getDistanceMatrix(
              { origins: [origin], destinations, travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.IMPERIAL },
              (res, status) => (status === "OK" && res ? resolve(res) : reject(new Error(`Distance Matrix: ${status}`))),
            );
          });

          const row = response.rows[0];
          if (row) {
            row.elements.forEach((el, idx) => {
              const d = batch[idx];
              if (el.status === "OK") {
                const result: DriveTimeResult = { dispensaryName: d.name, driveTime: el.duration.text, driveDistance: el.distance.text, durationSeconds: el.duration.value };
                allResults.set(d.name, result);
                driveTimeCache.set(getCacheKey(userLocation.lat, userLocation.lng, d.name), result);
              }
            });
          }
        } catch (batchErr) {
          console.warn("[DriveTime] batch failed:", batchErr);
        }
      }

      if (!abortRef.current) setDriveTimesMap(allResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drive time failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const abort = useCallback(() => { abortRef.current = true; }, []);

  return { driveTimesMap, loading, error, fetchDriveTimes, abort };
}
