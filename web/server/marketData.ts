/**
 * Market Intelligence Data Pipeline — Sprint 9
 *
 * Provides aggregation functions for the /market dashboard.
 * Works with two data sources:
 *   1. Live CDN catalog (immediate, always available)
 *   2. Historical DB snapshots (grows over time with weekly ingests)
 *
 * Regional mapping groups 100+ Maryland dispensaries into 5 regions
 * based on geographic location for meaningful price comparisons.
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { priceSnapshots } from "../drizzle/schema";

// ============================================================
// Types
// ============================================================

export interface MarketOverview {
  totalStrains: number;
  totalDispensaries: number;
  avgPrice: number;
  medianPrice: number;
  lowestPrice: number;
  highestPrice: number;
  priceByType: { type: string; avgPrice: number; count: number; minPrice: number; maxPrice: number }[];
  lastUpdated: string;
}

export interface RegionalPriceData {
  region: string;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  dispensaryCount: number;
  strainCount: number;
}

export interface StrainAvailability {
  id: string;
  name: string;
  brand: string;
  type: string;
  dispensaryCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceSpread: number;
}

export interface PriceVolatility {
  strainId: string;
  strainName: string;
  type: string;
  avgPrice: number;
  stdDev: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  volatilityIndex: number; // stdDev / avgPrice * 100
  dispensaryCount: number;
}

export interface PriceTrend {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  strainCount: number;
  type?: string;
}

export interface CatalogStrain {
  id: string;
  name: string;
  brand: string;
  type: string;
  thc: number | null;
  prices: { dispensary: string; price: number }[];
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  dispensary_count: number;
  catalog_updated: string;
}

// ============================================================
// Regional Dispensary Mapping
// ============================================================

/**
 * Maps Maryland dispensaries to geographic regions based on their
 * city/location suffix or known location. This enables regional
 * price comparison on the market dashboard.
 */
