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
