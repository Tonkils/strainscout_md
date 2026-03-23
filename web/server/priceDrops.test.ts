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
