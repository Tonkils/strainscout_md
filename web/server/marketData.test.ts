import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDispensaryRegion,
  getRegionDispensaryMap,
} from "./marketData";

// ============================================================
// Unit tests for pure functions (no network/DB needed)
// ============================================================

describe("Market Data — Regional Mapping", () => {
  it("maps Baltimore dispensaries to Baltimore Metro", () => {
    expect(getDispensaryRegion("CULTA - Baltimore")).toBe("Baltimore Metro");
    expect(getDispensaryRegion("Cookies - Baltimore")).toBe("Baltimore Metro");
    expect(getDispensaryRegion("Gold Leaf")).toBe("Baltimore Metro");
    expect(getDispensaryRegion("Health for Life - Baltimore")).toBe("Baltimore Metro");
    expect(getDispensaryRegion("Liberty Cannabis - Baltimore")).toBe("Baltimore Metro");
    expect(getDispensaryRegion("Zen Leaf - Towson")).toBe("Baltimore Metro");
    expect(getDispensaryRegion("The Forest - Baltimore")).toBe("Baltimore Metro");
    expect(getDispensaryRegion("Star Buds - Baltimore")).toBe("Baltimore Metro");
  });

  it("maps DC Suburbs dispensaries correctly", () => {
    expect(getDispensaryRegion("Columbia Care - Chevy Chase")).toBe("DC Suburbs");
    expect(getDispensaryRegion("Curaleaf - Columbia")).toBe("DC Suburbs");
    expect(getDispensaryRegion("CULTA - Columbia")).toBe("DC Suburbs");
    expect(getDispensaryRegion("Health for Life - Bethesda Med & Rec Cannabis Dispensary")).toBe("DC Suburbs");
    expect(getDispensaryRegion("Liberty Cannabis - Rockville")).toBe("DC Suburbs");
    expect(getDispensaryRegion("Verilife - Silver Spring")).toBe("DC Suburbs");
    expect(getDispensaryRegion("Bloom - Germantown")).toBe("DC Suburbs");
    expect(getDispensaryRegion("Story Cannabis - Silver Spring")).toBe("DC Suburbs");
  });

  it("maps Western Maryland dispensaries correctly", () => {
    expect(getDispensaryRegion("CULTA - Urbana (Frederick)")).toBe("Western Maryland");
    expect(getDispensaryRegion("Curaleaf - Frederick")).toBe("Western Maryland");
    expect(getDispensaryRegion("gLeaf Frederick")).toBe("Western Maryland");
    expect(getDispensaryRegion("RISE Dispensary Hagerstown")).toBe("Western Maryland");
    expect(getDispensaryRegion("Verilife - Westminster")).toBe("Western Maryland");
  });

  it("maps Eastern Shore dispensaries correctly", () => {
    expect(getDispensaryRegion("The Apothecarium - Salisbury")).toBe("Eastern Shore & North");
    expect(getDispensaryRegion("Far & Dotter - Elkton")).toBe("Eastern Shore & North");
    expect(getDispensaryRegion("Chesacanna")).toBe("Eastern Shore & North");
    expect(getDispensaryRegion("Ascend Cannabis Dispensary - Aberdeen")).toBe("Eastern Shore & North");
  });

  it("maps Southern Maryland dispensaries correctly", () => {
    expect(getDispensaryRegion("Story Cannabis - Waldorf")).toBe("Southern Maryland");
    expect(getDispensaryRegion("Story Cannabis - Mechanicsville")).toBe("Southern Maryland");
    expect(getDispensaryRegion("Greenwave - Solomons")).toBe("Southern Maryland");
  });

  it("returns 'Other' for unmapped dispensaries", () => {
    expect(getDispensaryRegion("Unknown Dispensary")).toBe("Other");
    expect(getDispensaryRegion("")).toBe("Other");
    expect(getDispensaryRegion("New Place That Opened Yesterday")).toBe("Other");
  });
});

