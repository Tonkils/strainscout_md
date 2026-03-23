/**
 * StrainScout MD — Strain Data Types & Defaults
 * Real data is loaded via useCatalog hook from CDN.
 * This file provides types and empty defaults for initial render.
 */

export interface Dispensary {
  name: string;
  city: string;
  lat: number;
  lng: number;
  address: string;
  brand?: string;
  phone?: string;
  website?: string;
  rating?: string;
  strain_count?: number;
}

export interface StrainPrice {
  dispensary: string;
  price: number;
  source: string;
}

export interface Strain {
  id: string;
  name: string;
  brand: string;
  type: string;
  thc: number | null;
  cbd: number | null;
  terpenes: string[];
  effects: string[];
  flavors: string[];
  description: string;
  genetics: string;
  prices: StrainPrice[];
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  dispensary_count: number;
  dispensaries: string[];
  grade: "A" | "B" | "C";
}

export interface CatalogStats {
  totalStrains: number;
  totalDispensaries: number;
  totalBrands: number;
  avgPrice: number;
  lowestPrice: number;
  lastUpdated: string;
  validationScore: number;
}

// Empty defaults for initial render before CDN data loads
export const strains: Strain[] = [];
export const dispensaries: Dispensary[] = [];
export const catalogStats: CatalogStats = {
  totalStrains: 2220,
  totalDispensaries: 98,
  totalBrands: 86,
  avgPrice: 47,
  lowestPrice: 10,
  lastUpdated: "March 12, 2026",
  validationScore: 99.8,
};

export const categories = ["All", "Flower"] as const;
export type Category = (typeof categories)[number];
