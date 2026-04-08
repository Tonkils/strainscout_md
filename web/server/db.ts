import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, emailSignups, priceSnapshots, priceDrops, priceAlerts, strainVotes, strainComments, dispensaryPartners, partnerPriceUpdates, type InsertEmailSignup, type EmailSignup, type InsertPriceSnapshot, type PriceSnapshot, type InsertPriceDrop, type PriceDrop, type PriceAlert, type InsertPriceAlert, type StrainVote, type InsertStrainVote, type StrainComment, type InsertStrainComment, type DispensaryPartner, type InsertDispensaryPartner, type PartnerPriceUpdate, type InsertPartnerPriceUpdate } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Wraps a database operation with standardized error handling.
 * Prevents raw MySQL error details (table names, column info, query fragments)
 * from leaking to clients while preserving meaningful user-facing messages.
 */
async function withDbErrorHandling<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error(`[Database] ${operation} failed:`, error);
    // Sanitize MySQL-specific error details before propagating
    if (error?.code === "ER_DUP_ENTRY" || error?.message?.includes("Duplicate entry")) {
      throw new Error("A duplicate record already exists.");
    }
    if (error?.code === "ER_NO_SUCH_TABLE") {
      throw new Error("Database is being updated. Please try again shortly.");
    }
    if (error?.code?.startsWith?.("ER_") || error?.errno) {
      throw new Error("A database error occurred. Please try again.");
    }
    throw error; // Non-MySQL errors pass through
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Insert an email signup, silently upsert if duplicate email+source exists.
 */
export async function insertEmailSignup(signup: InsertEmailSignup): Promise<{ id: number; isNew: boolean }> {
  return withDbErrorHandling("insertEmailSignup", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check for existing signup with same email + source
    const existing = await db
      .select({ id: emailSignups.id })
      .from(emailSignups)
      .where(
        and(
          eq(emailSignups.email, signup.email),
          eq(emailSignups.source, signup.source)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { id: existing[0].id, isNew: false };
    }

    const result = await db.insert(emailSignups).values(signup);
    return { id: Number(result[0].insertId), isNew: true };
  });
}

/**
 * Get all active email signups, optionally filtered by source.
 */
export async function getEmailSignups(source?: string): Promise<EmailSignup[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (source) {
    return db
      .select()
      .from(emailSignups)
      .where(
        and(
          eq(emailSignups.status, "active"),
          eq(emailSignups.source, source as any)
        )
      )
      .orderBy(emailSignups.subscribedAt);
  }

  return db
    .select()
    .from(emailSignups)
    .where(eq(emailSignups.status, "active"))
    .orderBy(emailSignups.subscribedAt);
}

/**
 * Get signup counts grouped by source.
 */
export async function getSignupStats(): Promise<{ source: string; count: number }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      source: emailSignups.source,
      count: sql<number>`count(*)`
    })
    .from(emailSignups)
    .where(eq(emailSignups.status, "active"))
    .groupBy(emailSignups.source);

  return result;
}

// ============================================================
// Price Snapshots & Price Drops
// ============================================================

/**
 * Ingest a batch of price snapshots from the CDN catalog.
 * Uses INSERT IGNORE to skip duplicates (same strain+dispensary+date).
 */
export async function insertPriceSnapshots(snapshots: { strainId: string; strainName: string; dispensary: string; price: string; snapshotDate: Date }[]): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (snapshots.length === 0) return 0;

  // Insert in batches of 500 to avoid query size limits
  let inserted = 0;
  for (let i = 0; i < snapshots.length; i += 500) {
    const batch = snapshots.slice(i, i + 500);
    try {
      await db.insert(priceSnapshots).values(batch).onDuplicateKeyUpdate({
        set: { price: sql`VALUES(price)` },
      });
      inserted += batch.length;
    } catch (err) {
      console.error(`[PriceSnapshot] Batch insert error at offset ${i}:`, err);
    }
  }
  return inserted;
}

/**
 * Get the most recent snapshot date in the database.
 */
export async function getLatestSnapshotDate(): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ maxDate: sql<string>`MAX(snapshotDate)` })
    .from(priceSnapshots);

  return result[0]?.maxDate ?? null;
}