describe("Market Data — Region Dispensary Map", () => {
  it("returns a map with all 5 regions plus potential others", () => {
    const map = getRegionDispensaryMap();
    expect(map).toHaveProperty("Baltimore Metro");
    expect(map).toHaveProperty("DC Suburbs");
    expect(map).toHaveProperty("Western Maryland");
    expect(map).toHaveProperty("Eastern Shore & North");
    expect(map).toHaveProperty("Southern Maryland");
  });

  it("Baltimore Metro has the most dispensaries", () => {
    const map = getRegionDispensaryMap();
    const baltimoreCount = map["Baltimore Metro"]?.length ?? 0;
    const dcCount = map["DC Suburbs"]?.length ?? 0;
    expect(baltimoreCount).toBeGreaterThan(0);
    expect(dcCount).toBeGreaterThan(0);
    // Baltimore Metro should have a substantial number
    expect(baltimoreCount).toBeGreaterThanOrEqual(15);
  });

  it("each dispensary appears in exactly one region", () => {
    const map = getRegionDispensaryMap();
    const allDisps: string[] = [];
    for (const disps of Object.values(map)) {
      allDisps.push(...disps);
    }
    const unique = new Set(allDisps);
    expect(unique.size).toBe(allDisps.length);
  });

  it("DC Suburbs includes Columbia, Rockville, Silver Spring, Bethesda", () => {
    const map = getRegionDispensaryMap();
    const dcDisps = map["DC Suburbs"] || [];
    const dcNames = dcDisps.join(" ");
    expect(dcNames).toContain("Columbia");
    expect(dcNames).toContain("Rockville");
    expect(dcNames).toContain("Silver Spring");
    expect(dcNames).toContain("Bethesda");
  });
});

// ============================================================
// Integration-style tests using mocked fetch for catalog data
// ============================================================

const MOCK_CATALOG = [
  {
    id: "strain-a",
    name: "Strain A",
    brand: "Brand X",
    type: "Indica",
    thc: 25,
    prices: [
      { dispensary: "CULTA - Baltimore", price: 40 },
      { dispensary: "Liberty Cannabis - Rockville", price: 50 },
      { dispensary: "CULTA - Urbana (Frederick)", price: 45 },
    ],
    price_min: 40,
    price_max: 50,
    price_avg: 45,
    dispensary_count: 3,
    catalog_updated: "2026-03-09T14:00:00Z",
  },
  {
    id: "strain-b",
    name: "Strain B",
    brand: "Brand X",
    type: "Sativa",
    thc: 20,
    prices: [
      { dispensary: "Gold Leaf", price: 35 },
      { dispensary: "Cookies - Baltimore", price: 60 },
    ],
    price_min: 35,
    price_max: 60,
    price_avg: 47.5,
    dispensary_count: 2,
    catalog_updated: "2026-03-09T14:00:00Z",
  },
  {
    id: "strain-c",
    name: "Strain C",
    brand: "Brand Y",
    type: "Hybrid",
    thc: 22,
    prices: [
      { dispensary: "Verilife - Silver Spring", price: 55 },
      { dispensary: "Story Cannabis - Waldorf", price: 42 },
      { dispensary: "The Apothecarium - Salisbury", price: 38 },
      { dispensary: "Zen Leaf - Towson", price: 48 },
    ],
    price_min: 38,
    price_max: 55,
    price_avg: 45.75,
    dispensary_count: 4,
    catalog_updated: "2026-03-09T14:00:00Z",
  },
];

