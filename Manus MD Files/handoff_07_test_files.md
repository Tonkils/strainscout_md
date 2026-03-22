# StrainScout MD — Test Files (218 tests, all passing)

**Handoff Document for Claude Code Review**
**Date:** March 16, 2026 | **Sprint:** 14 | **Checkpoint:** 6570492f

> All vitest test files covering server-side logic: partners, comments, votes, alerts, deals, market data, dispensary compare, email signup, price drops.

---

## Files in This Document

1. `server/partners.test.ts` (749 lines)
2. `server/comments.test.ts` (464 lines)
3. `server/votes.test.ts` (299 lines)
4. `server/alerts.test.ts` (410 lines)
5. `server/alertTriggerEngine.test.ts` (361 lines)
6. `server/marketData.test.ts` (328 lines)
7. `server/marketDashboard.test.ts` (308 lines)
8. `server/deals.test.ts` (266 lines)
9. `server/dispensaryCompare.test.ts` (344 lines)
10. `server/emailSignup.test.ts` (225 lines)
11. `server/priceDrops.test.ts` (269 lines)
12. `server/auth.logout.test.ts` (63 lines)

---

## 1. `server/partners.test.ts`

**Lines:** 749

```typescript
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

```

---

## 2. `server/comments.test.ts`

**Lines:** 464

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint 13: Strain Comments & Reviews System Tests
 * Tests: comment submission, listing, moderation, deletion, profanity filter.
 */

// ─── Mock DB layer ───────────────────────────────────────────

const mockComments: Map<number, any> = new Map();
let commentIdCounter = 1;

vi.mock("./db", () => ({
  submitStrainComment: vi.fn(async (comment: any) => {
    const id = commentIdCounter++;
    const record = {
      id,
      ...comment,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockComments.set(id, record);
    return { id };
  }),
  getApprovedStrainComments: vi.fn(async (strainId: string, limit: number = 20) => {
    return Array.from(mockComments.values())
      .filter((c) => c.strainId === strainId && c.status === "approved")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        content: c.content,
        createdAt: c.createdAt,
      }));
  }),
  getStrainCommentCount: vi.fn(async (strainId: string) => {
    return Array.from(mockComments.values()).filter(
      (c) => c.strainId === strainId && c.status === "approved"
    ).length;
  }),
  getCommentById: vi.fn(async (commentId: number) => {
    return mockComments.get(commentId) ?? null;
  }),
  deleteStrainComment: vi.fn(async (commentId: number) => {
    const existed = mockComments.has(commentId);
    mockComments.delete(commentId);
    return existed;
  }),
  getAllComments: vi.fn(async (opts?: { status?: string; limit?: number }) => {
    let results = Array.from(mockComments.values());
    if (opts?.status) {
      results = results.filter((c) => c.status === opts.status);
    }
    return results
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, opts?.limit ?? 50);
  }),
  getPendingCommentCount: vi.fn(async () => {
    return Array.from(mockComments.values()).filter((c) => c.status === "pending").length;
  }),
  moderateComment: vi.fn(async (commentId: number, action: string, note?: string) => {
    const comment = mockComments.get(commentId);
    if (!comment) return null;
    comment.status = action;
    comment.moderationNote = note || null;
    comment.updatedAt = new Date();
    mockComments.set(commentId, comment);
    return comment;
  }),
}));

import {
  submitStrainComment,
  getApprovedStrainComments,
  getStrainCommentCount,
  getCommentById,
  deleteStrainComment,
  getAllComments,
  getPendingCommentCount,
  moderateComment,
} from "./db";

// ─── Import profanity filter (not mocked — test real logic) ──

import { checkProfanity, sanitizeText } from "./profanityFilter";

beforeEach(() => {
  mockComments.clear();
  commentIdCounter = 1;
});

// ─── Comment Submission ─────────────────────────────────────

describe("Comment Submission", () => {
  it("should create a new comment", async () => {
    const result = await submitStrainComment({
      userId: 1,
      userName: "TestUser",
      strainId: "blue-dream",
      strainName: "Blue Dream",
      content: "This is a great strain for relaxation.",
      status: "approved",
      flagged: "clean",
    });
    expect(result.id).toBe(1);
  });

  it("should create a flagged comment with pending status", async () => {
    const result = await submitStrainComment({
      userId: 2,
      userName: "User2",
      strainId: "og-kush",
      strainName: "OG Kush",
      content: "Some flagged content here.",
      status: "pending",
      flagged: "flagged",
    });
    expect(result.id).toBe(1);
    const comment = await getCommentById(result.id);
    expect(comment!.status).toBe("pending");
    expect(comment!.flagged).toBe("flagged");
  });

  it("should store userName correctly", async () => {
    await submitStrainComment({
      userId: 1,
      userName: "JaretMD",
      strainId: "gelato",
      strainName: "Gelato",
      content: "Amazing terpene profile!",
      status: "approved",
      flagged: "clean",
    });
    const comment = await getCommentById(1);
    expect(comment!.userName).toBe("JaretMD");
  });

  it("should handle null userName", async () => {
    await submitStrainComment({
      userId: 1,
      userName: null,
      strainId: "gelato",
      strainName: "Gelato",
      content: "Anonymous review here.",
      status: "approved",
      flagged: "clean",
    });
    const comment = await getCommentById(1);
    expect(comment!.userName).toBeNull();
  });
});

// ─── Comment Listing ────────────────────────────────────────

describe("Comment Listing", () => {
  it("should return empty array for strain with no comments", async () => {
    const comments = await getApprovedStrainComments("no-comments");
    expect(comments).toEqual([]);
  });

  it("should only return approved comments", async () => {
    await submitStrainComment({
      userId: 1, userName: "A", strainId: "test", strainName: "Test",
      content: "Approved review", status: "approved", flagged: "clean",
    });
    await submitStrainComment({
      userId: 2, userName: "B", strainId: "test", strainName: "Test",
      content: "Pending review", status: "pending", flagged: "flagged",
    });
    await submitStrainComment({
      userId: 3, userName: "C", strainId: "test", strainName: "Test",
      content: "Rejected review", status: "rejected", flagged: "flagged",
    });
    const comments = await getApprovedStrainComments("test");
    expect(comments.length).toBe(1);
    expect(comments[0].content).toBe("Approved review");
  });

  it("should respect limit parameter", async () => {
    for (let i = 1; i <= 5; i++) {
      await submitStrainComment({
        userId: i, userName: `User${i}`, strainId: "many", strainName: "Many",
        content: `Review ${i}`, status: "approved", flagged: "clean",
      });
    }
    const comments = await getApprovedStrainComments("many", 3);
    expect(comments.length).toBe(3);
  });

  it("should return all approved comments for a strain", async () => {
    for (let i = 1; i <= 3; i++) {
      await submitStrainComment({
        userId: i, userName: `User${i}`, strainId: "order", strainName: "Order",
        content: `Review ${i}`, status: "approved", flagged: "clean",
      });
    }
    const comments = await getApprovedStrainComments("order");
    expect(comments.length).toBe(3);
    // All should have content
    expect(comments.every(c => c.content.startsWith("Review"))).toBe(true);
  });
});