/**
 * Detect price drops by comparing the latest snapshot date with the previous one.
 * Returns the number of drops detected and inserted.
 */
export async function detectPriceDrops(currentDate: string, previousDate: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find all strain+dispensary pairs where price decreased
  const drops = await db.execute(sql`
    INSERT INTO price_drops (strainId, strainName, dispensary, oldPrice, newPrice, dropAmount, dropPercent, snapshotDate, notified)
    SELECT
      curr.strainId,
      curr.strainName,
      curr.dispensary,
      prev.price AS oldPrice,
      curr.price AS newPrice,
      ROUND(prev.price - curr.price, 2) AS dropAmount,
      ROUND(((prev.price - curr.price) / prev.price) * 100, 2) AS dropPercent,
      curr.snapshotDate,
      'pending'
    FROM price_snapshots curr
    JOIN price_snapshots prev
      ON curr.strainId = prev.strainId
      AND curr.dispensary = prev.dispensary
      AND prev.snapshotDate = ${previousDate}
    WHERE curr.snapshotDate = ${currentDate}
      AND curr.price < prev.price
      AND prev.price > 0
      AND ((prev.price - curr.price) / prev.price) >= 0.03
    ON DUPLICATE KEY UPDATE id = id
  `);

  // Count how many rows were inserted
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(priceDrops)
    .where(sql`snapshotDate = ${currentDate}`);

  return countResult[0]?.count ?? 0;
}

/**
 * Get recent price drops, optionally filtered by strain type.
 * Returns the most recent drops sorted by drop percentage.
 */
export async function getRecentPriceDrops(options?: {
  limit?: number;
  strainType?: string;
}): Promise<PriceDrop[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = options?.limit ?? 20;

  const result = await db
    .select()
    .from(priceDrops)
    .orderBy(sql`detectedAt DESC, dropPercent DESC`)
    .limit(limit);

  return result;
}

/**
 * Get price drops for a specific strain.
 */
export async function getStrainPriceDrops(strainId: string): Promise<PriceDrop[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(priceDrops)
    .where(eq(priceDrops.strainId, strainId))
    .orderBy(sql`detectedAt DESC`);
}

/**
 * Get price history for a specific strain across all dispensaries.
 */
export async function getStrainPriceHistory(strainId: string): Promise<PriceSnapshot[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(priceSnapshots)
    .where(eq(priceSnapshots.strainId, strainId))
    .orderBy(sql`snapshotDate DESC, dispensary ASC`);
}

/**
 * Get pending price drops that haven't been notified yet.
 */
export async function getPendingNotifications(): Promise<PriceDrop[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(priceDrops)
    .where(eq(priceDrops.notified, "pending"))
    .orderBy(sql`dropPercent DESC`);
}

/**
 * Mark price drops as notified.
 */
export async function markDropsNotified(dropIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (dropIds.length === 0) return;

  for (const id of dropIds) {
    await db
      .update(priceDrops)
      .set({ notified: "sent" })
      .where(eq(priceDrops.id, id));
  }
}

/**
 * Get price drop summary stats.
 */
export async function getPriceDropStats(): Promise<{
  totalDrops: number;
  avgDropPercent: number;
  biggestDrop: PriceDrop | null;
  pendingNotifications: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [totalResult, avgResult, pendingResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(priceDrops),
    db.select({ avg: sql<number>`COALESCE(AVG(dropPercent), 0)` }).from(priceDrops),
    db.select({ count: sql<number>`count(*)` }).from(priceDrops).where(eq(priceDrops.notified, "pending")),
  ]);

  const biggest = await db
    .select()
    .from(priceDrops)
    .orderBy(sql`dropPercent DESC`)
    .limit(1);

  return {
    totalDrops: totalResult[0]?.count ?? 0,
    avgDropPercent: Math.round((avgResult[0]?.avg ?? 0) * 100) / 100,
    biggestDrop: biggest[0] ?? null,
    pendingNotifications: pendingResult[0]?.count ?? 0,
  };
}

// ============================================================
// Price Alerts
// ============================================================

const MAX_ALERTS_PER_USER = 20;

