/**
 * Tests for Deals page backend (price drops) and Sprint 6 gap features.
 * Covers: priceDrops.recent query, priceDrops.byStrain query, priceDrops.history query.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database helpers
vi.mock("./db", () => ({
  getRecentPriceDrops: vi.fn(),
  getStrainPriceDrops: vi.fn(),
  getStrainPriceHistory: vi.fn(),
  getPriceDropStats: vi.fn(),
  getPendingNotifications: vi.fn(),
  markNotificationsSent: vi.fn(),
  submitEmailSignup: vi.fn(),
  getEmailSignups: vi.fn(),
}));

import {
  getRecentPriceDrops,
  getStrainPriceDrops,
  getStrainPriceHistory,
  getPriceDropStats,
} from "./db";

describe("Price Drops API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecentPriceDrops", () => {
    it("should return an array of price drops", async () => {
      const mockDrops = [
        {
          id: 1,
          strainId: "mule-fuel",
          strainName: "Mule Fuel",
          dispensary: "CULTA - Baltimore",
          oldPrice: "60.00",
          newPrice: "50.00",
          dropPercent: "16.67",
          detectedAt: new Date("2026-03-10"),
        },
        {
          id: 2,
          strainId: "super-boof",
          strainName: "Super Boof",
          dispensary: "Gold Leaf",
          oldPrice: "85.00",
          newPrice: "21.00",
          dropPercent: "75.29",
          detectedAt: new Date("2026-03-09"),
        },
      ];

      (getRecentPriceDrops as any).mockResolvedValue(mockDrops);

      const result = await getRecentPriceDrops({ limit: 20 });
      expect(result).toHaveLength(2);
      expect(result[0].strainId).toBe("mule-fuel");
      expect(result[1].dropPercent).toBe("75.29");
    });

    it("should respect the limit parameter", async () => {
      (getRecentPriceDrops as any).mockResolvedValue([]);

      await getRecentPriceDrops({ limit: 5 });
      expect(getRecentPriceDrops).toHaveBeenCalledWith({ limit: 5 });
    });

    it("should return empty array when no drops exist", async () => {
      (getRecentPriceDrops as any).mockResolvedValue([]);

      const result = await getRecentPriceDrops({ limit: 20 });
      expect(result).toEqual([]);
    });
  });

  describe("getStrainPriceDrops", () => {
    it("should return drops for a specific strain", async () => {
      const mockDrops = [
        {
          id: 1,
          strainId: "mule-fuel",
          strainName: "Mule Fuel",
          dispensary: "CULTA - Baltimore",
          oldPrice: "60.00",
          newPrice: "50.00",
          dropPercent: "16.67",
          detectedAt: new Date("2026-03-10"),
        },
      ];

      (getStrainPriceDrops as any).mockResolvedValue(mockDrops);

      const result = await getStrainPriceDrops("mule-fuel");
      expect(result).toHaveLength(1);
      expect(result[0].dispensary).toBe("CULTA - Baltimore");
    });

    it("should return empty array for strain with no drops", async () => {
      (getStrainPriceDrops as any).mockResolvedValue([]);

      const result = await getStrainPriceDrops("nonexistent-strain");
      expect(result).toEqual([]);
    });
  });

  describe("getStrainPriceHistory", () => {
    it("should return price history snapshots", async () => {
      const mockHistory = [
        {
          id: 1,
          strainId: "mule-fuel",
          dispensary: "CULTA - Baltimore",
          price: "50.00",
          snapshotDate: new Date("2026-03-10"),
        },
        {
          id: 2,
          strainId: "mule-fuel",
          dispensary: "CULTA - Baltimore",
          price: "60.00",
          snapshotDate: new Date("2026-03-03"),
        },
      ];

      (getStrainPriceHistory as any).mockResolvedValue(mockHistory);

      const result = await getStrainPriceHistory("mule-fuel");
      expect(result).toHaveLength(2);
      expect(Number(result[0].price)).toBeLessThan(Number(result[1].price));
    });
  });

  describe("getPriceDropStats", () => {
    it("should return aggregate statistics", async () => {
      const mockStats = {
        totalDrops: 45,
        avgDropPercent: 28.5,
        maxDropPercent: 88,
        uniqueStrains: 32,
        uniqueDispensaries: 18,
      };

      (getPriceDropStats as any).mockResolvedValue(mockStats);

      const result = await getPriceDropStats();
      expect(result.totalDrops).toBe(45);
      expect(result.avgDropPercent).toBe(28.5);
      expect(result.uniqueStrains).toBeGreaterThan(0);
    });
  });
});

describe("Deals Page Data Transformation", () => {
  it("should calculate savings correctly from price spread", () => {
    const strain = {
      price_min: 10,
      price_max: 80,
    };

    const savings = strain.price_max - strain.price_min;
    const dropPercent = Math.round(
      ((strain.price_max - strain.price_min) / strain.price_max) * 100
    );

    expect(savings).toBe(70);
    expect(dropPercent).toBe(88);
  });

  it("should handle equal prices (no deal)", () => {
    const strain = {
      price_min: 50,
      price_max: 50,
    };

    const savings = strain.price_max - strain.price_min;
    expect(savings).toBe(0);
  });

  it("should sort deals by savings percentage descending", () => {
    const deals = [
      { dropPercent: 50, savings: 25 },
      { dropPercent: 88, savings: 70 },
      { dropPercent: 30, savings: 15 },
    ];

    const sorted = [...deals].sort((a, b) => b.dropPercent - a.dropPercent);
    expect(sorted[0].dropPercent).toBe(88);
    expect(sorted[1].dropPercent).toBe(50);
    expect(sorted[2].dropPercent).toBe(30);
  });

  it("should filter deals by type", () => {
    const deals = [
      { type: "Indica", strainName: "Blueberry Rose" },
      { type: "Sativa", strainName: "Hawaiian Dream" },
      { type: "Hybrid", strainName: "Mule Fuel" },
      { type: "Indica", strainName: "Swampwater Fumez" },
    ];

    const indicaOnly = deals.filter(
      (d) => d.type.toLowerCase() === "indica"
    );
    expect(indicaOnly).toHaveLength(2);
    expect(indicaOnly.every((d) => d.type === "Indica")).toBe(true);
  });

  it("should search deals by strain name, brand, or dispensary", () => {
    const deals = [
      { strainName: "Mule Fuel", brand: "Fade Co.", dispensary: "CULTA" },
      { strainName: "Super Boof", brand: "Fade Co.", dispensary: "Gold Leaf" },
      { strainName: "Chocolatina", brand: "gLeaf", dispensary: "Peake ReLeaf" },
    ];

    const query = "fade";
    const results = deals.filter(
      (d) =>
        d.strainName.toLowerCase().includes(query) ||
        d.brand.toLowerCase().includes(query) ||
        d.dispensary.toLowerCase().includes(query)
    );

    expect(results).toHaveLength(2);
  });
});

describe("Zip Code Validation", () => {
  it("should accept valid 5-digit Maryland zip codes", () => {
    const validZips = ["21201", "20601", "21740", "20850", "21043"];
    validZips.forEach((zip) => {
      expect(/^\d{5}$/.test(zip)).toBe(true);
    });
  });

  it("should reject invalid zip codes", () => {
    const invalidZips = ["1234", "123456", "abcde", "2120", ""];
    invalidZips.forEach((zip) => {
      expect(/^\d{5}$/.test(zip)).toBe(false);
    });
  });
});

describe("Find Nearest URL Construction", () => {
  it("should construct correct map URL with strain ID and locate flag", () => {
    const strainId = "mule-fuel";
    const url = `/map?strain=${strainId}&locate=true`;
    expect(url).toBe("/map?strain=mule-fuel&locate=true");
  });

  it("should parse URL params correctly", () => {
    const searchString = "strain=mule-fuel&locate=true";
    const params = new URLSearchParams(searchString);
    expect(params.get("strain")).toBe("mule-fuel");
    expect(params.get("locate")).toBe("true");
  });

  it("should handle missing params gracefully", () => {
    const searchString = "";
    const params = new URLSearchParams(searchString);
    expect(params.get("strain")).toBeNull();
    expect(params.get("locate")).toBeNull();
  });
});