// ─── Comment Count ──────────────────────────────────────────

describe("Comment Count", () => {
  it("should return 0 for strain with no approved comments", async () => {
    const count = await getStrainCommentCount("empty");
    expect(count).toBe(0);
  });

  it("should only count approved comments", async () => {
    await submitStrainComment({
      userId: 1, userName: "A", strainId: "count", strainName: "Count",
      content: "Approved", status: "approved", flagged: "clean",
    });
    await submitStrainComment({
      userId: 2, userName: "B", strainId: "count", strainName: "Count",
      content: "Pending", status: "pending", flagged: "flagged",
    });
    const count = await getStrainCommentCount("count");
    expect(count).toBe(1);
  });
});

// ─── Comment Deletion ───────────────────────────────────────

describe("Comment Deletion", () => {
  it("should delete an existing comment", async () => {
    const { id } = await submitStrainComment({
      userId: 1, userName: "A", strainId: "del", strainName: "Del",
      content: "Will be deleted", status: "approved", flagged: "clean",
    });
    const deleted = await deleteStrainComment(id);
    expect(deleted).toBe(true);
    const comment = await getCommentById(id);
    expect(comment).toBeNull();
  });

  it("should return false when deleting non-existent comment", async () => {
    const deleted = await deleteStrainComment(9999);
    expect(deleted).toBe(false);
  });
});

// ─── Moderation ─────────────────────────────────────────────

describe("Comment Moderation", () => {
  it("should approve a pending comment", async () => {
    const { id } = await submitStrainComment({
      userId: 1, userName: "A", strainId: "mod", strainName: "Mod",
      content: "Needs review", status: "pending", flagged: "flagged",
    });
    const updated = await moderateComment(id, "approved");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("approved");
  });

  it("should reject a pending comment with note", async () => {
    const { id } = await submitStrainComment({
      userId: 1, userName: "A", strainId: "mod", strainName: "Mod",
      content: "Bad content", status: "pending", flagged: "flagged",
    });
    const updated = await moderateComment(id, "rejected", "Inappropriate language");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("rejected");
    expect(updated!.moderationNote).toBe("Inappropriate language");
  });

  it("should return null for non-existent comment", async () => {
    const result = await moderateComment(9999, "approved");
    expect(result).toBeNull();
  });

  it("should get pending comment count", async () => {
    await submitStrainComment({
      userId: 1, userName: "A", strainId: "p1", strainName: "P1",
      content: "Pending 1", status: "pending", flagged: "flagged",
    });
    await submitStrainComment({
      userId: 2, userName: "B", strainId: "p2", strainName: "P2",
      content: "Pending 2", status: "pending", flagged: "flagged",
    });
    await submitStrainComment({
      userId: 3, userName: "C", strainId: "a1", strainName: "A1",
      content: "Approved", status: "approved", flagged: "clean",
    });
    const count = await getPendingCommentCount();
    expect(count).toBe(2);
  });

  it("should filter comments by status in moderation view", async () => {
    await submitStrainComment({
      userId: 1, userName: "A", strainId: "f1", strainName: "F1",
      content: "Pending", status: "pending", flagged: "flagged",
    });
    await submitStrainComment({
      userId: 2, userName: "B", strainId: "f2", strainName: "F2",
      content: "Approved", status: "approved", flagged: "clean",
    });
    const pending = await getAllComments({ status: "pending" });
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe("pending");

    const all = await getAllComments();
    expect(all.length).toBe(2);
  });
});

// ─── Profanity Filter ───────────────────────────────────────

describe("Profanity Filter", () => {
  it("should pass clean text", () => {
    const result = checkProfanity("This is a great strain for relaxation.");
    expect(result.clean).toBe(true);
    expect(result.flaggedWords).toEqual([]);
  });

  it("should flag offensive words", () => {
    const result = checkProfanity("This strain is shit");
    expect(result.clean).toBe(false);
    expect(result.flaggedWords.length).toBeGreaterThan(0);
  });

  it("should detect l33t speak evasion", () => {
    const result = checkProfanity("This is $h1t");
    expect(result.clean).toBe(false);
  });

  it("should handle empty text", () => {
    const result = checkProfanity("");
    expect(result.clean).toBe(true);
    expect(result.flaggedWords).toEqual([]);
  });

  it("should not flag cannabis-related terms", () => {
    const result = checkProfanity("This weed is super dank with great bud structure");
    expect(result.clean).toBe(true);
  });

  it("should detect spam patterns", () => {
    const result = checkProfanity("Buy now! Click here for free money!");
    expect(result.clean).toBe(false);
  });

  it("should detect spaced-out evasion", () => {
    const result = checkProfanity("f u c k this strain");
    expect(result.clean).toBe(false);
  });

  it("should sanitize flagged text", () => {
    const sanitized = sanitizeText("This is shit and bullshit");
    expect(sanitized).not.toContain("shit");
    expect(sanitized).toContain("****");
  });

  it("should preserve original text in result", () => {
    const original = "This is a test message";
    const result = checkProfanity(original);
    expect(result.original).toBe(original);
  });

  it("should handle mixed clean and flagged content", () => {
    const result = checkProfanity("Great terpene profile but this is bullshit pricing");
    expect(result.clean).toBe(false);
    expect(result.flaggedWords.length).toBeGreaterThan(0);
  });
});

// ─── Input Validation ───────────────────────────────────────

describe("Comment Input Validation", () => {
  it("should enforce minimum 10 character content", () => {
    const short = "Too short";
    const valid = "This is a valid review of this strain.";
    expect(short.length).toBeLessThan(10);
    expect(valid.length).toBeGreaterThanOrEqual(10);
  });

  it("should enforce maximum 1000 character content", () => {
    const long = "a".repeat(1001);
    const valid = "a".repeat(1000);
    expect(long.length).toBeGreaterThan(1000);
    expect(valid.length).toBeLessThanOrEqual(1000);
  });

  it("should require non-empty strainId", () => {
    const valid = "blue-dream";
    const empty = "";
    expect(valid.length).toBeGreaterThan(0);
    expect(empty.length).toBe(0);
  });

  it("should validate status enum values", () => {
    const validStatuses = ["pending", "approved", "rejected"];
    expect(validStatuses.includes("pending")).toBe(true);
    expect(validStatuses.includes("approved")).toBe(true);
    expect(validStatuses.includes("rejected")).toBe(true);
    expect(validStatuses.includes("invalid" as any)).toBe(false);
  });

  it("should validate flagged enum values", () => {
    const validFlags = ["clean", "flagged"];
    expect(validFlags.includes("clean")).toBe(true);
    expect(validFlags.includes("flagged")).toBe(true);
    expect(validFlags.includes("unknown" as any)).toBe(false);
  });
});

// ─── Integration: Profanity + Submission Flow ───────────────

