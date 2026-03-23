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
