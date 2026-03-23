import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, uniqueIndex, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Email signups collected from the 4 capture points:
 * footer, deal_digest, price_alert, compare_inline
 */
export const emailSignups = mysqlTable("email_signups", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  source: mysqlEnum("source", ["footer", "deal_digest", "price_alert", "compare_inline"]).notNull(),
  strainId: varchar("strainId", { length: 128 }),
  strainName: varchar("strainName", { length: 256 }),
  status: mysqlEnum("status", ["active", "unsubscribed"]).default("active").notNull(),
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
});

export type EmailSignup = typeof emailSignups.$inferSelect;
export type InsertEmailSignup = typeof emailSignups.$inferInsert;

/**
 * Price snapshots — one row per strain+dispensary+date.
 * Ingested weekly from the CDN catalog to build price history.
 */
export const priceSnapshots = mysqlTable("price_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  strainId: varchar("strainId", { length: 128 }).notNull(),
  strainName: varchar("strainName", { length: 256 }).notNull(),
  dispensary: varchar("dispensary", { length: 256 }).notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  snapshotDate: date("snapshotDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_snapshot").on(table.strainId, table.dispensary, table.snapshotDate),
  index("idx_strain_date").on(table.strainId, table.snapshotDate),
]);

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type InsertPriceSnapshot = typeof priceSnapshots.$inferInsert;

/**
 * Detected price drops — computed by comparing consecutive snapshots.
 * One row per strain+dispensary drop event.
 */
export const priceDrops = mysqlTable("price_drops", {
  id: int("id").autoincrement().primaryKey(),
  strainId: varchar("strainId", { length: 128 }).notNull(),
  strainName: varchar("strainName", { length: 256 }).notNull(),
  dispensary: varchar("dispensary", { length: 256 }).notNull(),
  oldPrice: decimal("oldPrice", { precision: 8, scale: 2 }).notNull(),
  newPrice: decimal("newPrice", { precision: 8, scale: 2 }).notNull(),
  dropAmount: decimal("dropAmount", { precision: 8, scale: 2 }).notNull(),
  dropPercent: decimal("dropPercent", { precision: 5, scale: 2 }).notNull(),
  detectedAt: timestamp("detectedAt").defaultNow().notNull(),
  snapshotDate: date("snapshotDate").notNull(),
  /** Whether subscribers have been notified about this drop */
  notified: mysqlEnum("notified", ["pending", "sent"]).default("pending").notNull(),
}, (table) => [
  index("idx_drop_strain").on(table.strainId),
  index("idx_drop_date").on(table.snapshotDate),
  index("idx_drop_notified").on(table.notified),
]);

export type PriceDrop = typeof priceDrops.$inferSelect;
export type InsertPriceDrop = typeof priceDrops.$inferInsert;

/**
 * Price alerts — users set a target price for a strain and get notified when it drops.
 * Supports both "any dispensary" (dispensary is null) and specific dispensary alerts.
 * Status lifecycle: active → triggered (price met) or expired (90 days no trigger).
 * Max 20 active alerts per user.
 */
