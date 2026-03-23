/**
 * Sprint 11 — Dispensary Comparison Tool Tests
 * Tests the comparison logic: shared strain detection, winner calculation,
 * exclusive strain identification, and price savings computation.
 */
import { describe, it, expect } from "vitest";

/* ── Mock catalog data ── */
const mockStrains = [
  {
    id: "strain-1",
    name: "Blue Dream",
    brand: "Brand A",
    type: "Hybrid",
    prices: [
      { dispensary: "Dispensary Alpha", price: 45 },
      { dispensary: "Dispensary Beta", price: 50 },
      { dispensary: "Dispensary Gamma", price: 42 },
    ],
  },
  {
    id: "strain-2",
    name: "OG Kush",
    brand: "Brand B",
    type: "Indica",
    prices: [
      { dispensary: "Dispensary Alpha", price: 55 },
      { dispensary: "Dispensary Beta", price: 60 },
    ],
  },
  {
    id: "strain-3",
    name: "Sour Diesel",
    brand: "Brand C",
    type: "Sativa",
    prices: [
      { dispensary: "Dispensary Alpha", price: 40 },
    ],
  },
  {
    id: "strain-4",
    name: "Girl Scout Cookies",
    brand: "Brand D",
    type: "Hybrid",
    prices: [
      { dispensary: "Dispensary Beta", price: 65 },
      { dispensary: "Dispensary Gamma", price: 58 },
    ],
  },
  {
    id: "strain-5",
    name: "Jack Herer",
    brand: "Brand E",
    type: "Sativa",
    prices: [
      { dispensary: "Dispensary Gamma", price: 48 },
    ],
  },
];

/* ── Helper functions that mirror the page logic ── */

interface StrainEntry {
  id: string;
  name: string;
  brand: string;
  type: string;
  price: number;
}

interface DispensaryStats {
  name: string;
  strainCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  strains: StrainEntry[];
}

function computeDispensaryStats(dispensaryName: string): DispensaryStats {
  const strains: StrainEntry[] = [];
  for (const s of mockStrains) {
    const priceEntry = s.prices.find(
      (p) => p.dispensary.toLowerCase() === dispensaryName.toLowerCase()
    );
    if (priceEntry && priceEntry.price > 0) {
      strains.push({
        id: s.id,
        name: s.name,
        brand: s.brand,
        type: s.type,
        price: priceEntry.price,
      });
    }
  }
  const prices = strains.map((s) => s.price).sort((a, b) => a - b);
  return {
    name: dispensaryName,
    strainCount: strains.length,
    avgPrice: prices.length > 0
      ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
      : 0,
    minPrice: prices.length > 0 ? prices[0] : 0,
    maxPrice: prices.length > 0 ? prices[prices.length - 1] : 0,
    strains,
  };
}

interface SharedStrain {
  id: string;
  name: string;
  prices: (number | null)[];
  bestIndex: number;
  savings: number;
}

function findSharedStrains(stats: DispensaryStats[]): SharedStrain[] {
  const strainMap = new Map<string, { name: string; prices: (number | null)[] }>();

  stats.forEach((ds, i) => {
    for (const s of ds.strains) {
      let entry = strainMap.get(s.id);
      if (!entry) {
        entry = { name: s.name, prices: new Array(stats.length).fill(null) };
        strainMap.set(s.id, entry);
      }
      entry.prices[i] = s.price;
    }
  });

  const shared: SharedStrain[] = [];
  for (const [id, entry] of Array.from(strainMap)) {
    const availableCount = entry.prices.filter((p: number | null) => p !== null).length;
    if (availableCount >= 2) {
      const validPrices = entry.prices.filter((p: number | null): p is number => p !== null);
      const bestPrice = Math.min(...validPrices);
      const worstPrice = Math.max(...validPrices);
      const bestIndex = entry.prices.indexOf(bestPrice);
      shared.push({
        id,
        name: entry.name,
        prices: entry.prices,
        bestIndex,
        savings: Math.round((worstPrice - bestPrice) * 100) / 100,
      });
    }
  }
  return shared;
}

function findExclusiveStrains(stats: DispensaryStats[], index: number): StrainEntry[] {
  return stats[index].strains.filter((s) => {
    return !stats.some(
      (other, j) => j !== index && other.strains.some((os) => os.id === s.id)
    );
  });
}

/* ── Tests ── */

describe("Dispensary Comparison — Stats Computation", () => {
  it("computes correct strain count for each dispensary", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const gamma = computeDispensaryStats("Dispensary Gamma");

    expect(alpha.strainCount).toBe(3); // Blue Dream, OG Kush, Sour Diesel
    expect(beta.strainCount).toBe(3);  // Blue Dream, OG Kush, Girl Scout Cookies
    expect(gamma.strainCount).toBe(3); // Blue Dream, Girl Scout Cookies, Jack Herer
  });

  it("computes correct average price", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    // (45 + 55 + 40) / 3 = 46.67
    expect(alpha.avgPrice).toBeCloseTo(46.67, 1);
  });

  it("computes correct min and max price", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    expect(alpha.minPrice).toBe(40);
    expect(alpha.maxPrice).toBe(55);
  });

  it("returns zero stats for non-existent dispensary", () => {
    const unknown = computeDispensaryStats("Nonexistent Dispensary");
    expect(unknown.strainCount).toBe(0);
    expect(unknown.avgPrice).toBe(0);
    expect(unknown.minPrice).toBe(0);
    expect(unknown.maxPrice).toBe(0);
  });

  it("handles case-insensitive dispensary name matching", () => {
    const alpha = computeDispensaryStats("dispensary alpha");
    expect(alpha.strainCount).toBe(3);
  });
});

