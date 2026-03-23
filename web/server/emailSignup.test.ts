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