export const priceAlerts = mysqlTable("price_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strainId: varchar("strainId", { length: 128 }).notNull(),
  strainName: varchar("strainName", { length: 256 }).notNull(),
  dispensary: varchar("dispensary", { length: 256 }),
  targetPrice: decimal("targetPrice", { precision: 8, scale: 2 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 8, scale: 2 }),
  status: mysqlEnum("status", ["active", "paused", "triggered", "expired"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  triggeredAt: timestamp("triggeredAt"),
  triggeredPrice: decimal("triggeredPrice", { precision: 8, scale: 2 }),
  triggeredDispensary: varchar("triggeredDispensary", { length: 256 }),
  expiresAt: timestamp("expiresAt"),
}, (table) => [
  index("idx_alert_user").on(table.userId),
  index("idx_alert_strain").on(table.strainId),
  index("idx_alert_status").on(table.status),
]);

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

/**
 * Community strain votes — thumbs up/down across 3 dimensions:
 * effects accuracy, value for money, overall quality.
 * Optional 140-character comment. One vote per user per strain.
 * Supports editing: users can change their vote at any time.
 */
export const strainVotes = mysqlTable("strain_votes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strainId: varchar("strainId", { length: 128 }).notNull(),
  strainName: varchar("strainName", { length: 256 }).notNull(),
  /** Thumbs up (1) or thumbs down (-1) for effects accuracy */
  effectsAccuracy: int("effectsAccuracy").notNull(),
  /** Thumbs up (1) or thumbs down (-1) for value for money */
  valueForMoney: int("valueForMoney").notNull(),
  /** Thumbs up (1) or thumbs down (-1) for overall quality */
  overallQuality: int("overallQuality").notNull(),
  /** Optional 140-character comment */
  comment: varchar("comment", { length: 140 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("uq_user_strain_vote").on(table.userId, table.strainId),
  index("idx_vote_strain").on(table.strainId),
  index("idx_vote_user").on(table.userId),
]);

export type StrainVote = typeof strainVotes.$inferSelect;
export type InsertStrainVote = typeof strainVotes.$inferInsert;

/**
 * Strain comments — longer-form reviews with moderation.
 * Separate from the vote system to allow richer content.
 * Status lifecycle: pending → approved/rejected.
 * Comments are auto-approved if they pass the profanity filter,
 * otherwise they go to pending for manual review.
 */
export const strainComments = mysqlTable("strain_comments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 256 }),
  strainId: varchar("strainId", { length: 128 }).notNull(),
  strainName: varchar("strainName", { length: 256 }).notNull(),
  content: text("content").notNull(),
  /** Moderation status: pending (needs review), approved (visible), rejected (hidden) */
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  /** Reason for rejection (set by moderator) */
  moderationNote: varchar("moderationNote", { length: 256 }),
  /** Whether the profanity filter flagged this comment */
  flagged: mysqlEnum("flagged", ["clean", "flagged"]).default("clean").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_comment_strain").on(table.strainId),
  index("idx_comment_user").on(table.userId),
  index("idx_comment_status").on(table.status),
]);

export type StrainComment = typeof strainComments.$inferSelect;
export type InsertStrainComment = typeof strainComments.$inferInsert;

/**
 * Dispensary partnerships — dispensary operators claim their listing
 * and submit verified prices. Status lifecycle:
 * pending → verified (approved by admin) or rejected.
 * One claim per dispensary slug. Partner tier determines features.
 */
export const dispensaryPartners = mysqlTable("dispensary_partners", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dispensarySlug: varchar("dispensarySlug", { length: 256 }).notNull().unique(),
  dispensaryName: varchar("dispensaryName", { length: 256 }).notNull(),
  businessName: varchar("businessName", { length: 256 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 32 }),
  /** Verification status: pending (awaiting review), verified (approved), rejected */
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  /** Partner tier: basic (free), premium (paid features) */
  partnerTier: mysqlEnum("partnerTier", ["basic", "premium"]).default("basic").notNull(),
  /** Admin note for rejection reason or verification notes */
  adminNote: varchar("adminNote", { length: 512 }),
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
  verifiedAt: timestamp("verifiedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_partner_user").on(table.userId),
  index("idx_partner_status").on(table.verificationStatus),
]);

export type DispensaryPartner = typeof dispensaryPartners.$inferSelect;
export type InsertDispensaryPartner = typeof dispensaryPartners.$inferInsert;

/**
 * Partner price updates — verified partners submit real-time prices.
 * Status lifecycle: pending → approved/rejected by admin.
 * Approved prices get a "Partner Verified" badge in the UI.
 */
export const partnerPriceUpdates = mysqlTable("partner_price_updates", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  dispensarySlug: varchar("dispensarySlug", { length: 256 }).notNull(),
  dispensaryName: varchar("dispensaryName", { length: 256 }).notNull(),
  strainId: varchar("strainId", { length: 128 }).notNull(),
  strainName: varchar("strainName", { length: 256 }).notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  /** Unit size for the price (e.g., "3.5g", "7g", "14g", "28g") */
  unit: varchar("unit", { length: 16 }).default("3.5g").notNull(),
  /** Review status: pending (awaiting review), approved (live), rejected */
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  /** Admin note for rejection reason */
  reviewNote: varchar("reviewNote", { length: 256 }),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  /** When this price expires (default 7 days from submission) */
  expiresAt: timestamp("expiresAt"),
}, (table) => [
  index("idx_ppu_partner").on(table.partnerId),
  index("idx_ppu_strain").on(table.strainId),
  index("idx_ppu_dispensary").on(table.dispensarySlug),
  index("idx_ppu_status").on(table.status),
]);

export type PartnerPriceUpdate = typeof partnerPriceUpdates.$inferSelect;
export type InsertPartnerPriceUpdate = typeof partnerPriceUpdates.$inferInsert;
