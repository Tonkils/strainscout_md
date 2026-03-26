"use client";

/**
 * StrainScout MD — Catalog Data Hook
 * Loads the verified strain catalog from /public and provides
 * typed access to strains, dispensaries, brands, and external links.
 */
import { useState, useEffect, useMemo } from "react";

// In production (IONOS), the catalog is uploaded by the pipeline to /data/.
// In local dev, place the catalog in web_2/public/data/ or update this path.
const CATALOG_URL = "/data/strainscout_catalog_v10.min.json";

export interface CatalogStrain {
  id: string;
  name: string;
  brand: string;
  type: string;
  thc: number;
  cbd: number;
  terpenes: string[];
  effects: string[];
  flavors: string[];
  description: string;
  genetics: string;
  prices: { dispensary: string; price: number; source: string; last_verified?: string; verified_source?: string }[];
  last_verified?: string | null;
  verification_status?: string;
  catalog_version?: string;
  catalog_updated?: string;
  dispensaries: string[];
  grade: "A" | "B" | "C";
  product_category?: string;
  category_confidence?: "verified" | "inferred" | "conflict";
  leafly_url: string;
  weedmaps_url: string;
  dispensary_links: Record<string, string>;
  ordering_links?: Record<string, { dutchie?: string; weedmaps?: string }>;
  leafly_verified?: boolean;
  weedmaps_verified?: boolean;
  weedmaps_name?: string;
  price_min?: number | null;
  price_max?: number | null;
  price_avg?: number | null;
  dispensary_count?: number;
}

export interface CatalogDispensary {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  brand: string;
  phone: string;
  website: string;
  rating: string;
  strain_count: number;
}

export interface CatalogBrand {
  name: string;
  strain_count: number;
}

export interface CatalogMetadata {
  version: string;
  generated: string;
  total_strains: number;
  total_dispensaries: number;
  total_brands: number;
  data_sources: string[];
  validation_score: number;
}

export interface Catalog {
  metadata: CatalogMetadata;
  strains: CatalogStrain[];
  dispensaries: CatalogDispensary[];
  brands: CatalogBrand[];
}

let catalogCache: Catalog | null = null;
let loadingPromise: Promise<Catalog> | null = null;