/**
 * Create a new price alert for a user.
 * Enforces the 20-alert-per-user limit.
 */
export async function createPriceAlert(alert: {
  userId: number;
  strainId: string;
  strainName: string;
  dispensary?: string | null;
  targetPrice: string;
  currentPrice?: string | null;
}): Promise<PriceAlert> {
  return withDbErrorHandling("createPriceAlert", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check active alert count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.userId, alert.userId),
          inArray(priceAlerts.status, ["active", "paused"])
        )
      );

    if ((countResult[0]?.count ?? 0) >= MAX_ALERTS_PER_USER) {
      throw new Error(`Maximum ${MAX_ALERTS_PER_USER} active alerts allowed. Delete or let some expire first.`);
    }

    // Check for duplicate: same user + strain + dispensary with active/paused status
    const existing = await db
      .select({ id: priceAlerts.id })
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.userId, alert.userId),
          eq(priceAlerts.strainId, alert.strainId),
          alert.dispensary
            ? eq(priceAlerts.dispensary, alert.dispensary)
            : sql`dispensary IS NULL`,
          inArray(priceAlerts.status, ["active", "paused"])
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("You already have an active alert for this strain" + (alert.dispensary ? ` at ${alert.dispensary}` : "") + ".");
    }

    // Set expiration to 90 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const result = await db.insert(priceAlerts).values({
      userId: alert.userId,
      strainId: alert.strainId,
      strainName: alert.strainName,
      dispensary: alert.dispensary ?? null,
      targetPrice: alert.targetPrice,
      currentPrice: alert.currentPrice ?? null,
      status: "active",
      expiresAt,
    });

    const inserted = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.id, Number(result[0].insertId)))
      .limit(1);

    return inserted[0];
  });
}

/**
 * Get all alerts for a user, ordered by most recent first.
 */
export async function getUserAlerts(userId: number): Promise<PriceAlert[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.userId, userId))
    .orderBy(desc(priceAlerts.createdAt));
}

/**
 * Get a single alert by ID (for ownership verification).
 */
export async function getAlertById(alertId: number): Promise<PriceAlert | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.id, alertId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Update an alert's target price or status.
 */
export async function updatePriceAlert(
  alertId: number,
  updates: {
    targetPrice?: string;
    status?: "active" | "paused" | "triggered" | "expired";
    dispensary?: string | null;
  }
): Promise<PriceAlert> {
  return withDbErrorHandling("updatePriceAlert", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const set: Record<string, unknown> = {};
    if (updates.targetPrice !== undefined) set.targetPrice = updates.targetPrice;
    if (updates.status !== undefined) set.status = updates.status;
    if (updates.dispensary !== undefined) set.dispensary = updates.dispensary;

    if (Object.keys(set).length === 0) {
      throw new Error("No updates provided");
    }

    await db
      .update(priceAlerts)
      .set(set)
      .where(eq(priceAlerts.id, alertId));

    const updated = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.id, alertId))
      .limit(1);

    return updated[0];
  });
}

/**
 * Delete an alert.
 */
export async function deletePriceAlert(alertId: number): Promise<void> {
  return withDbErrorHandling("deletePriceAlert", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.delete(priceAlerts).where(eq(priceAlerts.id, alertId));
  });
}

/**
 * Get active alert count for a user.
 */