describe("Dispensary Comparison — Shared Strains", () => {
  it("finds shared strains between two dispensaries", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const shared = findSharedStrains([alpha, beta]);

    expect(shared.length).toBe(2); // Blue Dream and OG Kush
    const names = shared.map((s) => s.name).sort();
    expect(names).toEqual(["Blue Dream", "OG Kush"]);
  });

  it("correctly identifies the best price index", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const shared = findSharedStrains([alpha, beta]);

    const blueDream = shared.find((s) => s.name === "Blue Dream")!;
    expect(blueDream.bestIndex).toBe(0); // Alpha has $45 vs Beta $50
    expect(blueDream.savings).toBe(5);
  });

  it("calculates correct savings", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const shared = findSharedStrains([alpha, beta]);

    const ogKush = shared.find((s) => s.name === "OG Kush")!;
    expect(ogKush.savings).toBe(5); // $60 - $55
  });

  it("handles three-way comparison", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const gamma = computeDispensaryStats("Dispensary Gamma");
    const shared = findSharedStrains([alpha, beta, gamma]);

    // Blue Dream is at all 3 dispensaries
    const blueDream = shared.find((s) => s.name === "Blue Dream")!;
    expect(blueDream.prices).toEqual([45, 50, 42]);
    expect(blueDream.bestIndex).toBe(2); // Gamma has $42
    expect(blueDream.savings).toBe(8); // $50 - $42
  });

  it("returns empty array when no shared strains exist", () => {
    // Create a scenario with no overlap
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const gammaOnly: DispensaryStats = {
      name: "Only Gamma",
      strainCount: 1,
      avgPrice: 48,
      minPrice: 48,
      maxPrice: 48,
      strains: [{ id: "strain-5", name: "Jack Herer", brand: "Brand E", type: "Sativa", price: 48 }],
    };
    // Sour Diesel is only at Alpha, Jack Herer is only at Gamma
    // But Alpha also has Blue Dream and OG Kush which aren't in gammaOnly
    // gammaOnly only has Jack Herer which isn't at Alpha
    const shared = findSharedStrains([
      { ...alpha, strains: [alpha.strains[2]] }, // Only Sour Diesel
      gammaOnly,
    ]);
    expect(shared.length).toBe(0);
  });
});

describe("Dispensary Comparison — Exclusive Strains", () => {
  it("identifies strains exclusive to a dispensary", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const stats = [alpha, beta];

    const alphaExclusive = findExclusiveStrains(stats, 0);
    const betaExclusive = findExclusiveStrains(stats, 1);

    // Sour Diesel is only at Alpha
    expect(alphaExclusive.length).toBe(1);
    expect(alphaExclusive[0].name).toBe("Sour Diesel");

    // Girl Scout Cookies is only at Beta (among Alpha & Beta)
    expect(betaExclusive.length).toBe(1);
    expect(betaExclusive[0].name).toBe("Girl Scout Cookies");
  });

  it("returns empty when all strains are shared", () => {
    // Create two dispensaries that share all strains
    const d1: DispensaryStats = {
      name: "D1",
      strainCount: 1,
      avgPrice: 45,
      minPrice: 45,
      maxPrice: 45,
      strains: [{ id: "strain-1", name: "Blue Dream", brand: "Brand A", type: "Hybrid", price: 45 }],
    };
    const d2: DispensaryStats = {
      name: "D2",
      strainCount: 1,
      avgPrice: 50,
      minPrice: 50,
      maxPrice: 50,
      strains: [{ id: "strain-1", name: "Blue Dream", brand: "Brand A", type: "Hybrid", price: 50 }],
    };
    const exclusive = findExclusiveStrains([d1, d2], 0);
    expect(exclusive.length).toBe(0);
  });
});

describe("Dispensary Comparison — Winner Calculation", () => {
  it("identifies the dispensary with lowest average price", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const gamma = computeDispensaryStats("Dispensary Gamma");
    const stats = [alpha, beta, gamma];

    const avgPrices = stats.map((d) => d.avgPrice);
    const lowestAvgIndex = avgPrices.indexOf(Math.min(...avgPrices));

    // Alpha: (45+55+40)/3 = 46.67, Beta: (50+60+65)/3 = 58.33, Gamma: (42+58+48)/3 = 49.33
    expect(lowestAvgIndex).toBe(0); // Alpha wins
  });

  it("identifies the dispensary with most strains", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const stats = [alpha, beta];

    const strainCounts = stats.map((d) => d.strainCount);
    const mostStrainsIndex = strainCounts.indexOf(Math.max(...strainCounts));

    // Both have 3, so first one wins (tie-breaker)
    expect(mostStrainsIndex).toBe(0);
    expect(alpha.strainCount).toBe(beta.strainCount);
  });

  it("correctly computes max savings across all shared strains", () => {
    const alpha = computeDispensaryStats("Dispensary Alpha");
    const beta = computeDispensaryStats("Dispensary Beta");
    const gamma = computeDispensaryStats("Dispensary Gamma");
    const shared = findSharedStrains([alpha, beta, gamma]);

    const maxSavings = Math.max(...shared.map((s) => s.savings));
    // Girl Scout Cookies: Beta $65 vs Gamma $58 = $7 savings
    // Blue Dream: Beta $50 vs Gamma $42 = $8 savings
    // OG Kush: Beta $60 vs Alpha $55 = $5 savings
    expect(maxSavings).toBe(8);
  });
});
