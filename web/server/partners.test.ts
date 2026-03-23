import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint 14: Dispensary Partnership System Tests
 * Tests partner claim flow, price submissions, verification, and admin operations.
 */

// ─── Mock DB layer ───────────────────────────────────────────

const mockPartners: Map<number, any> = new Map();
const mockPriceUpdates: Map<number, any> = new Map();
let partnerIdCounter = 1;
let priceUpdateIdCounter = 1;

vi.mock("./db", () => ({
  claimDispensary: vi.fn(async (claim: any) => {
    // Check for duplicate slug
    for (const p of mockPartners.values()) {
      if (p.dispensarySlug === claim.dispensarySlug) {
        throw new Error("This dispensary has already been claimed");
      }
    }
    // Check for duplicate user
    for (const p of mockPartners.values()) {
      if (p.userId === claim.userId) {
        throw new Error("You already have a partnership claim");
      }
    }
    const id = partnerIdCounter++;
    const partner = {
      id,
      ...claim,
      verificationStatus: "pending",
      partnerTier: "basic",
      claimedAt: new Date(),
      verifiedAt: null,
      adminNote: null,
    };
    mockPartners.set(id, partner);
    return partner;
  }),

  getPartnerByUserId: vi.fn(async (userId: number) => {
    for (const p of mockPartners.values()) {
      if (p.userId === userId) return p;
    }
    return null;
  }),

  getPartnerBySlug: vi.fn(async (dispensarySlug: string) => {
    for (const p of mockPartners.values()) {
      if (p.dispensarySlug === dispensarySlug && p.verificationStatus === "verified") return p;
    }
    return null;
  }),

  getAllPartners: vi.fn(async (options?: any) => {
    let partners = Array.from(mockPartners.values());
    if (options?.status) {
      partners = partners.filter(p => p.verificationStatus === options.status);
    }
    return partners.slice(0, options?.limit || 50);
  }),

  getPendingPartnerCount: vi.fn(async () => {
    return Array.from(mockPartners.values()).filter(p => p.verificationStatus === "pending").length;
  }),

  updatePartnerStatus: vi.fn(async (partnerId: number, status: string, adminNote?: string) => {
    const partner = mockPartners.get(partnerId);
    if (!partner) throw new Error("Partner not found");
    partner.verificationStatus = status;
    partner.adminNote = adminNote || null;
    if (status === "verified") partner.verifiedAt = new Date();
    mockPartners.set(partnerId, partner);
    return partner;
  }),

  isDispensaryVerified: vi.fn(async (dispensarySlug: string) => {
    for (const p of mockPartners.values()) {
      if (p.dispensarySlug === dispensarySlug && p.verificationStatus === "verified") return true;
    }
    return false;
  }),

  getVerifiedDispensarySlugs: vi.fn(async () => {
    return Array.from(mockPartners.values())
      .filter(p => p.verificationStatus === "verified")
      .map(p => p.dispensarySlug);
  }),

  submitPartnerPrice: vi.fn(async (priceUpdate: any) => {
    const id = priceUpdateIdCounter++;
    const update = {
      id,
      ...priceUpdate,
      status: "pending",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewNote: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    mockPriceUpdates.set(id, update);
    return update;
  }),

  getPartnerPriceUpdates: vi.fn(async (partnerId: number, limit = 50) => {
    return Array.from(mockPriceUpdates.values())
      .filter(pu => pu.partnerId === partnerId)
      .slice(0, limit);
  }),

  getPendingPriceUpdates: vi.fn(async (limit = 50) => {
    return Array.from(mockPriceUpdates.values())
      .filter(pu => pu.status === "pending")
      .slice(0, limit);
  }),

  getAllPriceUpdates: vi.fn(async (options?: any) => {
    let updates = Array.from(mockPriceUpdates.values());
    if (options?.status) {
      updates = updates.filter(pu => pu.status === options.status);
    }
    return updates.slice(0, options?.limit || 50);
  }),

  getPendingPriceUpdateCount: vi.fn(async () => {
    return Array.from(mockPriceUpdates.values()).filter(pu => pu.status === "pending").length;
  }),

  reviewPriceUpdate: vi.fn(async (priceUpdateId: number, status: string, reviewNote?: string) => {
    const update = mockPriceUpdates.get(priceUpdateId);
    if (!update) throw new Error("Price update not found");
    update.status = status;
    update.reviewNote = reviewNote || null;
    update.reviewedAt = new Date();
    mockPriceUpdates.set(priceUpdateId, update);
    return update;
  }),

  getPartnerVerifiedPrices: vi.fn(async (strainId: string) => {
    return Array.from(mockPriceUpdates.values())
      .filter(pu => pu.strainId === strainId && pu.status === "approved")
      .map(pu => ({
        price: pu.price,
        unit: pu.unit,
        dispensaryName: pu.dispensaryName || "Test Dispensary",
        submittedAt: pu.submittedAt,
      }));
  }),

  getPartnerPriceStats: vi.fn(async (partnerId: number) => {
    const updates = Array.from(mockPriceUpdates.values()).filter(pu => pu.partnerId === partnerId);
    return {
      totalSubmissions: updates.length,
      approved: updates.filter(pu => pu.status === "approved").length,
      pending: updates.filter(pu => pu.status === "pending").length,
      rejected: updates.filter(pu => pu.status === "rejected").length,
    };
  }),
}));

import {
  claimDispensary,
  getPartnerByUserId,
  getPartnerBySlug,
  getAllPartners,
  getPendingPartnerCount,
  updatePartnerStatus,
  isDispensaryVerified,
  getVerifiedDispensarySlugs,
  submitPartnerPrice,
  getPartnerPriceUpdates,
  getPendingPriceUpdates,
  getAllPriceUpdates,
  getPendingPriceUpdateCount,
  reviewPriceUpdate,
  getPartnerVerifiedPrices,
  getPartnerPriceStats,
} from "./db";

// ─── Reset between tests ─────────────────────────────────────

beforeEach(() => {
  mockPartners.clear();
  mockPriceUpdates.clear();
  partnerIdCounter = 1;
  priceUpdateIdCounter = 1;
  vi.clearAllMocks();
});

// ─── Partner Claim Tests ──────────────────────────────────────

describe("Partner Claims", () => {
  it("should create a new partner claim", async () => {
    const result = await claimDispensary({
      userId: 1,
      dispensarySlug: "greenleaf-wellness",
      dispensaryName: "GreenLeaf Wellness",
      businessName: "GreenLeaf LLC",
      contactEmail: "owner@greenleaf.com",
      contactPhone: "301-555-0100",
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.verificationStatus).toBe("pending");
    expect(result.dispensarySlug).toBe("greenleaf-wellness");
  });

  it("should reject duplicate dispensary claims", async () => {
    await claimDispensary({
      userId: 1,
      dispensarySlug: "greenleaf-wellness",
      dispensaryName: "GreenLeaf Wellness",
      businessName: "GreenLeaf LLC",
      contactEmail: "owner@greenleaf.com",
    });

    await expect(
      claimDispensary({
        userId: 2,
        dispensarySlug: "greenleaf-wellness",
        dispensaryName: "GreenLeaf Wellness",
        businessName: "Another LLC",
        contactEmail: "other@test.com",
      })
    ).rejects.toThrow("already been claimed");
  });

  it("should reject duplicate user claims", async () => {
    await claimDispensary({
      userId: 1,
      dispensarySlug: "greenleaf-wellness",
      dispensaryName: "GreenLeaf Wellness",
      businessName: "GreenLeaf LLC",
      contactEmail: "owner@greenleaf.com",
    });

    await expect(
      claimDispensary({
        userId: 1,
        dispensarySlug: "another-dispensary",
        dispensaryName: "Another Dispensary",
        businessName: "Another LLC",
        contactEmail: "owner@another.com",
      })
    ).rejects.toThrow("already have a partnership");
  });

  it("should find partner by userId", async () => {
    await claimDispensary({
      userId: 42,
      dispensarySlug: "test-disp",
      dispensaryName: "Test Disp",
      businessName: "Test LLC",
      contactEmail: "test@test.com",
    });

    const found = await getPartnerByUserId(42);
    expect(found).not.toBeNull();
    expect(found!.userId).toBe(42);
    expect(found!.dispensarySlug).toBe("test-disp");
  });

  it("should return null for non-existent userId", async () => {
    const found = await getPartnerByUserId(999);
    expect(found).toBeNull();
  });

  it("should find verified partner by slug", async () => {
    const partner = await claimDispensary({
      userId: 1,
      dispensarySlug: "greenleaf-wellness",
      dispensaryName: "GreenLeaf Wellness",
      businessName: "GreenLeaf LLC",
      contactEmail: "owner@greenleaf.com",
    });

    // Not verified yet
    let found = await getPartnerBySlug("greenleaf-wellness");
    expect(found).toBeNull();

    // Verify it
    await updatePartnerStatus(partner.id, "verified");
    found = await getPartnerBySlug("greenleaf-wellness");
    expect(found).not.toBeNull();
    expect(found!.verificationStatus).toBe("verified");
  });
});

// ─── Partner Verification Tests ───────────────────────────────

describe("Partner Verification", () => {
  it("should verify a pending partner", async () => {
    const partner = await claimDispensary({
      userId: 1,
      dispensarySlug: "test-disp",
      dispensaryName: "Test Dispensary",
      businessName: "Test LLC",
      contactEmail: "test@test.com",
    });

    const result = await updatePartnerStatus(partner.id, "verified", "Verified via phone call");
    expect(result.verificationStatus).toBe("verified");
    expect(result.verifiedAt).toBeDefined();
    expect(result.adminNote).toBe("Verified via phone call");
  });

  it("should reject a pending partner", async () => {
    const partner = await claimDispensary({
      userId: 1,
      dispensarySlug: "test-disp",
      dispensaryName: "Test Dispensary",
      businessName: "Test LLC",
      contactEmail: "test@test.com",
    });

    const result = await updatePartnerStatus(partner.id, "rejected", "Could not verify ownership");
    expect(result.verificationStatus).toBe("rejected");
    expect(result.adminNote).toBe("Could not verify ownership");
  });

  it("should throw for non-existent partner", async () => {
    await expect(
      updatePartnerStatus(999, "verified")
    ).rejects.toThrow("Partner not found");
  });

  it("should check if dispensary is verified", async () => {
    const partner = await claimDispensary({
      userId: 1,
      dispensarySlug: "verified-disp",
      dispensaryName: "Verified Dispensary",
      businessName: "Verified LLC",
      contactEmail: "v@test.com",
    });

    expect(await isDispensaryVerified("verified-disp")).toBe(false);
    await updatePartnerStatus(partner.id, "verified");
    expect(await isDispensaryVerified("verified-disp")).toBe(true);
  });

  it("should return list of verified dispensary slugs", async () => {
    const p1 = await claimDispensary({
      userId: 1,
      dispensarySlug: "disp-a",
      dispensaryName: "Disp A",
      businessName: "A LLC",
      contactEmail: "a@test.com",
    });
    const p2 = await claimDispensary({
      userId: 2,
      dispensarySlug: "disp-b",
      dispensaryName: "Disp B",
      businessName: "B LLC",
      contactEmail: "b@test.com",
    });

    await updatePartnerStatus(p1.id, "verified");
    // p2 stays pending

    const slugs = await getVerifiedDispensarySlugs();
    expect(slugs).toContain("disp-a");
    expect(slugs).not.toContain("disp-b");
  });

  it("should count pending partners", async () => {
    await claimDispensary({
      userId: 1,
      dispensarySlug: "disp-1",
      dispensaryName: "Disp 1",
      businessName: "LLC 1",
      contactEmail: "1@test.com",
    });
    await claimDispensary({
      userId: 2,
      dispensarySlug: "disp-2",
      dispensaryName: "Disp 2",
      businessName: "LLC 2",
      contactEmail: "2@test.com",
    });

    const count = await getPendingPartnerCount();
    expect(count).toBe(2);
  });
});

// ─── Admin Partner List Tests ─────────────────────────────────

describe("Admin Partner List", () => {
  it("should list all partners", async () => {
    await claimDispensary({
      userId: 1,
      dispensarySlug: "disp-1",
      dispensaryName: "Disp 1",
      businessName: "LLC 1",
      contactEmail: "1@test.com",
    });
    await claimDispensary({
      userId: 2,
      dispensarySlug: "disp-2",
      dispensaryName: "Disp 2",
      businessName: "LLC 2",
      contactEmail: "2@test.com",
    });

    const all = await getAllPartners();
    expect(all.length).toBe(2);
  });

  it("should filter partners by status", async () => {
    const p1 = await claimDispensary({
      userId: 1,
      dispensarySlug: "disp-1",
      dispensaryName: "Disp 1",
      businessName: "LLC 1",
      contactEmail: "1@test.com",
    });
    await claimDispensary({
      userId: 2,
      dispensarySlug: "disp-2",
      dispensaryName: "Disp 2",
      businessName: "LLC 2",
      contactEmail: "2@test.com",
    });

    await updatePartnerStatus(p1.id, "verified");

    const pending = await getAllPartners({ status: "pending" });
    expect(pending.length).toBe(1);
    expect(pending[0].dispensarySlug).toBe("disp-2");

    const verified = await getAllPartners({ status: "verified" });
    expect(verified.length).toBe(1);
    expect(verified[0].dispensarySlug).toBe("disp-1");
  });

  it("should respect limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      await claimDispensary({
        userId: i + 1,
        dispensarySlug: `disp-${i}`,
        dispensaryName: `Disp ${i}`,
        businessName: `LLC ${i}`,
        contactEmail: `${i}@test.com`,
      });
    }

    const limited = await getAllPartners({ limit: 3 });
    expect(limited.length).toBe(3);
  });
});

