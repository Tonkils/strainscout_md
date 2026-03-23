/**
 * StrainScout MD — Drive Time Hook
 * Uses Google Maps Distance Matrix Service to compute drive times
 * from user's location to nearby dispensaries.
 * Batches requests (max 25 destinations per call) and caches results.
 */
import { useState, useCallback, useRef } from "react";
import type { DirectoryDispensary } from "./useDispensaryDirectory";

interface DriveTimeResult {
  dispensaryName: string;
  driveTime: string; // e.g. "12 min"
  driveDistance: string; // e.g. "5.3 mi"
  durationSeconds: number;
}

// Cache drive times to avoid repeated API calls
const driveTimeCache = new Map<string, DriveTimeResult>();

function getCacheKey(userLat: number, userLng: number, dispName: string): string {
  // Round to 3 decimals (~100m precision) for cache key stability
  return `${userLat.toFixed(3)},${userLng.toFixed(3)}->${dispName}`;
}

export function useDriveTime() {
  const [driveTimesMap, setDriveTimesMap] = useState<Map<string, DriveTimeResult>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  /**
   * Fetch drive times for a list of dispensaries from the user's location.
   * Only fetches for the nearest N dispensaries (by haversine) to limit API calls.
   */
  const fetchDriveTimes = useCallback(
    async (
      userLocation: { lat: number; lng: number },
      dispensaries: DirectoryDispensary[],
      maxDispensaries: number = 10
    ) => {
      if (!window.google?.maps) {
        setError("Google Maps not loaded");
        return;
      }

      abortRef.current = false;
      setLoading(true);
      setError(null);

      try {
        // Take the nearest N dispensaries (already sorted by distance in processedDispensaries)
        const nearest = dispensaries
          .filter((d) => d.lat && d.lng)
          .slice(0, maxDispensaries);

        if (nearest.length === 0) {
          setLoading(false);
          return;
        }

        // Check cache first
        const uncached: DirectoryDispensary[] = [];
        const cachedResults = new Map<string, DriveTimeResult>();

        for (const d of nearest) {
          const key = getCacheKey(userLocation.lat, userLocation.lng, d.name);
          const cached = driveTimeCache.get(key);
          if (cached) {
            cachedResults.set(d.name, cached);
          } else {
            uncached.push(d);
          }
        }

        // If all cached, just update state
        if (uncached.length === 0) {
          setDriveTimesMap(cachedResults);
          setLoading(false);
          return;
        }

        const service = new google.maps.DistanceMatrixService();
        const origin = new google.maps.LatLng(userLocation.lat, userLocation.lng);

        // Batch in groups of 25 (API limit)
        const batchSize = 25;
        const allResults = new Map<string, DriveTimeResult>(cachedResults);

        for (let i = 0; i < uncached.length; i += batchSize) {
          if (abortRef.current) break;

          const batch = uncached.slice(i, i + batchSize);
          const destinations = batch.map(
            (d) => new google.maps.LatLng(d.lat, d.lng)
          );

          try {
            const response = await new Promise<google.maps.DistanceMatrixResponse>(
              (resolve, reject) => {
                service.getDistanceMatrix(
                  {
                    origins: [origin],
                    destinations,
                    travelMode: google.maps.TravelMode.DRIVING,
                    unitSystem: google.maps.UnitSystem.IMPERIAL,
                  },
                  (response, status) => {
                    if (status === "OK" && response) {
                      resolve(response);
                    } else {
                      reject(new Error(`Distance Matrix failed: ${status}`));
                    }
                  }
                );
              }
            );

            // Parse results
            const row = response.rows[0];
            if (row) {
              row.elements.forEach((element, idx) => {
                const disp = batch[idx];
                if (element.status === "OK") {
                  const result: DriveTimeResult = {
                    dispensaryName: disp.name,
                    driveTime: element.duration.text,
                    driveDistance: element.distance.text,
                    durationSeconds: element.duration.value,
                  };
                  allResults.set(disp.name, result);

                  // Cache it
                  const key = getCacheKey(userLocation.lat, userLocation.lng, disp.name);
                  driveTimeCache.set(key, result);
                }
              });
            }
          } catch (batchErr) {
            console.warn(`[DriveTime] Batch ${i} failed:`, batchErr);
          }
        }

        if (!abortRef.current) {
          setDriveTimesMap(allResults);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Drive time fetch failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { driveTimesMap, loading, error, fetchDriveTimes, abort };
}
