import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  decimal,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const emailSourceEnum = pgEnum("email_source", ["footer", "deal_digest", "price_alert", "compare_inline"]);
export const emailStatusEnum = pgEnum("email_status", ["active", "unsubscribed"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "paused", "triggered", "expired"]);
export const notifiedEnum = pgEnum("notified", ["pending", "sent"]);
export const commentStatusEnum = pgEnum("comment_status", ["pending", "approved", "rejected"]);
export const flaggedEnum = pgEnum("flagged", ["clean", "flagged"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const partnerTierEnum = pgEnum("partner_tier", ["basic", "premium"]);
export const priceUpdateStatusEnum = pgEnum("price_update_status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const emailSignups = pgTable("email_signups", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  source: emailSourceEnum("source").notNull(),
  strainId: varchar("strain_id", { length: 128 }),
  strainName: varchar("strain_name", { length: 256 }),
  utmSource: varchar("utm_source", { length: 256 }),
  utmMedium: varchar("utm_medium", { length: 256 }),
  utmCampaign: varchar("utm_campaign", { length: 256 }),
  channel: varchar("channel", { length: 64 }),
  referrer: varchar("referrer", { length: 2048 }),
  city: varchar("city", { length: 128 }),
  region: varchar("region", { length: 128 }),
  status: emailStatusEnum("status").default("active").notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
});

export type EmailSignup = typeof emailSignups.$inferSelect;
export type InsertEmailSignup = typeof emailSignups.$inferInsert;

export const priceSnapshots = pgTable("price_snapshots", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  strainId: varchar("strain_id", { length: 128 }).notNull(),
  strainName: varchar("strain_name", { length: 256 }).notNull(),
  dispensary: varchar("dispensary", { length: 256 }).notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  snapshotDate: date("snapshot_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_snapshot").on(table.strainId, table.dispensary, table.snapshotDate),
  index("idx_strain_date").on(table.strainId, table.snapshotDate),
]);

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type InsertPriceSnapshot = typeof priceSnapshots.$inferInsert;

export const priceDrops = pgTable("price_drops", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  strainId: varchar("strain_id", { length: 128 }).notNull(),
  strainName: varchar("strain_name", { length: 256 }).notNull(),
  dispensary: varchar("dispensary", { length: 256 }).notNull(),
  oldPrice: decimal("old_price", { precision: 8, scale: 2 }).notNull(),
  newPrice: decimal("new_price", { precision: 8, scale: 2 }).notNull(),
  dropAmount: decimal("drop_amount", { precision: 8, scale: 2 }).notNull(),
  dropPercent: decimal("drop_percent", { precision: 5, scale: 2 }).notNull(),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  snapshotDate: date("snapshot_date").notNull(),
  notified: notifiedEnum("notified").default("pending").notNull(),
}, (table) => [
  index("idx_drop_strain").on(table.strainId),
  index("idx_drop_date").on(table.snapshotDate),
  index("idx_drop_notified").on(table.notified),
]);

export type PriceDrop = typeof priceDrops.$inferSelect;
export type InsertPriceDrop = typeof priceDrops.$inferInsert;

export const priceAlerts = pgTable("price_alerts", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull(),
  strainId: varchar("strain_id", { length: 128 }).notNull(),
  strainName: varchar("strain_name", { length: 256 }).notNull(),
  dispensary: varchar("dispensary", { length: 256 }),
  targetPrice: decimal("target_price", { precision: 8, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 8, scale: 2 }),
  status: alertStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  triggeredAt: timestamp("triggered_at"),
  triggeredPrice: decimal("triggered_price", { precision: 8, scale: 2 }),
  triggeredDispensary: varchar("triggered_dispensary", { length: 256 }),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("idx_alert_user").on(table.userId),
  index("idx_alert_strain").on(table.strainId),
  index("idx_alert_status").on(table.status),
]);

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

export const strainVotes = pgTable("strain_votes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull(),
  strainId: varchar("strain_id", { length: 128 }).notNull(),
  strainName: varchar("strain_name", { length: 256 }).notNull(),
  effectsAccuracy: integer("effects_accuracy").notNull(),
  valueForMoney: integer("value_for_money").notNull(),
  overallQuality: integer("overall_quality").notNull(),
  comment: varchar("comment", { length: 140 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_user_strain_vote").on(table.userId, table.strainId),
  index("idx_vote_strain").on(table.strainId),
  index("idx_vote_user").on(table.userId),
]);

export type StrainVote = typeof strainVotes.$inferSelect;
export type InsertStrainVote = typeof strainVotes.$inferInsert;

export const strainComments = pgTable("strain_comments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull(),
  userName: varchar("user_name", { length: 256 }),
  strainId: varchar("strain_id", { length: 128 }).notNull(),
  strainName: varchar("strain_name", { length: 256 }).notNull(),
  content: text("content").notNull(),
  status: commentStatusEnum("status").default("pending").notNull(),
  moderationNote: varchar("moderation_note", { length: 256 }),
  flagged: flaggedEnum("flagged").default("clean").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_comment_strain").on(table.strainId),
  index("idx_comment_user").on(table.userId),
  index("idx_comment_status").on(table.status),
]);

export type StrainComment = typeof strainComments.$inferSelect;
export type InsertStrainComment = typeof strainComments.$inferInsert;

export const dispensaryPartners = pgTable("dispensary_partners", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull(),
  dispensarySlug: varchar("dispensary_slug", { length: 256 }).notNull().unique(),
  dispensaryName: varchar("dispensary_name", { length: 256 }).notNull(),
  businessName: varchar("business_name", { length: 256 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 32 }),
  verificationStatus: verificationStatusEnum("verification_status").default("pending").notNull(),
  partnerTier: partnerTierEnum("partner_tier").default("basic").notNull(),
  adminNote: varchar("admin_note", { length: 512 }),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_user").on(table.userId),
  index("idx_partner_status").on(table.verificationStatus),
]);

export type DispensaryPartner = typeof dispensaryPartners.$inferSelect;
export type InsertDispensaryPartner = typeof dispensaryPartners.$inferInsert;

export const partnerPriceUpdates = pgTable("partner_price_updates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  partnerId: integer("partner_id").notNull(),
  dispensarySlug: varchar("dispensary_slug", { length: 256 }).notNull(),
  dispensaryName: varchar("dispensary_name", { length: 256 }).notNull(),
  strainId: varchar("strain_id", { length: 128 }).notNull(),
  strainName: varchar("strain_name", { length: 256 }).notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 16 }).default("3.5g").notNull(),
  status: priceUpdateStatusEnum("status").default("pending").notNull(),
  reviewNote: varchar("review_note", { length: 256 }),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("idx_ppu_partner").on(table.partnerId),
  index("idx_ppu_strain").on(table.strainId),
  index("idx_ppu_dispensary").on(table.dispensarySlug),
  index("idx_ppu_status").on(table.status),
]);

export type PartnerPriceUpdate = typeof partnerPriceUpdates.$inferSelect;
export type InsertPartnerPriceUpdate = typeof partnerPriceUpdates.$inferInsert;