export async function getUserAlertCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(priceAlerts)
    .where(
      and(
        eq(priceAlerts.userId, userId),
        inArray(priceAlerts.status, ["active", "paused"])
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Check if a user has an active alert for a specific strain.
 */
export async function hasActiveAlert(userId: number, strainId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ id: priceAlerts.id })
    .from(priceAlerts)
    .where(
      and(
        eq(priceAlerts.userId, userId),
        eq(priceAlerts.strainId, strainId),
        inArray(priceAlerts.status, ["active", "paused"])
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Get all active alerts (for the background trigger job in Sprint 8).
 */
export async function getActiveAlerts(): Promise<PriceAlert[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.status, "active"));
}


// ─── Strain Votes ────────────────────────────────────────────────────────────

/**
 * Submit or update a vote for a strain.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE to handle one-vote-per-user-per-strain.
 */
export async function submitStrainVote(vote: {
  userId: number;
  strainId: string;
  strainName: string;
  effectsAccuracy: number;
  valueForMoney: number;
  overallQuality: number;
  comment?: string | null;
}): Promise<{ id: number; isNew: boolean }> {
  return withDbErrorHandling("submitStrainVote", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if user already voted on this strain
    const existing = await db
      .select({ id: strainVotes.id })
      .from(strainVotes)
      .where(and(eq(strainVotes.userId, vote.userId), eq(strainVotes.strainId, vote.strainId)))
      .limit(1);

    if (existing.length > 0) {
      // Update existing vote
      await db
        .update(strainVotes)
        .set({
          effectsAccuracy: vote.effectsAccuracy,
          valueForMoney: vote.valueForMoney,
          overallQuality: vote.overallQuality,
          comment: vote.comment ?? null,
          strainName: vote.strainName,
        })
        .where(eq(strainVotes.id, existing[0].id));
      return { id: existing[0].id, isNew: false };
    }

    // Insert new vote
    const result = await db.insert(strainVotes).values({
      userId: vote.userId,
      strainId: vote.strainId,
      strainName: vote.strainName,
      effectsAccuracy: vote.effectsAccuracy,
      valueForMoney: vote.valueForMoney,
      overallQuality: vote.overallQuality,
      comment: vote.comment ?? null,
    });
    return { id: Number(result[0].insertId), isNew: true };
  });
}

/**
 * Get the current user's vote for a specific strain (or null if not voted).
 */
export async function getUserStrainVote(userId: number, strainId: string): Promise<StrainVote | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(strainVotes)
    .where(and(eq(strainVotes.userId, userId), eq(strainVotes.strainId, strainId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get aggregate vote data for a strain:
 * total votes, thumbs up/down counts and percentages for each dimension.
 */
export async function getStrainVoteAggregates(strainId: string): Promise<{
  totalVotes: number;
  effectsAccuracy: { up: number; down: number; upPercent: number };
  valueForMoney: { up: number; down: number; upPercent: number };
  overallQuality: { up: number; down: number; upPercent: number };
}> {
  const db = await getDb();
  if (!db) return {
    totalVotes: 0,
    effectsAccuracy: { up: 0, down: 0, upPercent: 0 },
    valueForMoney: { up: 0, down: 0, upPercent: 0 },
    overallQuality: { up: 0, down: 0, upPercent: 0 },
  };

  const rows = await db
    .select({
      totalVotes: sql<number>`COUNT(*)`,
      effectsUp: sql<number>`SUM(CASE WHEN ${strainVotes.effectsAccuracy} = 1 THEN 1 ELSE 0 END)`,
      effectsDown: sql<number>`SUM(CASE WHEN ${strainVotes.effectsAccuracy} = -1 THEN 1 ELSE 0 END)`,
      valueUp: sql<number>`SUM(CASE WHEN ${strainVotes.valueForMoney} = 1 THEN 1 ELSE 0 END)`,
      valueDown: sql<number>`SUM(CASE WHEN ${strainVotes.valueForMoney} = -1 THEN 1 ELSE 0 END)`,
      qualityUp: sql<number>`SUM(CASE WHEN ${strainVotes.overallQuality} = 1 THEN 1 ELSE 0 END)`,
      qualityDown: sql<number>`SUM(CASE WHEN ${strainVotes.overallQuality} = -1 THEN 1 ELSE 0 END)`,
    })
    .from(strainVotes)
    .where(eq(strainVotes.strainId, strainId));

  const row = rows[0];
  const total = Number(row?.totalVotes ?? 0);
  const effectsUp = Number(row?.effectsUp ?? 0);
  const effectsDown = Number(row?.effectsDown ?? 0);
  const valueUp = Number(row?.valueUp ?? 0);
  const valueDown = Number(row?.valueDown ?? 0);
  const qualityUp = Number(row?.qualityUp ?? 0);
  const qualityDown = Number(row?.qualityDown ?? 0);

  return {
    totalVotes: total,
    effectsAccuracy: { up: effectsUp, down: effectsDown, upPercent: total > 0 ? Math.round((effectsUp / total) * 100) : 0 },
    valueForMoney: { up: valueUp, down: valueDown, upPercent: total > 0 ? Math.round((valueUp / total) * 100) : 0 },
    overallQuality: { up: qualityUp, down: qualityDown, upPercent: total > 0 ? Math.round((qualityUp / total) * 100) : 0 },
  };
}

/**
 * Get recent comments for a strain (votes that have comments).
 */
export async function getStrainComments(strainId: string, limit = 20): Promise<Array<{
  id: number;
  userId: number;
  comment: string;
  effectsAccuracy: number;
  valueForMoney: number;
  overallQuality: number;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: strainVotes.id,
      userId: strainVotes.userId,
      comment: strainVotes.comment,
      effectsAccuracy: strainVotes.effectsAccuracy,
      valueForMoney: strainVotes.valueForMoney,
      overallQuality: strainVotes.overallQuality,
      createdAt: strainVotes.createdAt,
    })
    .from(strainVotes)
    .where(and(
      eq(strainVotes.strainId, strainId),
      sql`${strainVotes.comment} IS NOT NULL AND ${strainVotes.comment} != ''`
    ))
    .orderBy(desc(strainVotes.createdAt))
    .limit(limit);

  return rows.map(r => ({
    ...r,
    comment: r.comment!,
  }));
}

/**
 * Delete a user's vote for a strain.
 */
export async function deleteStrainVote(userId: number, strainId: string): Promise<boolean> {
  return withDbErrorHandling("deleteStrainVote", async () => {
    const db = await getDb();
    if (!db) return false;

    const result = await db
      .delete(strainVotes)
      .where(and(eq(strainVotes.userId, userId), eq(strainVotes.strainId, strainId)));

    return (result[0] as any).affectedRows > 0;
  });
}

/**
 * Get total vote count for a user (for profile/stats).
 */
export async function getUserVoteCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(strainVotes)
    .where(eq(strainVotes.userId, userId));

  return Number(rows[0]?.count ?? 0);
}


