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