// ─── Price Update Tests ───────────────────────────────────────

describe("Partner Price Updates", () => {
  it("should submit a price update", async () => {
    const result = await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.status).toBe("pending");
    expect(result.price).toBe("45.00");
  });

  it("should retrieve partner's price updates", async () => {
    await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });
    await submitPartnerPrice({
      partnerId: 1,
      strainId: "gelato",
      strainName: "Gelato",
      price: "50.00",
      unit: "3.5g",
    });
    await submitPartnerPrice({
      partnerId: 2,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "40.00",
      unit: "3.5g",
    });

    const updates = await getPartnerPriceUpdates(1);
    expect(updates.length).toBe(2);
  });

  it("should get pending price updates", async () => {
    await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });
    const pu2 = await submitPartnerPrice({
      partnerId: 1,
      strainId: "gelato",
      strainName: "Gelato",
      price: "50.00",
      unit: "3.5g",
    });

    // Approve one
    await reviewPriceUpdate(pu2.id, "approved");

    const pending = await getPendingPriceUpdates();
    expect(pending.length).toBe(1);
    expect(pending[0].strainName).toBe("Mule Fuel");
  });

  it("should count pending price updates", async () => {
    await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });
    await submitPartnerPrice({
      partnerId: 1,
      strainId: "gelato",
      strainName: "Gelato",
      price: "50.00",
      unit: "3.5g",
    });

    expect(await getPendingPriceUpdateCount()).toBe(2);
  });
});