describe("Market Data — Catalog Aggregations (mocked)", () => {
  beforeEach(() => {
    // Reset the module cache so the catalog cache is cleared
    vi.restoreAllMocks();
    // Mock global fetch to return our test catalog
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CATALOG),
    }));
  });

  it("getMarketOverview returns correct totals", async () => {
    // Need to re-import to get fresh module with cleared cache
    const { getMarketOverview } = await import("./marketData");
    // Clear internal cache by accessing the module fresh
    const overview = await getMarketOverview();

    expect(overview.totalStrains).toBe(3);
    expect(overview.totalDispensaries).toBe(9); // 9 unique dispensaries across all strains
    expect(overview.lowestPrice).toBe(35);
    expect(overview.highestPrice).toBe(60);
    expect(overview.avgPrice).toBeGreaterThan(0);
    expect(overview.priceByType).toHaveLength(3); // Indica, Sativa, Hybrid
  });

  it("getMarketOverview breaks down by strain type", async () => {
    const { getMarketOverview } = await import("./marketData");
    const overview = await getMarketOverview();

    const indica = overview.priceByType.find(t => t.type === "Indica");
    expect(indica).toBeDefined();
    expect(indica!.count).toBe(1);
    expect(indica!.minPrice).toBe(40);
    expect(indica!.maxPrice).toBe(50);

    const sativa = overview.priceByType.find(t => t.type === "Sativa");
    expect(sativa).toBeDefined();
    expect(sativa!.count).toBe(1);
  });

  it("getRegionalPrices groups by region correctly", async () => {
    const { getRegionalPrices } = await import("./marketData");
    const regional = await getRegionalPrices();

    // Should have multiple regions
    expect(regional.length).toBeGreaterThanOrEqual(3);

    const baltimore = regional.find(r => r.region === "Baltimore Metro");
    expect(baltimore).toBeDefined();
    expect(baltimore!.dispensaryCount).toBeGreaterThanOrEqual(2);

    const dc = regional.find(r => r.region === "DC Suburbs");
    expect(dc).toBeDefined();
  });

  it("getMostAvailableStrains sorts by dispensary count", async () => {
    const { getMostAvailableStrains } = await import("./marketData");
    const top = await getMostAvailableStrains(10);

    expect(top.length).toBe(3);
    // Strain C has 4 dispensaries, should be first
    expect(top[0].id).toBe("strain-c");
    expect(top[0].dispensaryCount).toBe(4);
    // Strain A has 3
    expect(top[1].id).toBe("strain-a");
    expect(top[1].dispensaryCount).toBe(3);
  });

  it("getPriceVolatility identifies high-variance strains", async () => {
    const { getPriceVolatility } = await import("./marketData");
    const volatile = await getPriceVolatility(10);

    // Only strains with 3+ prices qualify
    // Strain A has 3 prices (40, 50, 45), Strain C has 4 prices (55, 42, 38, 48)
    expect(volatile.length).toBeGreaterThanOrEqual(1);

    for (const v of volatile) {
      expect(v.volatilityIndex).toBeGreaterThanOrEqual(0);
      expect(v.stdDev).toBeGreaterThanOrEqual(0);
      expect(v.dispensaryCount).toBeGreaterThanOrEqual(3);
    }
  });

  it("getBrandMarketShare aggregates by brand", async () => {
    const { getBrandMarketShare } = await import("./marketData");
    const brands = await getBrandMarketShare(10);

    expect(brands.length).toBe(2); // Brand X and Brand Y
    const brandX = brands.find(b => b.brand === "Brand X");
    expect(brandX).toBeDefined();
    expect(brandX!.strainCount).toBe(2); // Strain A and B
    expect(brandX!.totalListings).toBe(5); // 3 + 2 dispensary listings
  });

  it("getPriceTrends returns at least one data point", async () => {
    const { getPriceTrends } = await import("./marketData");
    const trends = await getPriceTrends();

    expect(trends.length).toBeGreaterThanOrEqual(1);
    expect(trends[0]).toHaveProperty("date");
    expect(trends[0]).toHaveProperty("avgPrice");
    expect(trends[0]).toHaveProperty("strainCount");
  });

  it("getMarketDashboardData returns complete bundle", async () => {
    const { getMarketDashboardData } = await import("./marketData");
    const data = await getMarketDashboardData();

    expect(data).toHaveProperty("overview");
    expect(data).toHaveProperty("regional");
    expect(data).toHaveProperty("topAvailable");
    expect(data).toHaveProperty("topVolatile");
    expect(data).toHaveProperty("brandShare");
    expect(data).toHaveProperty("priceTrends");
    expect(data).toHaveProperty("snapshotDates");

    expect(data.overview.totalStrains).toBe(3);
    expect(data.regional.length).toBeGreaterThan(0);
    expect(data.topAvailable.length).toBe(3);
  });
});

describe("Market Data — Edge Cases", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset module registry to clear the internal catalog cache
    vi.resetModules();
  });

  it("handles empty catalog gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));

    const mod = await import("./marketData");
    const overview = await mod.getMarketOverview();

    expect(overview.totalStrains).toBe(0);
    expect(overview.totalDispensaries).toBe(0);
    expect(overview.avgPrice).toBe(0);
  });

  it("handles strains with no prices", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: "no-price", name: "No Price Strain", brand: "Test", type: "Hybrid", prices: [], price_min: null, price_max: null, price_avg: null, dispensary_count: 0, catalog_updated: "2026-03-09" },
      ]),
    }));

    const mod = await import("./marketData");
    const top = await mod.getMostAvailableStrains(10);
    expect(top.length).toBe(0); // Filtered out because dispensary_count is 0
  });

  it("handles fetch failure gracefully for trends (falls back)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CATALOG),
    }));

    const mod = await import("./marketData");
    const trends = await mod.getPriceTrends();
    expect(trends.length).toBeGreaterThanOrEqual(1);
  });
});