// ─── Strain Comments ────────────────────────────────────────────────────────────

/**
 * Submit a new comment for a strain.
 * Status is set based on profanity filter result:
 * - clean → "approved" (auto-approved)
 * - flagged → "pending" (needs moderation)
 */
export async function submitStrainComment(comment: {
  userId: number;
  userName?: string | null;
  strainId: string;
  strainName: string;
  content: string;
  status: "pending" | "approved";
  flagged: "clean" | "flagged";
}): Promise<{ id: number }> {
  return withDbErrorHandling("submitStrainComment", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(strainComments).values({
      userId: comment.userId,
      userName: comment.userName ?? null,
      strainId: comment.strainId,
      strainName: comment.strainName,
      content: comment.content,
      status: comment.status,
      flagged: comment.flagged,
    });

    return { id: Number(result[0].insertId) };
  });
}

/**
 * Get approved comments for a strain, ordered by newest first.
 * Joins with users table to get display name.
 */
export async function getApprovedStrainComments(strainId: string, limit = 20): Promise<Array<{
  id: number;
  userId: number;
  userName: string | null;
  content: string;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: strainComments.id,
      userId: strainComments.userId,
      userName: strainComments.userName,
      content: strainComments.content,
      createdAt: strainComments.createdAt,
    })
    .from(strainComments)
    .where(and(
      eq(strainComments.strainId, strainId),
      eq(strainComments.status, "approved")
    ))
    .orderBy(desc(strainComments.createdAt))
    .limit(limit);

  return rows;
}

/**
 * Get all pending comments for moderation (admin only).
 * Returns newest first with strain context.
 */
export async function getPendingComments(limit = 50): Promise<StrainComment[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(strainComments)
    .where(eq(strainComments.status, "pending"))
    .orderBy(desc(strainComments.createdAt))
    .limit(limit);
}

/**
 * Get all comments for moderation (admin only), optionally filtered by status.
 */