// ─── Price Review Tests ───────────────────────────────────────

describe("Price Update Review", () => {
  it("should approve a price update", async () => {
    const pu = await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });

    const result = await reviewPriceUpdate(pu.id, "approved", "Price looks accurate");
    expect(result.status).toBe("approved");
    expect(result.reviewNote).toBe("Price looks accurate");
    expect(result.reviewedAt).toBeDefined();
  });

  it("should reject a price update", async () => {
    const pu = await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "5.00",
      unit: "3.5g",
    });

    const result = await reviewPriceUpdate(pu.id, "rejected", "Price seems too low");
    expect(result.status).toBe("rejected");
    expect(result.reviewNote).toBe("Price seems too low");
  });

  it("should throw for non-existent price update", async () => {
    await expect(
      reviewPriceUpdate(999, "approved")
    ).rejects.toThrow("Price update not found");
  });

  it("should filter price updates by status", async () => {
    const pu1 = await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });
    await submitPartnerPrice({
      partnerId: 1,
      strainId: "gelato",
      strainName: "Gelato",
      price: "50.00",
      unit: "3.5g",
    });

    await reviewPriceUpdate(pu1.id, "approved");

    const approved = await getAllPriceUpdates({ status: "approved" });
    expect(approved.length).toBe(1);
    expect(approved[0].strainName).toBe("Mule Fuel");

    const pending = await getAllPriceUpdates({ status: "pending" });
    expect(pending.length).toBe(1);
    expect(pending[0].strainName).toBe("Gelato");
  });
});