const REGION_MAP: Record<string, string> = {
  // Baltimore Metro
  "CULTA - Baltimore": "Baltimore Metro",
  "Cookies - Baltimore": "Baltimore Metro",
  "Gold Leaf": "Baltimore Metro",
  "Green Goods - Baltimore": "Baltimore Metro",
  "Health for Life - Baltimore": "Baltimore Metro",
  "Health for Life - White Marsh Med & Rec Cannabis Dispensary": "Baltimore Metro",
  "Liberty Cannabis - Baltimore": "Baltimore Metro",
  "Nirvana Cannabis - Baltimore": "Baltimore Metro",
  "Nirvana Cannabis - Rosedale": "Baltimore Metro",
  "Remedy - Baltimore (Windsor Mill)": "Baltimore Metro",
  "Star Buds - Baltimore": "Baltimore Metro",
  "The Forest - Baltimore": "Baltimore Metro",
  "Trulieve - Halethorpe": "Baltimore Metro",
  "Trulieve - Lutherville": "Baltimore Metro",
  "Trulieve - Lutherville - Timonium": "Baltimore Metro",
  "Zen Leaf - Towson": "Baltimore Metro",
  "Zen Leaf - Pasadena": "Baltimore Metro",
  "The Apothecarium - Nottingham": "Baltimore Metro",
  "Peake ReLeaf": "Baltimore Metro",
  "Storehouse": "Baltimore Metro",
  "Elevated Dispo": "Baltimore Metro",
  "Enlightened Dispensary Abingdon": "Baltimore Metro",
  "Rise Dispensaries - Joppa": "Baltimore Metro",
  "Far & Dotter": "Baltimore Metro",
  "Haven Dispensary": "Baltimore Metro",
  "HerbaFi": "Baltimore Metro",
  "Mana Supply Co. - Middle River": "Baltimore Metro",
  "Ritual Dispensary": "Baltimore Metro",

  // DC Suburbs (Montgomery, Prince George's, Howard, Anne Arundel)
  "Columbia Care - Chevy Chase": "DC Suburbs",
  "Curaleaf - Columbia": "DC Suburbs",
  "Curaleaf - Gaithersburg": "DC Suburbs",
  "CULTA - Columbia": "DC Suburbs",
  "Remedy - Columbia": "DC Suburbs",
  "Evergrowing Releaf - Columbia": "DC Suburbs",
  "Health for Life - Bethesda Med & Rec Cannabis Dispensary": "DC Suburbs",
  "Liberty Cannabis - Rockville": "DC Suburbs",
  "RISE Dispensary Bethesda": "DC Suburbs",
  "Trulieve - Rockville": "DC Suburbs",
  "Verilife - Silver Spring": "DC Suburbs",
  "Story Cannabis - Silver Spring": "DC Suburbs",
  "Story Cannabis - Hyattsville": "DC Suburbs",
  "Sweetspot Dispensary Olney": "DC Suburbs",
  "The Apothecarium - Burtonsville": "DC Suburbs",
  "Bloom - Germantown": "DC Suburbs",
  "Zen Leaf - Germantown": "DC Suburbs",
  "Zen Leaf - Elkridge": "DC Suburbs",
  "Ascend Cannabis Dispensary - Crofton": "DC Suburbs",
  "Ascend Cannabis Dispensary - Laurel": "DC Suburbs",
  "Green Point Wellness - Laurel": "DC Suburbs",
  "Revolution Releaf - Laurel": "DC Suburbs",
  "Green Point Wellness - Linthicum": "DC Suburbs",
  "Green Point Wellness - Millersville": "DC Suburbs",
  "Mana Supply Co. - Edgewater": "DC Suburbs",
  "Potomac Holistics": "DC Suburbs",
  "Mary & Main": "DC Suburbs",
  "Salvera": "DC Suburbs",
  "Trilogy Wellness": "DC Suburbs",
  "The Living Room": "DC Suburbs",
  "Positive Energy": "DC Suburbs",
  "Chesapeake Apothecary": "DC Suburbs",
  "Chesapeake Apothecary - North - Clinton": "DC Suburbs",

  // Southern Maryland
  "Story Cannabis - Waldorf": "Southern Maryland",
  "Story Cannabis - Mechanicsville": "Southern Maryland",
  "Greenwave - Solomons": "Southern Maryland",

  // Western Maryland (Frederick, Hagerstown, Westminster)
  "CULTA - Urbana (Frederick)": "Western Maryland",
  "Curaleaf - Frederick": "Western Maryland",
  "gLeaf Frederick": "Western Maryland",
  "Verilife - New Market": "Western Maryland",
  "KOAN Cannabis - Hagerstown": "Western Maryland",
  "RISE Dispensary Hagerstown": "Western Maryland",
  "Verilife - Westminster": "Western Maryland",
  "Curaleaf - Reisterstown": "Western Maryland",
  "Ascend Cannabis Dispensary - Ellicott City": "Western Maryland",
  "Grow West Cannabis Company": "Western Maryland",

  // Eastern Shore & Northern MD
  "Ascend Cannabis Dispensary - Aberdeen": "Eastern Shore & North",
  "The Apothecarium - Salisbury": "Eastern Shore & North",
  "Far & Dotter - Elkton": "Eastern Shore & North",
  "Chesacanna": "Eastern Shore & North",
  "Caroline Pharma": "Eastern Shore & North",
  "Kent Reserve": "Eastern Shore & North",
  "Hi-Tide Dispensary": "Eastern Shore & North",
};

/**
 * Get the region for a dispensary. Falls back to "Other" for unmapped dispensaries.
 */
export function getDispensaryRegion(dispensary: string): string {
  return REGION_MAP[dispensary] || "Other";
}

/**
 * Get all regions with their dispensary lists.
 */
export function getRegionDispensaryMap(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [disp, region] of Object.entries(REGION_MAP)) {
    if (!result[region]) result[region] = [];
    result[region].push(disp);
  }
  return result;
}

// ============================================================
// Catalog-Based Aggregations (works immediately, no DB needed)
// ============================================================

const CATALOG_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strainscout_catalog_v8.min_b0a7caef.json";

let catalogCache: { data: CatalogStrain[]; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchCatalog(): Promise<CatalogStrain[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CACHE_TTL) {
    return catalogCache.data;
  }

  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  const data = (await res.json()) as CatalogStrain[];
  catalogCache = { data, fetchedAt: Date.now() };
  return data;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/**
 * Get overall market overview from the live catalog.
 */
export async function getMarketOverview(): Promise<MarketOverview> {
  const catalog = await fetchCatalog();

  const allPrices: number[] = [];
  const dispensarySet = new Set<string>();
  const typeMap = new Map<string, { prices: number[]; count: number }>();

  for (const strain of catalog) {
    for (const p of strain.prices || []) {
      if (p.price > 0) {
        allPrices.push(p.price);
        dispensarySet.add(p.dispensary);

        const type = strain.type || "Unknown";
        if (!typeMap.has(type)) typeMap.set(type, { prices: [], count: 0 });
        const entry = typeMap.get(type)!;
        entry.prices.push(p.price);
      }
    }

    const type = strain.type || "Unknown";
    if (!typeMap.has(type)) typeMap.set(type, { prices: [], count: 0 });
    typeMap.get(type)!.count++;
  }

  const priceByType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    avgPrice: Math.round((data.prices.reduce((a, b) => a + b, 0) / (data.prices.length || 1)) * 100) / 100,
    count: data.count,
    minPrice: data.prices.length > 0 ? Math.min(...data.prices) : 0,
    maxPrice: data.prices.length > 0 ? Math.max(...data.prices) : 0,
  }));

  return {
    totalStrains: catalog.length,
    totalDispensaries: dispensarySet.size,
    avgPrice: Math.round((allPrices.reduce((a, b) => a + b, 0) / (allPrices.length || 1)) * 100) / 100,
    medianPrice: Math.round(median(allPrices) * 100) / 100,
    lowestPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
    highestPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
    priceByType,
    lastUpdated: catalog[0]?.catalog_updated || new Date().toISOString(),
  };
}