export async function getAllComments(options?: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
}): Promise<StrainComment[]> {
  const db = await getDb();
  if (!db) return [];

  const limit = options?.limit ?? 50;

  if (options?.status) {
    return db
      .select()
      .from(strainComments)
      .where(eq(strainComments.status, options.status))
      .orderBy(desc(strainComments.createdAt))
      .limit(limit);
  }

  return db
    .select()
    .from(strainComments)
    .orderBy(desc(strainComments.createdAt))
    .limit(limit);
}

/**
 * Moderate a comment: approve or reject with optional note.
 */
export async function moderateComment(
  commentId: number,
  action: "approved" | "rejected",
  moderationNote?: string
): Promise<StrainComment | null> {
  return withDbErrorHandling("moderateComment", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(strainComments)
      .set({
        status: action,
        moderationNote: moderationNote ?? null,
      })
      .where(eq(strainComments.id, commentId));

    const updated = await db
      .select()
      .from(strainComments)
      .where(eq(strainComments.id, commentId))
      .limit(1);

    return updated[0] ?? null;
  });
}

/**
 * Delete a comment (by owner or admin).
 */
export async function deleteStrainComment(commentId: number): Promise<boolean> {
  return withDbErrorHandling("deleteStrainComment", async () => {
    const db = await getDb();
    if (!db) return false;

    const result = await db
      .delete(strainComments)
      .where(eq(strainComments.id, commentId));

    return (result[0] as any).affectedRows > 0;
  });
}

/**
 * Get a single comment by ID.
 */
export async function getCommentById(commentId: number): Promise<StrainComment | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(strainComments)
    .where(eq(strainComments.id, commentId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get comment count for a strain (approved only).
 */
export async function getStrainCommentCount(strainId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(strainComments)
    .where(and(
      eq(strainComments.strainId, strainId),
      eq(strainComments.status, "approved")
    ));

  return Number(rows[0]?.count ?? 0);
}

/**
 * Get pending comment count (for moderation badge).
 */
export async function getPendingCommentCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(strainComments)
    .where(eq(strainComments.status, "pending"));

  return Number(rows[0]?.count ?? 0);
}


// ─── Dispensary Partners ────────────────────────────────────────────────────────

/**
 * Claim a dispensary as a partner. One claim per dispensary slug.
 * Throws if dispensary is already claimed.
 */
export async function claimDispensary(claim: {
  userId: number;
  dispensarySlug: string;
  dispensaryName: string;
  businessName: string;
  contactEmail: string;
  contactPhone?: string | null;
}): Promise<DispensaryPartner> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if dispensary is already claimed
  const existing = await db
    .select({ id: dispensaryPartners.id })
    .from(dispensaryPartners)
    .where(eq(dispensaryPartners.dispensarySlug, claim.dispensarySlug))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("This dispensary has already been claimed.");
  }

  // Check if user already has a partnership
  const userPartner = await db
    .select({ id: dispensaryPartners.id })
    .from(dispensaryPartners)
    .where(eq(dispensaryPartners.userId, claim.userId))
    .limit(1);

  if (userPartner.length > 0) {
    throw new Error("You already have a dispensary partnership. Each account can claim one dispensary.");
  }

  let insertResult;
  try {
    insertResult = await db.insert(dispensaryPartners).values({
      userId: claim.userId,
      dispensarySlug: claim.dispensarySlug,
      dispensaryName: claim.dispensaryName,
      businessName: claim.businessName,
      contactEmail: claim.contactEmail,
      contactPhone: claim.contactPhone ?? null,
      verificationStatus: "pending",
      partnerTier: "basic",
    });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate entry")) {
      throw new Error("This dispensary has already been claimed by another user.");
    }
    throw err;
  }

  const inserted = await db
    .select()
    .from(dispensaryPartners)
    .where(eq(dispensaryPartners.id, Number(insertResult[0].insertId)))
    .limit(1);

  return inserted[0];
}

/**
 * Get a partner record by user ID (for "my partnership" view).
 */