// ─── Partner Verified Prices Tests ────────────────────────────

describe("Partner Verified Prices", () => {
  it("should return approved prices for a strain", async () => {
    const pu1 = await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });
    await submitPartnerPrice({
      partnerId: 2,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "42.00",
      unit: "3.5g",
    });

    // Only approve one
    await reviewPriceUpdate(pu1.id, "approved");

    const prices = await getPartnerVerifiedPrices("mule-fuel");
    expect(prices.length).toBe(1);
    expect(prices[0].price).toBe("45.00");
  });

  it("should return empty array for strain with no approved prices", async () => {
    const prices = await getPartnerVerifiedPrices("nonexistent-strain");
    expect(prices).toEqual([]);
  });
});

// ─── Partner Stats Tests ──────────────────────────────────────

describe("Partner Price Stats", () => {
  it("should return correct stats for a partner", async () => {
    const pu1 = await submitPartnerPrice({
      partnerId: 1,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });
    const pu2 = await submitPartnerPrice({
      partnerId: 1,
      strainId: "gelato",
      strainName: "Gelato",
      price: "50.00",
      unit: "3.5g",
    });
    await submitPartnerPrice({
      partnerId: 1,
      strainId: "og-kush",
      strainName: "OG Kush",
      price: "35.00",
      unit: "3.5g",
    });

    await reviewPriceUpdate(pu1.id, "approved");
    await reviewPriceUpdate(pu2.id, "rejected");

    const stats = await getPartnerPriceStats(1);
    expect(stats.totalSubmissions).toBe(3);
    expect(stats.approved).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it("should return zero stats for partner with no submissions", async () => {
    const stats = await getPartnerPriceStats(999);
    expect(stats.totalSubmissions).toBe(0);
    expect(stats.approved).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.rejected).toBe(0);
  });
});

// ─── Integration-style Tests ──────────────────────────────────

describe("Full Partner Lifecycle", () => {
  it("should handle complete claim → verify → submit price → approve flow", async () => {
    // 1. Claim
    const partner = await claimDispensary({
      userId: 1,
      dispensarySlug: "greenleaf-wellness",
      dispensaryName: "GreenLeaf Wellness",
      businessName: "GreenLeaf LLC",
      contactEmail: "owner@greenleaf.com",
    });
    expect(partner.verificationStatus).toBe("pending");

    // 2. Verify
    const verified = await updatePartnerStatus(partner.id, "verified", "Phone verified");
    expect(verified.verificationStatus).toBe("verified");
    expect(await isDispensaryVerified("greenleaf-wellness")).toBe(true);

    // 3. Submit price
    const priceUpdate = await submitPartnerPrice({
      partnerId: partner.id,
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
      price: "45.00",
      unit: "3.5g",
    });
    expect(priceUpdate.status).toBe("pending");

    // 4. Approve price
    const approved = await reviewPriceUpdate(priceUpdate.id, "approved");
    expect(approved.status).toBe("approved");

    // 5. Check verified prices
    const prices = await getPartnerVerifiedPrices("mule-fuel");
    expect(prices.length).toBe(1);
    expect(prices[0].price).toBe("45.00");

    // 6. Check stats
    const stats = await getPartnerPriceStats(partner.id);
    expect(stats.totalSubmissions).toBe(1);
    expect(stats.approved).toBe(1);
  });

  it("should handle claim → reject flow", async () => {
    const partner = await claimDispensary({
      userId: 1,
      dispensarySlug: "fake-disp",
      dispensaryName: "Fake Dispensary",
      businessName: "Fake LLC",
      contactEmail: "fake@test.com",
    });

    const rejected = await updatePartnerStatus(partner.id, "rejected", "Could not verify");
    expect(rejected.verificationStatus).toBe("rejected");
    expect(await isDispensaryVerified("fake-disp")).toBe(false);

    const slugs = await getVerifiedDispensarySlugs();
    expect(slugs).not.toContain("fake-disp");
  });
});
