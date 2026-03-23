/**
 * StrainScout MD — Dispensary Directory Hook
 * Loads the enriched dispensary directory with geocoded coordinates,
 * contact info, ratings, and strain counts from CDN.
 */
import { useState, useEffect } from "react";

const DIRECTORY_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/dispensary_directory.min_1575d3ca.json";

export interface DirectoryDispensary {
  id: number;
  name: string;
  brand: string;
  address: string;
  city: string;
  state_zip: string;
  full_address: string;
  lat: number;
  lng: number;
  phone: string;
  website: string;
  google_rating: string;
  operational_status: string;
  strain_count: number;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  quality_grade: string;
  mca_verified: string;
  gmaps_verified: string;
  // Computed at runtime
  distance?: number;
  driveTime?: string; // e.g. "12 min"
  driveDistance?: string; // e.g. "5.3 mi"
}

let directoryCache: DirectoryDispensary[] | null = null;
let directoryPromise: Promise<DirectoryDispensary[]> | null = null;

async function fetchDirectory(): Promise<DirectoryDispensary[]> {
  if (directoryCache) return directoryCache;
  if (directoryPromise) return directoryPromise;

  directoryPromise = fetch(DIRECTORY_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load directory: ${res.status}`);
      return res.json();
    })
    .then((data: DirectoryDispensary[]) => {
      directoryCache = data;
      return data;
    });

  return directoryPromise;
}

export function useDispensaryDirectory() {
  const [dispensaries, setDispensaries] = useState<DirectoryDispensary[]>(
    directoryCache || []
  );
  const [loading, setLoading] = useState(!directoryCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (directoryCache) {
      setDispensaries(directoryCache);
      setLoading(false);
      return;
    }

    fetchDirectory()
      .then((data) => {
        setDispensaries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { dispensaries, loading, error };
}

/**
 * Calculate distance between two lat/lng points using the Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