export async function getPartnerByUserId(userId: number): Promise<DispensaryPartner | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(dispensaryPartners)
    .where(eq(dispensaryPartners.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get a partner record by dispensary slug (for badge display).
 */
export async function getPartnerBySlug(dispensarySlug: string): Promise<DispensaryPartner | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(dispensaryPartners)
    .where(eq(dispensaryPartners.dispensarySlug, dispensarySlug))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get all partner claims (admin view), ordered by newest first.
 * Optionally filter by verification status.
 */
export async function getAllPartners(options?: {
  status?: "pending" | "verified" | "rejected";
  limit?: number;
}): Promise<DispensaryPartner[]> {
  const db = await getDb();
  if (!db) return [];

  const limit = options?.limit ?? 50;

  if (options?.status) {
    return db
      .select()
      .from(dispensaryPartners)
      .where(eq(dispensaryPartners.verificationStatus, options.status))
      .orderBy(desc(dispensaryPartners.claimedAt))
      .limit(limit);
  }

  return db
    .select()
    .from(dispensaryPartners)
    .orderBy(desc(dispensaryPartners.claimedAt))
    .limit(limit);
}

/**
 * Get count of pending partner claims (for admin badge).
 */
export async function getPendingPartnerCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(dispensaryPartners)
    .where(eq(dispensaryPartners.verificationStatus, "pending"));

  return Number(rows[0]?.count ?? 0);
}

/**
 * Update a partner's verification status (admin action).
 */
export async function updatePartnerStatus(
  partnerId: number,
  status: "verified" | "rejected",
  adminNote?: string
): Promise<DispensaryPartner | null> {
  return withDbErrorHandling("updatePartnerStatus", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const set: Record<string, unknown> = {
      verificationStatus: status,
      adminNote: adminNote ?? null,
    };

    if (status === "verified") {
      set.verifiedAt = new Date();
    }

    await db
      .update(dispensaryPartners)
      .set(set)
      .where(eq(dispensaryPartners.id, partnerId));

    const updated = await db
      .select()
      .from(dispensaryPartners)
      .where(eq(dispensaryPartners.id, partnerId))
      .limit(1);

    return updated[0] ?? null;
  });
}

/**
 * Check if a dispensary slug has a verified partner.
 */
export async function isDispensaryVerified(dispensarySlug: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const rows = await db
    .select({ id: dispensaryPartners.id })
    .from(dispensaryPartners)
    .where(and(
      eq(dispensaryPartners.dispensarySlug, dispensarySlug),
      eq(dispensaryPartners.verificationStatus, "verified")
    ))
    .limit(1);

  return rows.length > 0;
}

/**
 * Get all verified dispensary slugs (for batch badge display).
 */
export async function getVerifiedDispensarySlugs(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ slug: dispensaryPartners.dispensarySlug })
    .from(dispensaryPartners)
    .where(eq(dispensaryPartners.verificationStatus, "verified"));

  return rows.map(r => r.slug);
}


// ─── Partner Price Updates ──────────────────────────────────────────────────────

/**
 * Submit a price update from a verified partner.
 * Only verified partners can submit prices.
 */
export async function submitPartnerPrice(priceUpdate: {
  partnerId: number;
  dispensarySlug: string;
  dispensaryName: string;
  strainId: string;
  strainName: string;
  price: string;
  unit?: string;
}): Promise<PartnerPriceUpdate> {
  return withDbErrorHandling("submitPartnerPrice", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const result = await db.insert(partnerPriceUpdates).values({
      partnerId: priceUpdate.partnerId,
      dispensarySlug: priceUpdate.dispensarySlug,
      dispensaryName: priceUpdate.dispensaryName,
      strainId: priceUpdate.strainId,
      strainName: priceUpdate.strainName,
      price: priceUpdate.price,
      unit: priceUpdate.unit ?? "3.5g",
      status: "pending",
      expiresAt,
    });

    const inserted = await db
      .select()
      .from(partnerPriceUpdates)
      .where(eq(partnerPriceUpdates.id, Number(result[0].insertId)))
      .limit(1);

    return inserted[0];
  });
}

/**
 * Get price updates for a specific partner, ordered by newest first.
 */
export async function getPartnerPriceUpdates(partnerId: number, limit = 50): Promise<PartnerPriceUpdate[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(partnerPriceUpdates)
    .where(eq(partnerPriceUpdates.partnerId, partnerId))
    .orderBy(desc(partnerPriceUpdates.submittedAt))
    .limit(limit);
}

