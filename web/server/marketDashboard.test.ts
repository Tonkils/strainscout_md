/**
 * Sprint 10: Market Dashboard tests
 * Tests the market data aggregation functions and tRPC endpoints.
 *
 * Key insight: getDispensaryRegion maps by full dispensary NAME (not city),
 * and the catalog returns strains with a `prices` array of { dispensary, price }.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock catalog data matching the real CatalogStrain shape ─────
const mockStrains = [
  {
    id: "blue-dream",
    name: "Blue Dream",
    brand: "BrandA",
    type: "Hybrid",
    thc: 21,
    prices: [
      { dispensary: "CULTA - Baltimore", price: 30 },
      { dispensary: "Curaleaf - Columbia", price: 60 },
    ],
    price_min: 30,
    price_max: 60,
    price_avg: 45,
    dispensary_count: 2,
    catalog_updated: "2026-03-15",
  },
  {
    id: "og-kush",
    name: "OG Kush",
    brand: "BrandB",
    type: "Indica",
    thc: 23,
    prices: [
      { dispensary: "CULTA - Urbana (Frederick)", price: 40 },
      { dispensary: "Chesacanna", price: 55 },
      { dispensary: "Gold Leaf", price: 70 },
    ],
    price_min: 40,
    price_max: 70,
    price_avg: 55,
    dispensary_count: 3,
    catalog_updated: "2026-03-15",
  },
  {
    id: "sour-diesel",
    name: "Sour Diesel",
    brand: "BrandA",
    type: "Sativa",
    thc: 25,
    prices: [
      { dispensary: "Gold Leaf", price: 35 },
      { dispensary: "Hi-Tide Dispensary", price: 80 },
      { dispensary: "Story Cannabis - Waldorf", price: 50 },
    ],
    price_min: 35,
    price_max: 80,
    price_avg: 55,
    dispensary_count: 3,
    catalog_updated: "2026-03-15",
  },
];

// Mock fetch — the catalog is a flat array of CatalogStrain
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockStrains),
}));

// ─── Tests ───────────────────────────────────────────────────

describe("Market Data Aggregation Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-stub fetch for each test since clearAllMocks resets it
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStrains),
    });
  });

  describe("getDispensaryRegion", () => {
    it("should map known dispensary names to correct regions", async () => {
      const { getDispensaryRegion } = await import("./marketData");

      expect(getDispensaryRegion("CULTA - Baltimore")).toBe("Baltimore Metro");
      expect(getDispensaryRegion("Curaleaf - Columbia")).toBe("DC Suburbs");
      expect(getDispensaryRegion("CULTA - Urbana (Frederick)")).toBe("Western Maryland");
      expect(getDispensaryRegion("Chesacanna")).toBe("Eastern Shore & North");
      expect(getDispensaryRegion("Story Cannabis - Waldorf")).toBe("Southern Maryland");
    });

    it("should return 'Other' for unknown dispensary names", async () => {
      const { getDispensaryRegion } = await import("./marketData");

      expect(getDispensaryRegion("Unknown Dispensary")).toBe("Other");
      expect(getDispensaryRegion("")).toBe("Other");
    });
  });

  describe("getRegionDispensaryMap", () => {
    it("should return a map of regions to dispensary arrays", async () => {
      const { getRegionDispensaryMap } = await import("./marketData");
      const map = getRegionDispensaryMap();

      expect(map).toBeDefined();
      expect(map["Baltimore Metro"]).toBeDefined();
      expect(map["DC Suburbs"]).toBeDefined();
      expect(map["Western Maryland"]).toBeDefined();
      expect(map["Eastern Shore & North"]).toBeDefined();
      expect(map["Southern Maryland"]).toBeDefined();
      expect(Array.isArray(map["Baltimore Metro"])).toBe(true);
      expect(map["Baltimore Metro"].length).toBeGreaterThan(0);
    });
  });

  describe("getMarketOverview", () => {
    it("should compute correct totals from catalog data", async () => {
      const { getMarketOverview } = await import("./marketData");
      const overview = await getMarketOverview();

      expect(overview).toBeDefined();
      expect(overview.totalStrains).toBe(3);
      expect(overview.avgPrice).toBeGreaterThan(0);
      expect(overview.lowestPrice).toBe(30);
      expect(overview.highestPrice).toBe(80);
    });

    it("should include priceByType with correct type counts", async () => {
      const { getMarketOverview } = await import("./marketData");
      const overview = await getMarketOverview();

      expect(overview.priceByType).toBeDefined();
      expect(Array.isArray(overview.priceByType)).toBe(true);
      expect(overview.priceByType.length).toBe(3); // Hybrid, Indica, Sativa

      const hybrid = overview.priceByType.find((t) => t.type === "Hybrid");
      expect(hybrid).toBeDefined();
      expect(hybrid!.count).toBe(1);
    });

    it("should count unique dispensaries correctly", async () => {
      const { getMarketOverview } = await import("./marketData");
      const overview = await getMarketOverview();

      // 7 unique dispensary names in our mock data:
      // CULTA - Baltimore, Curaleaf - Columbia, CULTA - Urbana (Frederick),
      // Chesacanna, Gold Leaf, Hi-Tide Dispensary, Story Cannabis - Waldorf
      expect(overview.totalDispensaries).toBe(7);
    });
  });

  describe("getRegionalPrices", () => {
    it("should return regional data with dispensary counts", async () => {
      const { getRegionalPrices } = await import("./marketData");
      const regional = await getRegionalPrices();

      expect(regional).toBeDefined();
      expect(Array.isArray(regional)).toBe(true);
      expect(regional.length).toBeGreaterThan(0);

      for (const region of regional) {
        expect(region).toHaveProperty("region");
        expect(region).toHaveProperty("avgPrice");
        expect(region).toHaveProperty("dispensaryCount");
        expect(region).toHaveProperty("strainCount");
        expect(region.avgPrice).toBeGreaterThan(0);
      }
    });

    it("should map CULTA - Baltimore to Baltimore Metro region", async () => {
      const { getRegionalPrices } = await import("./marketData");
      const regional = await getRegionalPrices();

      const baltimore = regional.find((r) => r.region === "Baltimore Metro");
      expect(baltimore).toBeDefined();
      expect(baltimore!.dispensaryCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getMostAvailableStrains", () => {
    it("should return strains sorted by dispensary count descending", async () => {
      const { getMostAvailableStrains } = await import("./marketData");
      const top = await getMostAvailableStrains(10);

      expect(top).toBeDefined();
      expect(Array.isArray(top)).toBe(true);
      expect(top.length).toBeLessThanOrEqual(10);

      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].dispensaryCount).toBeGreaterThanOrEqual(top[i].dispensaryCount);
      }
    });

    it("should include strain name, brand, type, and price data", async () => {
      const { getMostAvailableStrains } = await import("./marketData");
      const top = await getMostAvailableStrains(3);

      expect(top[0]).toHaveProperty("id");
      expect(top[0]).toHaveProperty("name");
      expect(top[0]).toHaveProperty("brand");
      expect(top[0]).toHaveProperty("type");
      expect(top[0]).toHaveProperty("avgPrice");
      expect(top[0]).toHaveProperty("dispensaryCount");
    });

    it("should respect the limit parameter", async () => {
      const { getMostAvailableStrains } = await import("./marketData");
      const top = await getMostAvailableStrains(2);

      expect(top.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getPriceVolatility", () => {
    it("should return strains with volatility metrics (min 3 prices)", async () => {
      const { getPriceVolatility } = await import("./marketData");
      const volatility = await getPriceVolatility(10);

      expect(volatility).toBeDefined();
      expect(Array.isArray(volatility)).toBe(true);

      // Only OG Kush and Sour Diesel have 3+ prices in our mock
      expect(volatility.length).toBe(2);

      for (const strain of volatility) {
        expect(strain).toHaveProperty("strainId");
        expect(strain).toHaveProperty("strainName");
        expect(strain).toHaveProperty("volatilityIndex");
        expect(strain).toHaveProperty("avgPrice");
        expect(strain.volatilityIndex).toBeGreaterThanOrEqual(0);
        expect(strain.dispensaryCount).toBeGreaterThanOrEqual(3);
      }
    });

    it("should sort by volatility index descending", async () => {
      const { getPriceVolatility } = await import("./marketData");
      const volatility = await getPriceVolatility(10);

      for (let i = 1; i < volatility.length; i++) {
        expect(volatility[i - 1].volatilityIndex).toBeGreaterThanOrEqual(
          volatility[i].volatilityIndex
        );
      }
    });
  });

  describe("getBrandMarketShare", () => {
    it("should return brands with strain counts and listing counts", async () => {
      const { getBrandMarketShare } = await import("./marketData");
      const brands = await getBrandMarketShare(10);

      expect(brands).toBeDefined();
      expect(Array.isArray(brands)).toBe(true);

      for (const brand of brands) {
        expect(brand).toHaveProperty("brand");
        expect(brand).toHaveProperty("strainCount");
        expect(brand).toHaveProperty("totalListings");
        expect(brand).toHaveProperty("avgPrice");
        expect(brand.strainCount).toBeGreaterThan(0);
      }
    });

    it("should have BrandA with 2 strains (Blue Dream + Sour Diesel)", async () => {
      const { getBrandMarketShare } = await import("./marketData");
      const brands = await getBrandMarketShare(10);

      const brandA = brands.find((b) => b.brand === "BrandA");
      expect(brandA).toBeDefined();
      expect(brandA!.strainCount).toBe(2);
    });

    it("should sort by strain count descending", async () => {
      const { getBrandMarketShare } = await import("./marketData");
      const brands = await getBrandMarketShare(10);

      for (let i = 1; i < brands.length; i++) {
        expect(brands[i - 1].strainCount).toBeGreaterThanOrEqual(brands[i].strainCount);
      }
    });
  });

  describe("getMarketDashboardData", () => {
    it("should return a bundle with all market data sections", async () => {
      const { getMarketDashboardData } = await import("./marketData");
      const dashboard = await getMarketDashboardData();

      expect(dashboard).toBeDefined();
      expect(dashboard).toHaveProperty("overview");
      expect(dashboard).toHaveProperty("regional");
      expect(dashboard).toHaveProperty("topAvailable");
      expect(dashboard).toHaveProperty("topVolatile");
      expect(dashboard).toHaveProperty("brandShare");
      expect(dashboard).toHaveProperty("priceTrends");
    });

    it("should have consistent data across sections", async () => {
      const { getMarketDashboardData } = await import("./marketData");
      const dashboard = await getMarketDashboardData();

      expect(dashboard.overview.totalStrains).toBe(3);
      expect(dashboard.topAvailable.length).toBeLessThanOrEqual(20);
      expect(dashboard.brandShare.length).toBeGreaterThan(0);
    });
  });
});