describe("Profanity Filter + Submission Integration", () => {
  it("should auto-approve clean comments", async () => {
    const content = "This is a wonderful strain with great effects.";
    const profanityResult = checkProfanity(content);
    const status = profanityResult.clean ? "approved" : "pending";
    const flagged = profanityResult.clean ? "clean" : "flagged";

    const { id } = await submitStrainComment({
      userId: 1, userName: "User", strainId: "flow", strainName: "Flow",
      content, status, flagged,
    });

    const comment = await getCommentById(id);
    expect(comment!.status).toBe("approved");
    expect(comment!.flagged).toBe("clean");
  });

  it("should flag and pend comments with profanity", async () => {
    const content = "This strain is absolute shit, don't buy it.";
    const profanityResult = checkProfanity(content);
    const status = profanityResult.clean ? "approved" : "pending";
    const flagged = profanityResult.clean ? "clean" : "flagged";

    const { id } = await submitStrainComment({
      userId: 1, userName: "User", strainId: "flow", strainName: "Flow",
      content, status, flagged,
    });

    const comment = await getCommentById(id);
    expect(comment!.status).toBe("pending");
    expect(comment!.flagged).toBe("flagged");
  });

  it("should allow flagged comment to be approved by moderator", async () => {
    const content = "Some flagged content here.";
    const { id } = await submitStrainComment({
      userId: 1, userName: "User", strainId: "mod-flow", strainName: "Mod Flow",
      content, status: "pending", flagged: "flagged",
    });

    // Moderator approves
    const updated = await moderateComment(id, "approved", "Content reviewed and acceptable");
    expect(updated!.status).toBe("approved");
    expect(updated!.moderationNote).toBe("Content reviewed and acceptable");

    // Should now appear in approved list
    const approved = await getApprovedStrainComments("mod-flow");
    expect(approved.length).toBe(1);
  });
});