/**
 * Get all pending price updates (admin view).
 */
export async function getPendingPriceUpdates(limit = 50): Promise<PartnerPriceUpdate[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(partnerPriceUpdates)
    .where(eq(partnerPriceUpdates.status, "pending"))
    .orderBy(desc(partnerPriceUpdates.submittedAt))
    .limit(limit);
}

/**
 * Get all price updates (admin view), optionally filtered by status.
 */
export async function getAllPriceUpdates(options?: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
}): Promise<PartnerPriceUpdate[]> {
  const db = await getDb();
  if (!db) return [];

  const limit = options?.limit ?? 50;

  if (options?.status) {
    return db
      .select()
      .from(partnerPriceUpdates)
      .where(eq(partnerPriceUpdates.status, options.status))
      .orderBy(desc(partnerPriceUpdates.submittedAt))
      .limit(limit);
  }

  return db
    .select()
    .from(partnerPriceUpdates)
    .orderBy(desc(partnerPriceUpdates.submittedAt))
    .limit(limit);
}

/**
 * Get count of pending price updates (for admin badge).
 */
export async function getPendingPriceUpdateCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(partnerPriceUpdates)
    .where(eq(partnerPriceUpdates.status, "pending"));

  return Number(rows[0]?.count ?? 0);
}

/**
 * Review a price update (admin action): approve or reject.
 */
export async function reviewPriceUpdate(
  priceUpdateId: number,
  action: "approved" | "rejected",
  reviewNote?: string
): Promise<PartnerPriceUpdate | null> {
  return withDbErrorHandling("reviewPriceUpdate", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(partnerPriceUpdates)
      .set({
        status: action,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(partnerPriceUpdates.id, priceUpdateId));

    const updated = await db
      .select()
      .from(partnerPriceUpdates)
      .where(eq(partnerPriceUpdates.id, priceUpdateId))
      .limit(1);

    return updated[0] ?? null;
  });
}

/**
 * Get approved partner prices for a specific strain (for Partner Verified badge).
 * Only returns non-expired, approved prices.
 */
export async function getPartnerVerifiedPrices(strainId: string): Promise<Array<{
  dispensarySlug: string;
  dispensaryName: string;
  price: string;
  unit: string;
  submittedAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const rows = await db
    .select({
      dispensarySlug: partnerPriceUpdates.dispensarySlug,
      dispensaryName: partnerPriceUpdates.dispensaryName,
      price: partnerPriceUpdates.price,
      unit: partnerPriceUpdates.unit,
      submittedAt: partnerPriceUpdates.submittedAt,
    })
    .from(partnerPriceUpdates)
    .where(and(
      eq(partnerPriceUpdates.strainId, strainId),
      eq(partnerPriceUpdates.status, "approved"),
      sql`${partnerPriceUpdates.expiresAt} > ${now}`
    ))
    .orderBy(desc(partnerPriceUpdates.submittedAt));

  return rows;
}

/**
 * Get partner price submission stats for a partner (for dashboard).
 */
export async function getPartnerPriceStats(partnerId: number): Promise<{
  totalSubmitted: number;
  approved: number;
  pending: number;
  rejected: number;
}> {
  const db = await getDb();
  if (!db) return { totalSubmitted: 0, approved: 0, pending: 0, rejected: 0 };

  const rows = await db
    .select({
      totalSubmitted: sql<number>`COUNT(*)`,
      approved: sql<number>`SUM(CASE WHEN ${partnerPriceUpdates.status} = 'approved' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN ${partnerPriceUpdates.status} = 'pending' THEN 1 ELSE 0 END)`,
      rejected: sql<number>`SUM(CASE WHEN ${partnerPriceUpdates.status} = 'rejected' THEN 1 ELSE 0 END)`,
    })
    .from(partnerPriceUpdates)
    .where(eq(partnerPriceUpdates.partnerId, partnerId));

  const row = rows[0];
  return {
    totalSubmitted: Number(row?.totalSubmitted ?? 0),
    approved: Number(row?.approved ?? 0),
    pending: Number(row?.pending ?? 0),
    rejected: Number(row?.rejected ?? 0),
  };
}