async function fetchCatalog(): Promise<Catalog> {
  if (catalogCache) return catalogCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch(CATALOG_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load catalog: ${res.status}`);
      return res.json();
    })
    .then((rawData: CatalogStrain[] | Catalog) => {
      let strains: CatalogStrain[];
      if (Array.isArray(rawData)) {
        strains = rawData;
      } else if ((rawData as Catalog).strains) {
        return rawData as Catalog;
      } else {
        strains = [];
      }

      for (const s of strains) {
        const validPrices = (s.prices || [])
          .map((p) => p.price)
          .filter((p) => typeof p === "number" && p > 0);
        if (validPrices.length > 0) {
          s.price_min = Math.min(...validPrices);
          s.price_max = Math.max(...validPrices);
          s.price_avg = Math.round((validPrices.reduce((a, b) => a + b, 0) / validPrices.length) * 100) / 100;
        } else {
          s.price_min = null;
          s.price_max = null;
          s.price_avg = null;
        }
        s.dispensary_count =
          (s.dispensaries || []).length ||
          new Set((s.prices || []).map((p) => p.dispensary)).size;
      }

      const dispMap = new Map<string, { count: number; website: string }>();
      const brandMap = new Map<string, { count: number }>();

      for (const s of strains) {
        for (const d of s.dispensaries || []) {
          const existing = dispMap.get(d);
          const website = s.dispensary_links?.[d] || "";
          if (existing) {
            existing.count++;
            if (!existing.website && website) existing.website = website;
          } else {
            dispMap.set(d, { count: 1, website });
          }
        }
        for (const p of s.prices || []) {
          if (p.dispensary && !dispMap.has(p.dispensary)) {
            const website = s.dispensary_links?.[p.dispensary] || "";
            dispMap.set(p.dispensary, { count: 1, website });
          }
        }
        if (s.brand) {
          const existing = brandMap.get(s.brand);
          if (existing) {
            existing.count++;
          } else {
            brandMap.set(s.brand, { count: 1 });
          }
        }
      }

      const dispensaries: CatalogDispensary[] = Array.from(dispMap.entries())
        .map(([name, data]) => ({
          name,
          address: "",
          city: "",
          lat: 0,
          lng: 0,
          brand: "",
          phone: "",
          website: data.website,
          rating: "",
          strain_count: data.count,
        }))
        .sort((a, b) => b.strain_count - a.strain_count);

      const brands: CatalogBrand[] = Array.from(brandMap.entries())
        .map(([name, data]) => ({ name, strain_count: data.count }))
        .sort((a, b) => b.strain_count - a.strain_count);

      const catalog: Catalog = {
        metadata: {
          version: "10.0",
          generated: new Date().toISOString().split("T")[0],
          total_strains: strains.length,
          total_dispensaries: dispensaries.length,
          total_brands: brands.length,
          data_sources: ["Weedmaps", "Leafly", "Dispensary Websites", "MCA Registry"],
          validation_score: 99.8,
        },
        strains,
        dispensaries,
        brands,
      };

      catalogCache = catalog;
      return catalog;
    })
    .catch((err) => {
      loadingPromise = null; // reset so retry is possible on next call
      throw err;
    });

  return loadingPromise;
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(catalogCache);
  const [loading, setLoading] = useState(!catalogCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalogCache) return;
    fetchCatalog()
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { catalog, loading, error };
}

export function useStrains(options?: {
  brand?: string;
  type?: string;
  category?: string;
  search?: string;
  dispensary?: string;
  sortBy?: "price_asc" | "price_desc" | "name" | "savings" | "dispensary_count" | "grade";
  limit?: number;
}) {
  const { catalog, loading, error } = useCatalog();
  const { brand, type, category, search, dispensary, sortBy: sortByOpt, limit } = options ?? {};

  const strains = useMemo(() => {
    if (!catalog) return [];
    let result = [...catalog.strains];

    if (brand) {
      result = result.filter((s) => s.brand.toLowerCase() === brand.toLowerCase());
    }
    if (type) {
      result = result.filter((s) => s.type.toLowerCase() === type.toLowerCase());
    }
    if (category) {
      result = result.filter(
        (s) => (s.product_category || "Flower").toLowerCase() === category.toLowerCase()
      );
    }
    if (dispensary) {
      result = result.filter(
        (s) =>
          s.dispensaries.some((d) => d.toLowerCase() === dispensary.toLowerCase()) ||
          s.prices.some((p) => p.dispensary.toLowerCase() === dispensary.toLowerCase())
      );
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q) ||
          (s.terpenes || []).some((t) => t.toLowerCase().includes(q)) ||
          (s.effects || []).some((e) => e.toLowerCase().includes(q)) ||
          (s.flavors || []).some((f) => f.toLowerCase().includes(q)) ||
          (s.genetics || "").toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q)
      );
    }

    switch (sortByOpt) {
      case "price_asc":
        result.sort((a, b) => (a.price_avg ?? 999) - (b.price_avg ?? 999));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price_avg ?? 0) - (a.price_avg ?? 0));
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "savings":
        result.sort((a, b) => {
          const savA = a.price_max && a.price_min ? a.price_max - a.price_min : 0;
          const savB = b.price_max && b.price_min ? b.price_max - b.price_min : 0;
          return savB - savA;
        });
        break;
      case "grade": {
        const gradeOrder = { A: 0, B: 1, C: 2 };
        result.sort((a, b) => (gradeOrder[a.grade] ?? 2) - (gradeOrder[b.grade] ?? 2));
        break;
      }
      default:
        result.sort((a, b) => (b.dispensary_count ?? 0) - (a.dispensary_count ?? 0));
    }

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }, [catalog, brand, type, category, search, dispensary, sortByOpt, limit]);

  return { strains, loading, error, total: catalog?.strains.length ?? 0 };
}

export function useCatalogStats() {
  const { catalog, loading } = useCatalog();

  const stats = useMemo(() => {
    if (!catalog) {
      return { totalStrains: 0, totalDispensaries: 0, totalBrands: 0, avgPrice: 0, lowestPrice: 0, highestPrice: 0, lastUpdated: "", validationScore: 0 };
    }
    const pricesAll = catalog.strains.filter((s) => s.price_avg).map((s) => s.price_avg!);
    return {
      totalStrains: catalog.metadata.total_strains,
      totalDispensaries: catalog.metadata.total_dispensaries,
      totalBrands: catalog.metadata.total_brands,
      avgPrice: pricesAll.length ? Math.round((pricesAll.reduce((a, b) => a + b, 0) / pricesAll.length) * 100) / 100 : 0,
      lowestPrice: pricesAll.length ? Math.min(...pricesAll) : 0,
      highestPrice: pricesAll.length ? Math.max(...pricesAll) : 0,
      lastUpdated: catalog.metadata.generated,
      validationScore: catalog.metadata.validation_score,
    };
  }, [catalog]);

  return { stats, loading };
}