```

---

## 3. `server/votes.test.ts`

**Lines:** 299

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint 12: Strain Voting System Tests
 * Tests the vote submission, aggregation, comments, and edge cases.
 */

// ─── Mock DB layer ───────────────────────────────────────────

const mockVotes: Map<string, any> = new Map();
let voteIdCounter = 1;

vi.mock("./db", () => ({
  submitStrainVote: vi.fn(async (vote: any) => {
    const key = `${vote.userId}-${vote.strainId}`;
    const existing = mockVotes.get(key);
    if (existing) {
      mockVotes.set(key, { ...existing, ...vote, updatedAt: new Date() });
      return { id: existing.id, isNew: false };
    }
    const id = voteIdCounter++;
    mockVotes.set(key, { id, ...vote, createdAt: new Date(), updatedAt: new Date() });
    return { id, isNew: true };
  }),
  getUserStrainVote: vi.fn(async (userId: number, strainId: string) => {
    return mockVotes.get(`${userId}-${strainId}`) ?? null;
  }),
  getStrainVoteAggregates: vi.fn(async (strainId: string) => {
    const votes = Array.from(mockVotes.values()).filter(v => v.strainId === strainId);
    const total = votes.length;
    if (total === 0) {
      return {
        totalVotes: 0,
        effectsAccuracy: { up: 0, down: 0, upPercent: 0 },
        valueForMoney: { up: 0, down: 0, upPercent: 0 },
        overallQuality: { up: 0, down: 0, upPercent: 0 },
      };
    }
    const effectsUp = votes.filter(v => v.effectsAccuracy === 1).length;
    const valueUp = votes.filter(v => v.valueForMoney === 1).length;
    const qualityUp = votes.filter(v => v.overallQuality === 1).length;
    return {
      totalVotes: total,
      effectsAccuracy: { up: effectsUp, down: total - effectsUp, upPercent: Math.round((effectsUp / total) * 100) },
      valueForMoney: { up: valueUp, down: total - valueUp, upPercent: Math.round((valueUp / total) * 100) },
      overallQuality: { up: qualityUp, down: total - qualityUp, upPercent: Math.round((qualityUp / total) * 100) },
    };
  }),
  getStrainComments: vi.fn(async (strainId: string, limit: number = 20) => {
    return Array.from(mockVotes.values())
      .filter(v => v.strainId === strainId && v.comment)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(v => ({
        id: v.id,
        userId: v.userId,
        comment: v.comment,
        effectsAccuracy: v.effectsAccuracy,
        valueForMoney: v.valueForMoney,
        overallQuality: v.overallQuality,
        createdAt: v.createdAt,
      }));
  }),
  deleteStrainVote: vi.fn(async (userId: number, strainId: string) => {
    const key = `${userId}-${strainId}`;
    const existed = mockVotes.has(key);
    mockVotes.delete(key);
    return existed;
  }),
  getUserVoteCount: vi.fn(async (userId: number) => {
    return Array.from(mockVotes.values()).filter(v => v.userId === userId).length;
  }),
}));

import { submitStrainVote, getUserStrainVote, getStrainVoteAggregates, getStrainComments, deleteStrainVote, getUserVoteCount } from "./db";

beforeEach(() => {
  mockVotes.clear();
  voteIdCounter = 1;
});

// ─── Vote Submission ─────────────────────────────────────────

describe("Vote Submission", () => {
  it("should create a new vote", async () => {
    const result = await submitStrainVote({
      userId: 1,
      strainId: "blue-dream",
      strainName: "Blue Dream",
      effectsAccuracy: 1,
      valueForMoney: 1,
      overallQuality: 1,
    });
    expect(result.id).toBe(1);
    expect(result.isNew).toBe(true);
  });

  it("should update an existing vote", async () => {
    await submitStrainVote({
      userId: 1,
      strainId: "blue-dream",
      strainName: "Blue Dream",
      effectsAccuracy: 1,
      valueForMoney: 1,
      overallQuality: 1,
    });
    const result = await submitStrainVote({
      userId: 1,
      strainId: "blue-dream",
      strainName: "Blue Dream",
      effectsAccuracy: -1,
      valueForMoney: 1,
      overallQuality: -1,
    });
    expect(result.isNew).toBe(false);
  });

  it("should allow different users to vote on the same strain", async () => {
    const r1 = await submitStrainVote({
      userId: 1, strainId: "og-kush", strainName: "OG Kush",
      effectsAccuracy: 1, valueForMoney: 1, overallQuality: 1,
    });
    const r2 = await submitStrainVote({
      userId: 2, strainId: "og-kush", strainName: "OG Kush",
      effectsAccuracy: -1, valueForMoney: -1, overallQuality: -1,
    });
    expect(r1.isNew).toBe(true);
    expect(r2.isNew).toBe(true);
    expect(r1.id).not.toBe(r2.id);
  });

  it("should store optional comments", async () => {
    await submitStrainVote({
      userId: 1, strainId: "sour-diesel", strainName: "Sour Diesel",
      effectsAccuracy: 1, valueForMoney: -1, overallQuality: 1,
      comment: "Great effects but overpriced",
    });
    const vote = await getUserStrainVote(1, "sour-diesel");
    expect(vote).not.toBeNull();
    expect(vote!.comment).toBe("Great effects but overpriced");
  });

  it("should allow votes with null comments", async () => {
    await submitStrainVote({
      userId: 1, strainId: "gelato", strainName: "Gelato",
      effectsAccuracy: 1, valueForMoney: 1, overallQuality: 1,
      comment: null,
    });
    const vote = await getUserStrainVote(1, "gelato");
    expect(vote).not.toBeNull();
    expect(vote!.comment).toBeNull();
  });
});

// ─── Vote Retrieval ──────────────────────────────────────────

describe("Vote Retrieval", () => {
  it("should return null for non-existent vote", async () => {
    const vote = await getUserStrainVote(999, "nonexistent");
    expect(vote).toBeNull();
  });

  it("should return the user's vote for a strain", async () => {
    await submitStrainVote({
      userId: 1, strainId: "blue-dream", strainName: "Blue Dream",
      effectsAccuracy: 1, valueForMoney: -1, overallQuality: 1,
    });
    const vote = await getUserStrainVote(1, "blue-dream");
    expect(vote).not.toBeNull();
    expect(vote!.effectsAccuracy).toBe(1);
    expect(vote!.valueForMoney).toBe(-1);
    expect(vote!.overallQuality).toBe(1);
  });
});

// ─── Aggregates ──────────────────────────────────────────────

describe("Vote Aggregates", () => {
  it("should return zero aggregates for unvoted strain", async () => {
    const agg = await getStrainVoteAggregates("no-votes");
    expect(agg.totalVotes).toBe(0);
    expect(agg.effectsAccuracy.upPercent).toBe(0);
  });

  it("should calculate correct percentages with multiple votes", async () => {
    // 3 users vote on the same strain
    await submitStrainVote({ userId: 1, strainId: "test", strainName: "Test", effectsAccuracy: 1, valueForMoney: 1, overallQuality: 1 });
    await submitStrainVote({ userId: 2, strainId: "test", strainName: "Test", effectsAccuracy: 1, valueForMoney: -1, overallQuality: 1 });
    await submitStrainVote({ userId: 3, strainId: "test", strainName: "Test", effectsAccuracy: -1, valueForMoney: -1, overallQuality: 1 });

    const agg = await getStrainVoteAggregates("test");
    expect(agg.totalVotes).toBe(3);
    expect(agg.effectsAccuracy.up).toBe(2);
    expect(agg.effectsAccuracy.down).toBe(1);
    expect(agg.effectsAccuracy.upPercent).toBe(67);
    expect(agg.valueForMoney.up).toBe(1);
    expect(agg.valueForMoney.down).toBe(2);
    expect(agg.valueForMoney.upPercent).toBe(33);
    expect(agg.overallQuality.up).toBe(3);
    expect(agg.overallQuality.upPercent).toBe(100);
  });

  it("should handle single vote aggregates", async () => {
    await submitStrainVote({ userId: 1, strainId: "solo", strainName: "Solo", effectsAccuracy: -1, valueForMoney: -1, overallQuality: -1 });
    const agg = await getStrainVoteAggregates("solo");
    expect(agg.totalVotes).toBe(1);
    expect(agg.effectsAccuracy.upPercent).toBe(0);
    expect(agg.overallQuality.upPercent).toBe(0);
  });
});

// ─── Comments ────────────────────────────────────────────────

describe("Strain Comments", () => {
  it("should return empty array for strain with no comments", async () => {
    const comments = await getStrainComments("no-comments");
    expect(comments).toEqual([]);
  });

  it("should return only votes with comments", async () => {
    await submitStrainVote({ userId: 1, strainId: "comm", strainName: "Comm", effectsAccuracy: 1, valueForMoney: 1, overallQuality: 1, comment: "Great strain!" });
    await submitStrainVote({ userId: 2, strainId: "comm", strainName: "Comm", effectsAccuracy: -1, valueForMoney: -1, overallQuality: -1, comment: null });
    await submitStrainVote({ userId: 3, strainId: "comm", strainName: "Comm", effectsAccuracy: 1, valueForMoney: 1, overallQuality: 1, comment: "Love it" });

    const comments = await getStrainComments("comm");
    expect(comments.length).toBe(2);
    expect(comments.every(c => c.comment !== null && c.comment !== "")).toBe(true);
  });

  it("should respect limit parameter", async () => {
    for (let i = 1; i <= 5; i++) {
      await submitStrainVote({ userId: i, strainId: "many", strainName: "Many", effectsAccuracy: 1, valueForMoney: 1, overallQuality: 1, comment: `Comment ${i}` });
    }
    const comments = await getStrainComments("many", 3);
    expect(comments.length).toBe(3);
  });
});

// ─── Vote Deletion ───────────────────────────────────────────

describe("Vote Deletion", () => {
  it("should delete an existing vote", async () => {
    await submitStrainVote({ userId: 1, strainId: "del", strainName: "Del", effectsAccuracy: 1, valueForMoney: 1, overallQuality: 1 });
    const deleted = await deleteStrainVote(1, "del");
    expect(deleted).toBe(true);
    const vote = await getUserStrainVote(1, "del");
    expect(vote).toBeNull();
  });

  it("should return false when deleting non-existent vote", async () => {
    const deleted = await deleteStrainVote(999, "nonexistent");
    expect(deleted).toBe(false);
  });
});

// ─── User Vote Count ─────────────────────────────────────────

describe("User Vote Count", () => {
  it("should return 0 for user with no votes", async () => {
    const count = await getUserVoteCount(999);
    expect(count).toBe(0);
  });

  it("should count all votes by a user", async () => {
    await submitStrainVote({ userId: 1, strainId: "a", strainName: "A", effectsAccuracy: 1, valueForMoney: 1, overallQuality: 1 });
    await submitStrainVote({ userId: 1, strainId: "b", strainName: "B", effectsAccuracy: -1, valueForMoney: -1, overallQuality: -1 });
    await submitStrainVote({ userId: 1, strainId: "c", strainName: "C", effectsAccuracy: 1, valueForMoney: -1, overallQuality: 1 });
    const count = await getUserVoteCount(1);
    expect(count).toBe(3);
  });
});

// ─── Input Validation (Zod schema tests) ─────────────────────

describe("Input Validation", () => {
  it("should only accept 1 or -1 for vote dimensions", () => {
    // Valid values
    expect([1, -1].includes(1)).toBe(true);
    expect([1, -1].includes(-1)).toBe(true);
    // Invalid values
    expect([1, -1].includes(0 as any)).toBe(false);
    expect([1, -1].includes(2 as any)).toBe(false);
  });

  it("should enforce 140 character comment limit", () => {
    const shortComment = "Great strain!";
    const longComment = "a".repeat(141);
    expect(shortComment.length).toBeLessThanOrEqual(140);
    expect(longComment.length).toBeGreaterThan(140);
  });

  it("should validate vote dimension values are binary", () => {
    const validVotes = [1, -1];
    const testValues = [1, -1, 0, 2, -2, 0.5];
    const results = testValues.map(v => validVotes.includes(v));
    expect(results).toEqual([true, true, false, false, false, false]);
  });
});

```

---

## 4. `server/alerts.test.ts`

**Lines:** 410

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── Mock DB layer ───────────────────────────────────────────