/**
 * Get price data broken down by Maryland region.
 */
export async function getRegionalPrices(): Promise<RegionalPriceData[]> {
  const catalog = await fetchCatalog();

  const regionData = new Map<string, { prices: number[]; dispensaries: Set<string>; strains: Set<string> }>();

  for (const strain of catalog) {
    for (const p of strain.prices || []) {
      if (p.price <= 0) continue;
      const region = getDispensaryRegion(p.dispensary);
      if (!regionData.has(region)) {
        regionData.set(region, { prices: [], dispensaries: new Set(), strains: new Set() });
      }
      const entry = regionData.get(region)!;
      entry.prices.push(p.price);
      entry.dispensaries.add(p.dispensary);
      entry.strains.add(strain.id);
    }
  }

  return Array.from(regionData.entries())
    .map(([region, data]) => ({
      region,
      avgPrice: Math.round((data.prices.reduce((a, b) => a + b, 0) / (data.prices.length || 1)) * 100) / 100,
      medianPrice: Math.round(median(data.prices) * 100) / 100,
      minPrice: Math.min(...data.prices),
      maxPrice: Math.max(...data.prices),
      dispensaryCount: data.dispensaries.size,
      strainCount: data.strains.size,
    }))
    .sort((a, b) => a.avgPrice - a.avgPrice || a.region.localeCompare(b.region));
}

/**
 * Get the top N most available strains by dispensary count.
 */
export async function getMostAvailableStrains(limit = 20): Promise<StrainAvailability[]> {
  const catalog = await fetchCatalog();

  return catalog
    .filter((s) => s.dispensary_count > 0 && s.price_avg != null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      brand: s.brand,
      type: s.type,
      dispensaryCount: s.dispensary_count,
      avgPrice: s.price_avg ?? 0,
      minPrice: s.price_min ?? 0,
      maxPrice: s.price_max ?? 0,
      priceSpread: (s.price_max ?? 0) - (s.price_min ?? 0),
    }))
    .sort((a, b) => b.dispensaryCount - a.dispensaryCount)
    .slice(0, limit);
}

/**
 * Get strains with the highest price volatility (spread across dispensaries).
 * Volatility index = (stdDev / avgPrice) * 100 — higher means more price variation.
 */
export async function getPriceVolatility(limit = 20): Promise<PriceVolatility[]> {
  const catalog = await fetchCatalog();

  const results: PriceVolatility[] = [];

  for (const strain of catalog) {
    const prices = (strain.prices || []).map((p) => p.price).filter((p) => p > 0);
    if (prices.length < 3) continue; // Need at least 3 data points for meaningful volatility

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const sd = stdDev(prices);
    const volatilityIndex = avg > 0 ? (sd / avg) * 100 : 0;

    results.push({
      strainId: strain.id,
      strainName: strain.name,
      type: strain.type,
      avgPrice: Math.round(avg * 100) / 100,
      stdDev: Math.round(sd * 100) / 100,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      priceRange: Math.round((Math.max(...prices) - Math.min(...prices)) * 100) / 100,
      volatilityIndex: Math.round(volatilityIndex * 100) / 100,
      dispensaryCount: prices.length,
    });
  }

  return results.sort((a, b) => b.volatilityIndex - a.volatilityIndex).slice(0, limit);
}

/**
 * Get brand-level market share data (by strain count and dispensary presence).
 */
export async function getBrandMarketShare(limit = 20): Promise<{
  brand: string;
  strainCount: number;
  totalListings: number;
  avgPrice: number;
  types: Record<string, number>;
}[]> {
  const catalog = await fetchCatalog();

  const brandMap = new Map<string, {
    strains: Set<string>;
    listings: number;
    prices: number[];
    types: Record<string, number>;
  }>();

  for (const strain of catalog) {
    const brand = strain.brand || "Unknown";
    if (!brandMap.has(brand)) {
      brandMap.set(brand, { strains: new Set(), listings: 0, prices: [], types: {} });
    }
    const entry = brandMap.get(brand)!;
    entry.strains.add(strain.id);
    entry.listings += strain.dispensary_count || 0;
    entry.types[strain.type] = (entry.types[strain.type] || 0) + 1;

    for (const p of strain.prices || []) {
      if (p.price > 0) entry.prices.push(p.price);
    }
  }

  return Array.from(brandMap.entries())
    .map(([brand, data]) => ({
      brand,
      strainCount: data.strains.size,
      totalListings: data.listings,
      avgPrice: Math.round((data.prices.reduce((a, b) => a + b, 0) / (data.prices.length || 1)) * 100) / 100,
      types: data.types,
    }))
    .sort((a, b) => b.strainCount - a.strainCount)
    .slice(0, limit);
}

// ============================================================
// DB-Based Historical Aggregations (grows over time)
// ============================================================

/**
 * Get price trends over time from DB snapshots.
 * Returns average price per snapshot date, optionally filtered by strain type.
 * Falls back to a single data point from the catalog if no DB data exists.
 */
export async function getPriceTrends(options?: {
  strainType?: string;
  limit?: number;
}): Promise<PriceTrend[]> {
  const db = await getDb();

  if (db) {
    try {
      const limit = options?.limit ?? 52; // ~1 year of weekly data

      let query;
      if (options?.strainType) {
        query = await db.execute(sql`
          SELECT
            snapshotDate as date,
            ROUND(AVG(price), 2) as avgPrice,
            MIN(price) as minPrice,
            MAX(price) as maxPrice,
            COUNT(DISTINCT strainId) as strainCount
          FROM price_snapshots
          WHERE strainName IN (
            SELECT DISTINCT strainName FROM price_snapshots
          )
          GROUP BY snapshotDate
          ORDER BY snapshotDate DESC
          LIMIT ${limit}
        `);
      } else {
        query = await db.execute(sql`
          SELECT
            snapshotDate as date,
            ROUND(AVG(price), 2) as avgPrice,
            MIN(price) as minPrice,
            MAX(price) as maxPrice,
            COUNT(DISTINCT strainId) as strainCount
          FROM price_snapshots
          GROUP BY snapshotDate
          ORDER BY snapshotDate DESC
          LIMIT ${limit}
        `);
      }

      const rows = (query as any)[0] as any[];
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          date: String(r.date),
          avgPrice: Number(r.avgPrice),
          minPrice: Number(r.minPrice),
          maxPrice: Number(r.maxPrice),
          strainCount: Number(r.strainCount),
        })).reverse();
      }
    } catch (err) {
      console.warn("[MarketData] DB price trends query failed:", err);
    }
  }

  // Fallback: single data point from catalog
  const overview = await getMarketOverview();
  return [{
    date: new Date().toISOString().split("T")[0],
    avgPrice: overview.avgPrice,
    minPrice: overview.lowestPrice,
    maxPrice: overview.highestPrice,
    strainCount: overview.totalStrains,
  }];
}

/**
 * Get snapshot dates available in the DB.
 */
export async function getAvailableSnapshotDates(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(sql`
      SELECT DISTINCT snapshotDate
      FROM price_snapshots
      ORDER BY snapshotDate DESC
    `);
    const rows = (result as any)[0] as any[];
    return rows.map((r: any) => String(r.snapshotDate));
  } catch {
    return [];
  }
}

/**
 * Get a full market data bundle for the dashboard.
 * Combines all aggregations into a single response to minimize round-trips.
 */
export async function getMarketDashboardData(): Promise<{
  overview: MarketOverview;
  regional: RegionalPriceData[];
  topAvailable: StrainAvailability[];
  topVolatile: PriceVolatility[];
  brandShare: Awaited<ReturnType<typeof getBrandMarketShare>>;
  priceTrends: PriceTrend[];
  snapshotDates: string[];
}> {
  const [overview, regional, topAvailable, topVolatile, brandShare, priceTrends, snapshotDates] =
    await Promise.all([
      getMarketOverview(),
      getRegionalPrices(),
      getMostAvailableStrains(20),
      getPriceVolatility(20),
      getBrandMarketShare(20),
      getPriceTrends(),
      getAvailableSnapshotDates(),
    ]);

  return {
    overview,
    regional,
    topAvailable,
    topVolatile,
    brandShare,
    priceTrends,
    snapshotDates,
  };
}