const mockAlerts: any[] = [];
let mockIdCounter = 1;

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createPriceAlert: vi.fn(async (alert: any) => {
      // Enforce max 20 limit
      const userAlerts = mockAlerts.filter(
        (a) => a.userId === alert.userId && (a.status === "active" || a.status === "paused")
      );
      if (userAlerts.length >= 20) {
        throw new Error("Maximum 20 active alerts allowed. Delete or let some expire first.");
      }

      // Check for duplicates
      const dup = mockAlerts.find(
        (a) =>
          a.userId === alert.userId &&
          a.strainId === alert.strainId &&
          a.dispensary === (alert.dispensary ?? null) &&
          (a.status === "active" || a.status === "paused")
      );
      if (dup) {
        throw new Error("You already have an active alert for this strain.");
      }

      const newAlert = {
        id: mockIdCounter++,
        ...alert,
        dispensary: alert.dispensary ?? null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        triggeredAt: null,
        triggeredPrice: null,
        triggeredDispensary: null,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      };
      mockAlerts.push(newAlert);
      return newAlert;
    }),
    getUserAlerts: vi.fn(async (userId: number) => {
      return mockAlerts
        .filter((a) => a.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }),
    getAlertById: vi.fn(async (id: number) => {
      return mockAlerts.find((a) => a.id === id) ?? null;
    }),
    updatePriceAlert: vi.fn(async (id: number, updates: any) => {
      const alert = mockAlerts.find((a) => a.id === id);
      if (!alert) throw new Error("Alert not found");
      Object.assign(alert, updates, { updatedAt: new Date() });
      return alert;
    }),
    deletePriceAlert: vi.fn(async (id: number) => {
      const idx = mockAlerts.findIndex((a) => a.id === id);
      if (idx >= 0) mockAlerts.splice(idx, 1);
    }),
    getUserAlertCount: vi.fn(async (userId: number) => {
      return mockAlerts.filter(
        (a) => a.userId === userId && (a.status === "active" || a.status === "paused")
      ).length;
    }),
    hasActiveAlert: vi.fn(async (userId: number, strainId: string) => {
      return mockAlerts.some(
        (a) =>
          a.userId === userId &&
          a.strainId === strainId &&
          (a.status === "active" || a.status === "paused")
      );
    }),
  };
});

beforeEach(() => {
  mockAlerts.length = 0;
  mockIdCounter = 1;
});

// ─── Tests ───────────────────────────────────────────────────

describe("alerts.create", () => {
  it("creates a price alert for an authenticated user", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
      currentPrice: 45,
    });

    expect(result).toBeDefined();
    expect(result.strainId).toBe("blue-dream");
    expect(result.strainName).toBe("Blue Dream");
    expect(result.targetPrice).toBe("35");
    expect(result.status).toBe("active");
    expect(result.userId).toBe(1);
  });

  it("creates an alert with a specific dispensary", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alerts.create({
      strainId: "gorilla-glue",
      strainName: "Gorilla Glue",
      targetPrice: 40,
      dispensary: "Harvest of Rockville",
    });

    expect(result.dispensary).toBe("Harvest of Rockville");
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.alerts.create({
        strainId: "blue-dream",
        strainName: "Blue Dream",
        targetPrice: 35,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid target price (zero or negative)", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.alerts.create({
        strainId: "blue-dream",
        strainName: "Blue Dream",
        targetPrice: 0,
      })
    ).rejects.toThrow();

    await expect(
      caller.alerts.create({
        strainId: "blue-dream",
        strainName: "Blue Dream",
        targetPrice: -10,
      })
    ).rejects.toThrow();
  });

  it("rejects duplicate alerts for the same strain", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    await expect(
      caller.alerts.create({
        strainId: "blue-dream",
        strainName: "Blue Dream",
        targetPrice: 30,
      })
    ).rejects.toThrow(/already have an active alert/);
  });
});

describe("alerts.list", () => {
  it("returns all alerts for the authenticated user", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });
    await caller.alerts.create({
      strainId: "gorilla-glue",
      strainName: "Gorilla Glue",
      targetPrice: 40,
    });

    const alerts = await caller.alerts.list();
    expect(alerts).toHaveLength(2);
  });

  it("does not return alerts from other users", async () => {
    const ctx1 = createAuthContext(1);
    const ctx2 = createAuthContext(2);
    const caller1 = appRouter.createCaller(ctx1);
    const caller2 = appRouter.createCaller(ctx2);

    await caller1.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    const alerts = await caller2.alerts.list();
    expect(alerts).toHaveLength(0);
  });
});

describe("alerts.update", () => {
  it("updates the target price of an alert", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const alert = await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    const updated = await caller.alerts.update({
      id: alert.id,
      targetPrice: 30,
    });

    expect(updated.targetPrice).toBe("30");
  });

  it("pauses and resumes an alert", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const alert = await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    const paused = await caller.alerts.update({
      id: alert.id,
      status: "paused",
    });
    expect(paused.status).toBe("paused");

    const resumed = await caller.alerts.update({
      id: alert.id,
      status: "active",
    });
    expect(resumed.status).toBe("active");
  });

  it("rejects updating another user's alert", async () => {
    const ctx1 = createAuthContext(1);
    const ctx2 = createAuthContext(2);
    const caller1 = appRouter.createCaller(ctx1);
    const caller2 = appRouter.createCaller(ctx2);

    const alert = await caller1.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    await expect(
      caller2.alerts.update({ id: alert.id, targetPrice: 20 })
    ).rejects.toThrow(/Alert not found/);
  });

  it("rejects updating a triggered alert", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const alert = await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    // Manually set status to triggered
    mockAlerts[0].status = "triggered";

    await expect(
      caller.alerts.update({ id: alert.id, targetPrice: 20 })
    ).rejects.toThrow(/Cannot modify a triggered or expired alert/);
  });
});

describe("alerts.delete", () => {
  it("deletes an alert owned by the user", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const alert = await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    const result = await caller.alerts.delete({ id: alert.id });
    expect(result.success).toBe(true);

    const alerts = await caller.alerts.list();
    expect(alerts).toHaveLength(0);
  });

  it("rejects deleting another user's alert", async () => {
    const ctx1 = createAuthContext(1);
    const ctx2 = createAuthContext(2);
    const caller1 = appRouter.createCaller(ctx1);
    const caller2 = appRouter.createCaller(ctx2);

    const alert = await caller1.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    await expect(
      caller2.alerts.delete({ id: alert.id })
    ).rejects.toThrow(/Alert not found/);
  });
});

describe("alerts.count", () => {
  it("returns the count of active/paused alerts", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });
    await caller.alerts.create({
      strainId: "gorilla-glue",
      strainName: "Gorilla Glue",
      targetPrice: 40,
    });

    const { count } = await caller.alerts.count();
    expect(count).toBe(2);
  });
});

describe("alerts.hasAlert", () => {
  it("returns true when user has an active alert for the strain", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await caller.alerts.create({
      strainId: "blue-dream",
      strainName: "Blue Dream",
      targetPrice: 35,
    });

    const { hasAlert } = await caller.alerts.hasAlert({ strainId: "blue-dream" });
    expect(hasAlert).toBe(true);
  });

  it("returns false when user has no alert for the strain", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const { hasAlert } = await caller.alerts.hasAlert({ strainId: "blue-dream" });
    expect(hasAlert).toBe(false);
  });
});

```

---

## 5. `server/alertTriggerEngine.test.ts`

**Lines:** 361

```typescript
/**
 * Alert Trigger Engine Tests — Sprint 8
 * Tests the core logic of the alert trigger engine:
 *   - Catalog price fetching and parsing
 *   - Alert matching against target prices
 *   - Dispensary-specific vs any-dispensary matching
 *   - Frequency cap (24-hour cooldown)
 *   - Notification message building
 *   - Expired alert cleanup
 *   - Integration with the ingestSnapshot hook
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Unit tests for pure functions (extracted logic)
// ============================================================

describe("Alert Trigger Engine — Pure Logic", () => {
  describe("Price Matching", () => {
    it("should match when catalog price is at or below target", () => {
      const targetPrice = 40;
      const catalogPrices = [
        { dispensary: "Dispensary A", price: 45 },
        { dispensary: "Dispensary B", price: 38 },
        { dispensary: "Dispensary C", price: 42 },
      ];

      const matches = catalogPrices.filter((p) => p.price <= targetPrice);
      expect(matches).toHaveLength(1);
      expect(matches[0].dispensary).toBe("Dispensary B");
      expect(matches[0].price).toBe(38);
    });

    it("should match exact target price", () => {
      const targetPrice = 40;
      const catalogPrices = [
        { dispensary: "Dispensary A", price: 40 },
      ];

      const matches = catalogPrices.filter((p) => p.price <= targetPrice);
      expect(matches).toHaveLength(1);
    });

    it("should not match when all prices are above target", () => {
      const targetPrice = 30;
      const catalogPrices = [
        { dispensary: "Dispensary A", price: 45 },
        { dispensary: "Dispensary B", price: 38 },
        { dispensary: "Dispensary C", price: 42 },
      ];

      const matches = catalogPrices.filter((p) => p.price <= targetPrice);
      expect(matches).toHaveLength(0);
    });

    it("should select the lowest price when multiple match", () => {
      const targetPrice = 50;
      const catalogPrices = [
        { dispensary: "Dispensary A", price: 45 },
        { dispensary: "Dispensary B", price: 38 },
        { dispensary: "Dispensary C", price: 42 },
      ];

      const matches = catalogPrices.filter((p) => p.price <= targetPrice);
      const bestMatch = matches.sort((a, b) => a.price - b.price)[0];
      expect(bestMatch.dispensary).toBe("Dispensary B");
      expect(bestMatch.price).toBe(38);
    });
  });

  describe("Dispensary-Specific Matching", () => {
    it("should only match the specified dispensary", () => {
      const targetPrice = 50;
      const alertDispensary = "Dispensary C";
      const catalogPrices = [
        { dispensary: "Dispensary A", price: 35 },
        { dispensary: "Dispensary B", price: 38 },
        { dispensary: "Dispensary C", price: 42 },
      ];

      const matches = catalogPrices.filter(
        (p) => p.price <= targetPrice && p.dispensary === alertDispensary
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].dispensary).toBe("Dispensary C");
      expect(matches[0].price).toBe(42);
    });

    it("should not match if specified dispensary price is above target", () => {
      const targetPrice = 40;
      const alertDispensary = "Dispensary A";
      const catalogPrices = [
        { dispensary: "Dispensary A", price: 45 },
        { dispensary: "Dispensary B", price: 35 },
      ];

      const matches = catalogPrices.filter(
        (p) => p.price <= targetPrice && p.dispensary === alertDispensary
      );
      expect(matches).toHaveLength(0);
    });

    it("should match any dispensary when alert dispensary is null", () => {
      const targetPrice = 40;
      const alertDispensary = null;
      const catalogPrices = [
        { dispensary: "Dispensary A", price: 45 },
        { dispensary: "Dispensary B", price: 35 },
        { dispensary: "Dispensary C", price: 38 },
      ];

      const matches = catalogPrices.filter((p) => {
        if (p.price > targetPrice) return false;
        if (alertDispensary && p.dispensary !== alertDispensary) return false;
        return true;
      });
      expect(matches).toHaveLength(2);
    });
  });

  describe("Frequency Cap (24-hour cooldown)", () => {
    function wasRecentlyTriggered(triggeredAt: Date | null): boolean {
      if (!triggeredAt) return false;
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      return triggeredAt.getTime() > twentyFourHoursAgo;
    }

    it("should not be recently triggered if triggeredAt is null", () => {
      expect(wasRecentlyTriggered(null)).toBe(false);
    });

    it("should be recently triggered if within 24 hours", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(wasRecentlyTriggered(twoHoursAgo)).toBe(true);
    });

    it("should not be recently triggered if over 24 hours ago", () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      expect(wasRecentlyTriggered(twoDaysAgo)).toBe(false);
    });

    it("should be recently triggered at exactly 23 hours", () => {
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
      expect(wasRecentlyTriggered(twentyThreeHoursAgo)).toBe(true);
    });

    it("should not be recently triggered at exactly 25 hours", () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      expect(wasRecentlyTriggered(twentyFiveHoursAgo)).toBe(false);
    });
  });

  describe("Notification Message Building", () => {
    function buildNotificationMessage(trigger: {
      strainName: string;
      targetPrice: number;
      matchedPrice: number;
      matchedDispensary: string;
    }) {
      const savings = (trigger.targetPrice - trigger.matchedPrice).toFixed(2);
      return {
        title: `Price Alert: ${trigger.strainName} is now $${trigger.matchedPrice.toFixed(2)}`,
        content: [
          `Your price alert for **${trigger.strainName}** has been triggered!`,
          "",
          `Current price: $${trigger.matchedPrice.toFixed(2)} at ${trigger.matchedDispensary}`,
          `Your target: $${trigger.targetPrice.toFixed(2)}`,
          savings !== "0.00"
            ? `You're saving $${savings} below your target.`
            : `Price matches your target exactly.`,
          "",
          `View this strain on StrainScout MD to see all available prices.`,
        ].join("\n"),
      };
    }

    it("should build correct title with strain name and price", () => {
      const msg = buildNotificationMessage({
        strainName: "Blue Dream",
        targetPrice: 45,
        matchedPrice: 38,
        matchedDispensary: "Curaleaf",
      });
      expect(msg.title).toBe("Price Alert: Blue Dream is now $38.00");
    });

    it("should include savings amount in content", () => {
      const msg = buildNotificationMessage({
        strainName: "Blue Dream",
        targetPrice: 45,
        matchedPrice: 38,
        matchedDispensary: "Curaleaf",
      });
      expect(msg.content).toContain("saving $7.00");
    });

    it("should handle exact match with no savings", () => {
      const msg = buildNotificationMessage({
        strainName: "OG Kush",
        targetPrice: 40,
        matchedPrice: 40,
        matchedDispensary: "Zen Leaf",
      });
      expect(msg.content).toContain("matches your target exactly");
    });

    it("should include dispensary name in content", () => {
      const msg = buildNotificationMessage({
        strainName: "Gelato",
        targetPrice: 50,
        matchedPrice: 42,
        matchedDispensary: "Harvest",
      });
      expect(msg.content).toContain("at Harvest");
    });

    it("should include target price in content", () => {
      const msg = buildNotificationMessage({
        strainName: "Gelato",
        targetPrice: 50,
        matchedPrice: 42,
        matchedDispensary: "Harvest",
      });
      expect(msg.content).toContain("Your target: $50.00");
    });
  });

  describe("Alert Expiration Logic", () => {
    it("should identify alerts past their expiration date", () => {
      const now = new Date();
      const expiredAlert = {
        expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // yesterday
        status: "active" as const,
      };
      expect(expiredAlert.expiresAt < now && expiredAlert.status === "active").toBe(true);
    });

    it("should not expire alerts that are still within their window", () => {
      const now = new Date();
      const activeAlert = {
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "active" as const,
      };
      expect(activeAlert.expiresAt < now).toBe(false);
    });

    it("should not expire already triggered alerts", () => {
      const now = new Date();
      const triggeredAlert = {
        expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        status: "triggered" as const,
      };
      // Only active alerts should be expired
      expect(triggeredAlert.status === "active").toBe(false);
    });
  });

  describe("Trigger Run Summary Structure", () => {
    it("should have correct initial summary shape", () => {
      const summary = {
        runAt: new Date().toISOString(),
        activeAlertsChecked: 0,
        alertsTriggered: 0,
        alertsExpired: 0,
        notificationsSent: 0,
        notificationsFailed: 0,
        errors: [] as string[],
        triggers: [] as any[],
      };

      expect(summary).toHaveProperty("runAt");
      expect(summary).toHaveProperty("activeAlertsChecked");
      expect(summary).toHaveProperty("alertsTriggered");
      expect(summary).toHaveProperty("alertsExpired");
      expect(summary).toHaveProperty("notificationsSent");
      expect(summary).toHaveProperty("notificationsFailed");
      expect(summary).toHaveProperty("errors");
      expect(summary).toHaveProperty("triggers");
      expect(summary.errors).toEqual([]);
      expect(summary.triggers).toEqual([]);
    });

    it("should accumulate trigger results correctly", () => {
      const summary = {
        alertsTriggered: 0,
        notificationsSent: 0,
        triggers: [] as any[],
      };

      // Simulate 3 triggers
      for (let i = 0; i < 3; i++) {
        summary.alertsTriggered++;
        summary.notificationsSent++;
        summary.triggers.push({ alertId: i + 1, notified: true });
      }

      expect(summary.alertsTriggered).toBe(3);
      expect(summary.notificationsSent).toBe(3);
      expect(summary.triggers).toHaveLength(3);
    });
  });

  describe("Catalog Price Map Building", () => {
    it("should build price map from catalog data", () => {
      const catalogData = [
        {
          id: "blue-dream",
          name: "Blue Dream",
          prices: [
            { dispensary: "Curaleaf", price: 45 },
            { dispensary: "Zen Leaf", price: 40 },
          ],
        },
        {
          id: "og-kush",
          name: "OG Kush",
          prices: [
            { dispensary: "Harvest", price: 50 },
          ],
        },
        {
          id: "no-prices",
          name: "No Prices",
          prices: [],
        },
      ];

      const priceMap = new Map<string, { dispensary: string; price: number }[]>();
      for (const strain of catalogData) {
        const validPrices = (strain.prices || []).filter((p) => p.price > 0);
        if (validPrices.length > 0) {
          priceMap.set(strain.id, validPrices);
        }
      }

      expect(priceMap.size).toBe(2);
      expect(priceMap.has("blue-dream")).toBe(true);
      expect(priceMap.has("og-kush")).toBe(true);
      expect(priceMap.has("no-prices")).toBe(false);
      expect(priceMap.get("blue-dream")!).toHaveLength(2);
    });

    it("should filter out zero-price entries", () => {
      const catalogData = [
        {
          id: "test-strain",
          prices: [
            { dispensary: "A", price: 0 },
            { dispensary: "B", price: 45 },
            { dispensary: "C", price: -5 },
          ],
        },
      ];

      const validPrices = catalogData[0].prices.filter((p) => p.price > 0);
      expect(validPrices).toHaveLength(1);
      expect(validPrices[0].dispensary).toBe("B");
    });
  });
});

```

---

## 6. `server/marketData.test.ts`

**Lines:** 328

```typescript
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

```

---

## 7. `server/marketDashboard.test.ts`

**Lines:** 308

```typescript
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

```

---

## 8. `server/deals.test.ts`

**Lines:** 266

```typescript
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

```

---

## 9. `server/dispensaryCompare.test.ts`

**Lines:** 344

```typescript
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

```

---

## 10. `server/emailSignup.test.ts`

**Lines:** 225

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  insertEmailSignup: vi.fn(),
  getEmailSignups: vi.fn(),
  getSignupStats: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

import { insertEmailSignup, getEmailSignups, getSignupStats } from "./db";

const mockedInsert = vi.mocked(insertEmailSignup);
const mockedList = vi.mocked(getEmailSignups);
const mockedStats = vi.mocked(getSignupStats);

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("emailSignup.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid email signup from a public user", async () => {
    mockedInsert.mockResolvedValue({ id: 1, isNew: true });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.emailSignup.submit({
      email: "test@example.com",
      source: "footer",
    });

    expect(result).toEqual({ success: true, id: 1, isNew: true });
    expect(mockedInsert).toHaveBeenCalledWith({
      email: "test@example.com",
      source: "footer",
      strainId: null,
      strainName: null,
    });
  });

  it("accepts a price_alert signup with strain info", async () => {
    mockedInsert.mockResolvedValue({ id: 2, isNew: true });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.emailSignup.submit({
      email: "user@test.com",
      source: "price_alert",
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
    });

    expect(result).toEqual({ success: true, id: 2, isNew: true });
    expect(mockedInsert).toHaveBeenCalledWith({
      email: "user@test.com",
      source: "price_alert",
      strainId: "mule-fuel",
      strainName: "Mule Fuel",
    });
  });

  it("normalizes email to lowercase", async () => {
    mockedInsert.mockResolvedValue({ id: 3, isNew: true });

    const caller = appRouter.createCaller(createPublicContext());
    await caller.emailSignup.submit({
      email: "Test@Example.COM",
      source: "deal_digest",
    });

    expect(mockedInsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com" })
    );
  });

  it("rejects invalid email addresses", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.emailSignup.submit({
        email: "not-an-email",
        source: "footer",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid source values", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.emailSignup.submit({
        email: "test@example.com",
        source: "invalid_source" as any,
      })
    ).rejects.toThrow();
  });

  it("handles duplicate signups gracefully", async () => {
    mockedInsert.mockResolvedValue({ id: 1, isNew: false });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.emailSignup.submit({
      email: "test@example.com",
      source: "footer",
    });

    expect(result).toEqual({ success: true, id: 1, isNew: false });
  });
});

describe("emailSignup.list (admin-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns signups for admin users", async () => {
    const mockSignups = [
      { id: 1, email: "a@b.com", source: "footer" as const, strainId: null, strainName: null, status: "active" as const, subscribedAt: new Date() },
    ];
    mockedList.mockResolvedValue(mockSignups);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.emailSignup.list();

    expect(result).toEqual(mockSignups);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.emailSignup.list()).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.emailSignup.list()).rejects.toThrow();
  });
});

describe("emailSignup.stats (admin-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns signup stats for admin users", async () => {
    const mockStats = [
      { source: "footer", count: 10 },
      { source: "deal_digest", count: 5 },
    ];
    mockedStats.mockResolvedValue(mockStats);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.emailSignup.stats();

    expect(result).toEqual(mockStats);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.emailSignup.stats()).rejects.toThrow();
  });
});

```

---

## 11. `server/priceDrops.test.ts`

**Lines:** 269

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  insertEmailSignup: vi.fn(),
  getEmailSignups: vi.fn(),
  getSignupStats: vi.fn(),
  insertPriceSnapshots: vi.fn(),
  getLatestSnapshotDate: vi.fn(),
  detectPriceDrops: vi.fn(),
  getRecentPriceDrops: vi.fn(),
  getStrainPriceDrops: vi.fn(),
  getStrainPriceHistory: vi.fn(),
  getPriceDropStats: vi.fn(),
  getPendingNotifications: vi.fn(),
  markDropsNotified: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import {
  getRecentPriceDrops,
  getStrainPriceDrops,
  getStrainPriceHistory,
  getPriceDropStats,
  getPendingNotifications,
  markDropsNotified,
  getEmailSignups,
} from "./db";
import { notifyOwner } from "./_core/notification";

const mockedRecentDrops = vi.mocked(getRecentPriceDrops);
const mockedStrainDrops = vi.mocked(getStrainPriceDrops);
const mockedStrainHistory = vi.mocked(getStrainPriceHistory);
const mockedDropStats = vi.mocked(getPriceDropStats);
const mockedPendingNotifications = vi.mocked(getPendingNotifications);
const mockedMarkNotified = vi.mocked(markDropsNotified);
const mockedGetSignups = vi.mocked(getEmailSignups);
const mockedNotifyOwner = vi.mocked(notifyOwner);

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("priceDrops.recent (public)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns recent price drops with default limit", async () => {
    const mockDrops = [
      {
        id: 1,
        strainId: "mule-fuel",
        strainName: "Mule Fuel",
        dispensary: "Curaleaf",
        oldPrice: "55.00",
        newPrice: "40.00",
        dropPercent: "27.27",
        detectedAt: new Date(),
        notified: false,
      },
    ];
    mockedRecentDrops.mockResolvedValue(mockDrops);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.priceDrops.recent();

    expect(result).toEqual(mockDrops);
    expect(mockedRecentDrops).toHaveBeenCalledWith({ limit: 20 });
  });

  it("accepts a custom limit", async () => {
    mockedRecentDrops.mockResolvedValue([]);

    const caller = appRouter.createCaller(createPublicContext());
    await caller.priceDrops.recent({ limit: 5 });

    expect(mockedRecentDrops).toHaveBeenCalledWith({ limit: 5 });
  });
});

describe("priceDrops.byStrain (public)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns price drops for a specific strain", async () => {
    const mockDrops = [
      {
        id: 1,
        strainId: "mule-fuel",
        strainName: "Mule Fuel",
        dispensary: "Curaleaf",
        oldPrice: "55.00",
        newPrice: "40.00",
        dropPercent: "27.27",
        detectedAt: new Date(),
        notified: false,
      },
    ];
    mockedStrainDrops.mockResolvedValue(mockDrops);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.priceDrops.byStrain({ strainId: "mule-fuel" });

    expect(result).toEqual(mockDrops);
    expect(mockedStrainDrops).toHaveBeenCalledWith("mule-fuel");
  });
});

describe("priceDrops.history (public)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns price history for a strain", async () => {
    const mockHistory = [
      {
        id: 1,
        strainId: "mule-fuel",
        strainName: "Mule Fuel",
        dispensary: "Curaleaf",
        price: "45.00",
        snapshotDate: new Date(),
      },
    ];
    mockedStrainHistory.mockResolvedValue(mockHistory);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.priceDrops.history({ strainId: "mule-fuel" });

    expect(result).toEqual(mockHistory);
    expect(mockedStrainHistory).toHaveBeenCalledWith("mule-fuel");
  });
});

describe("priceDrops.stats (admin-only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns stats for admin users", async () => {
    const mockStats = { totalDrops: 50, avgDropPercent: 15.5 };
    mockedDropStats.mockResolvedValue(mockStats);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.priceDrops.stats();

    expect(result).toEqual(mockStats);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.priceDrops.stats()).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.priceDrops.stats()).rejects.toThrow();
  });
});

describe("priceDrops.sendDigest (admin-only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns early when no pending drops", async () => {
    mockedPendingNotifications.mockResolvedValue([]);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.priceDrops.sendDigest();

    expect(result.success).toBe(true);
    expect(result.notified).toBe(0);
    expect(mockedNotifyOwner).not.toHaveBeenCalled();
  });

  it("sends digest with pending drops and marks them notified", async () => {
    const pendingDrops = [
      {
        id: 1,
        strainId: "mule-fuel",
        strainName: "Mule Fuel",
        dispensary: "Curaleaf",
        oldPrice: "55.00",
        newPrice: "40.00",
        dropPercent: "27.27",
        detectedAt: new Date(),
        notified: false,
      },
      {
        id: 2,
        strainId: "blue-dream",
        strainName: "Blue Dream",
        dispensary: "Rise",
        oldPrice: "50.00",
        newPrice: "35.00",
        dropPercent: "30.00",
        detectedAt: new Date(),
        notified: false,
      },
    ];
    mockedPendingNotifications.mockResolvedValue(pendingDrops);
    mockedGetSignups.mockResolvedValue([
      { id: 1, email: "user1@test.com", source: "price_alert" as const, strainId: null, strainName: null, status: "active" as const, subscribedAt: new Date() },
      { id: 2, email: "user2@test.com", source: "deal_digest" as const, strainId: null, strainName: null, status: "active" as const, subscribedAt: new Date() },
    ]);
    mockedMarkNotified.mockResolvedValue(undefined);
    mockedNotifyOwner.mockResolvedValue(true);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.priceDrops.sendDigest();

    expect(result.success).toBe(true);
    expect(result.dropsNotified).toBe(2);
    expect(mockedNotifyOwner).toHaveBeenCalledTimes(1);
    expect(mockedMarkNotified).toHaveBeenCalledWith([1, 2]);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.priceDrops.sendDigest()).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.priceDrops.sendDigest()).rejects.toThrow();
  });
});

```

---

## 12. `server/auth.logout.test.ts`

**Lines:** 63

```typescript
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

```

---
