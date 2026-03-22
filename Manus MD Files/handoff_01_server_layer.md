# StrainScout MD — Server Layer Source Code

**Handoff Document for Claude Code Review**
**Date:** March 16, 2026 | **Sprint:** 14 | **Checkpoint:** 6570492f

> All server-side source files: tRPC routers, database helpers, market data engine, alert engine, profanity filter, sitemap, and storage.

---

## Files in This Document

1. `server/routers.ts` (704 lines)
2. `server/db.ts` (1376 lines)
3. `server/marketData.ts` (563 lines)
4. `server/alertTriggerEngine.ts` (283 lines)
5. `server/profanityFilter.ts` (137 lines)
6. `server/sitemap.ts` (122 lines)
7. `server/storage.ts` (103 lines)
8. `server/index.ts` (34 lines)

---

## 1. `server/routers.ts`

**Lines:** 704

```typescript
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { insertEmailSignup, getSignupStats, insertPriceSnapshots, getLatestSnapshotDate, detectPriceDrops, getRecentPriceDrops, getStrainPriceDrops, getStrainPriceHistory, getPriceDropStats, createPriceAlert, getUserAlerts, getAlertById, updatePriceAlert, deletePriceAlert, getUserAlertCount, hasActiveAlert, submitStrainVote, getUserStrainVote, getStrainVoteAggregates, getStrainComments, deleteStrainVote, getUserVoteCount, submitStrainComment, getApprovedStrainComments, getPendingComments, getAllComments, moderateComment, deleteStrainComment, getCommentById, getStrainCommentCount, getPendingCommentCount, claimDispensary, getPartnerByUserId, getPartnerBySlug, getAllPartners, getPendingPartnerCount, updatePartnerStatus, isDispensaryVerified, getVerifiedDispensarySlugs, submitPartnerPrice, getPartnerPriceUpdates, getAllPriceUpdates, getPendingPriceUpdateCount, reviewPriceUpdate, getPartnerVerifiedPrices, getPartnerPriceStats } from "./db";
import { checkProfanity } from "./profanityFilter";
import type { InsertPriceSnapshot } from "../drizzle/schema";
import { z } from "zod";
import { notifyOwner } from "./_core/notification";
import { getPendingNotifications, markDropsNotified, getEmailSignups } from "./db";
import { runAlertTriggerEngine } from "./alertTriggerEngine";
import { getMarketDashboardData, getMarketOverview, getRegionalPrices, getMostAvailableStrains, getPriceVolatility, getBrandMarketShare, getPriceTrends } from "./marketData";

export const appRouter = router({
  system: systemRouter,

  alerts: router({
    /** Create a new price alert (requires login) */
    create: protectedProcedure
      .input(
        z.object({
          strainId: z.string().min(1),
          strainName: z.string().min(1),
          dispensary: z.string().nullable().optional(),
          targetPrice: z.number().positive("Target price must be greater than $0"),
          currentPrice: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const alert = await createPriceAlert({
          userId: ctx.user.id,
          strainId: input.strainId,
          strainName: input.strainName,
          dispensary: input.dispensary ?? null,
          targetPrice: String(input.targetPrice),
          currentPrice: input.currentPrice ? String(input.currentPrice) : null,
        });
        return alert;
      }),

    /** List all alerts for the current user */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserAlerts(ctx.user.id);
    }),

    /** Update an alert (target price, status, dispensary) */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          targetPrice: z.number().positive().optional(),
          status: z.enum(["active", "paused"]).optional(),
          dispensary: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const existing = await getAlertById(input.id);
        if (!existing || existing.userId !== ctx.user.id) {
          throw new Error("Alert not found");
        }
        if (existing.status === "triggered" || existing.status === "expired") {
          throw new Error("Cannot modify a triggered or expired alert");
        }

        const updates: Record<string, unknown> = {};
        if (input.targetPrice !== undefined) updates.targetPrice = String(input.targetPrice);
        if (input.status !== undefined) updates.status = input.status;
        if (input.dispensary !== undefined) updates.dispensary = input.dispensary;

        return updatePriceAlert(input.id, updates as any);
      }),

    /** Delete an alert */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getAlertById(input.id);
        if (!existing || existing.userId !== ctx.user.id) {
          throw new Error("Alert not found");
        }
        await deletePriceAlert(input.id);
        return { success: true };
      }),

    /** Get count of active alerts for the current user */
    count: protectedProcedure.query(async ({ ctx }) => {
      return { count: await getUserAlertCount(ctx.user.id) };
    }),

    /** Check if user has an active alert for a specific strain */
    hasAlert: protectedProcedure
      .input(z.object({ strainId: z.string() }))
      .query(async ({ ctx, input }) => {
        return { hasAlert: await hasActiveAlert(ctx.user.id, input.strainId) };
      }),

    /**
     * Admin-only: Run the alert trigger engine manually.
     * Checks all active alerts against current catalog prices,
     * triggers matching alerts, and sends push notifications.
     */
    runTriggerCheck: adminProcedure.mutation(async () => {
      const summary = await runAlertTriggerEngine();
      return summary;
    }),
  }),

  votes: router({
    /** Submit or update a vote for a strain (requires login) */
    submit: protectedProcedure
      .input(
        z.object({
          strainId: z.string().min(1),
          strainName: z.string().min(1),
          effectsAccuracy: z.number().refine(v => v === 1 || v === -1, "Must be 1 (up) or -1 (down)"),
          valueForMoney: z.number().refine(v => v === 1 || v === -1, "Must be 1 (up) or -1 (down)"),
          overallQuality: z.number().refine(v => v === 1 || v === -1, "Must be 1 (up) or -1 (down)"),
          comment: z.string().max(140, "Comment must be 140 characters or less").optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return submitStrainVote({
          userId: ctx.user.id,
          strainId: input.strainId,
          strainName: input.strainName,
          effectsAccuracy: input.effectsAccuracy,
          valueForMoney: input.valueForMoney,
          overallQuality: input.overallQuality,
          comment: input.comment ?? null,
        });
      }),

    /** Get the current user's vote for a strain */
    myVote: protectedProcedure
      .input(z.object({ strainId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getUserStrainVote(ctx.user.id, input.strainId);
      }),

    /** Public: get aggregate vote data for a strain */
    aggregates: publicProcedure
      .input(z.object({ strainId: z.string() }))
      .query(async ({ input }) => {
        return getStrainVoteAggregates(input.strainId);
      }),

    /** Public: get recent comments for a strain */
    comments: publicProcedure
      .input(z.object({ strainId: z.string(), limit: z.number().min(1).max(50).default(20).optional() }))
      .query(async ({ input }) => {
        return getStrainComments(input.strainId, input.limit ?? 20);
      }),

    /** Delete the current user's vote for a strain */
    delete: protectedProcedure
      .input(z.object({ strainId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteStrainVote(ctx.user.id, input.strainId);
        return { success: deleted };
      }),

    /** Get total vote count for the current user */
    myCount: protectedProcedure.query(async ({ ctx }) => {
      return { count: await getUserVoteCount(ctx.user.id) };
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  emailSignup: router({
    /** Public endpoint — anyone can sign up with their email */
    submit: publicProcedure
      .input(
        z.object({
          email: z.string().email("Invalid email address"),
          source: z.enum(["footer", "deal_digest", "price_alert", "compare_inline"]),
          strainId: z.string().optional(),
          strainName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, isNew } = await insertEmailSignup({
          email: input.email.trim().toLowerCase(),
          source: input.source,
          strainId: input.strainId ?? null,
          strainName: input.strainName ?? null,
        });
        return { success: true, id, isNew };
      }),

    /** Admin-only: list all signups with optional source filter */
    list: adminProcedure
      .input(z.object({ source: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getEmailSignups(input?.source);
      }),

    /** Admin-only: get signup counts by source */
    stats: adminProcedure.query(async () => {
      return getSignupStats();
    }),
  }),

  market: router({
    /** Public: get full market dashboard data bundle */
    dashboard: publicProcedure.query(async () => {
      return getMarketDashboardData();
    }),

    /** Public: get market overview stats */
    overview: publicProcedure.query(async () => {
      return getMarketOverview();
    }),

    /** Public: get regional price breakdown */
    regional: publicProcedure.query(async () => {
      return getRegionalPrices();
    }),

    /** Public: get most available strains */
    topAvailable: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ input }) => {
        return getMostAvailableStrains(input?.limit ?? 20);
      }),

    /** Public: get strains with highest price volatility */
    volatility: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ input }) => {
        return getPriceVolatility(input?.limit ?? 20);
      }),

    /** Public: get brand market share data */
    brands: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ input }) => {
        return getBrandMarketShare(input?.limit ?? 20);
      }),

    /** Public: get price trends over time */
    trends: publicProcedure
      .input(z.object({
        strainType: z.string().optional(),
        limit: z.number().min(1).max(104).default(52),
      }).optional())
      .query(async ({ input }) => {
        return getPriceTrends({
          strainType: input?.strainType,
          limit: input?.limit ?? 52,
        });
      }),
  }),

  priceDrops: router({
    /** Public: get recent price drops */
    recent: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
      .query(async ({ input }) => {
        return getRecentPriceDrops({ limit: input?.limit ?? 20 });
      }),

    /** Public: get price drops for a specific strain */
    byStrain: publicProcedure
      .input(z.object({ strainId: z.string() }))
      .query(async ({ input }) => {
        return getStrainPriceDrops(input.strainId);
      }),

    /** Public: get price history for a specific strain */
    history: publicProcedure
      .input(z.object({ strainId: z.string() }))
      .query(async ({ input }) => {
        return getStrainPriceHistory(input.strainId);
      }),

    /** Admin-only: get price drop stats */
    stats: adminProcedure.query(async () => {
      return getPriceDropStats();
    }),

    /** Admin-only: send weekly digest notification with pending price drops */
    sendDigest: adminProcedure.mutation(async () => {
      const pendingDrops = await getPendingNotifications();
      if (pendingDrops.length === 0) {
        return { success: true, message: "No pending price drops to notify about.", notified: 0 };
      }

      // Get all price_alert subscribers
      const priceAlertSubs = await getEmailSignups("price_alert");
      const dealDigestSubs = await getEmailSignups("deal_digest");
      const allSubs = [...priceAlertSubs, ...dealDigestSubs];
      const uniqueEmails = new Set(allSubs.map(s => s.email));

      // Build digest content
      const topDrops = pendingDrops.slice(0, 10);
      const digestLines = topDrops.map(d => {
        return `${d.strainName} at ${d.dispensary}: $${d.oldPrice} → $${d.newPrice} (${d.dropPercent}% off)`;
      });

      const digestContent = [
        `Weekly Price Drop Digest — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        "",
        `${pendingDrops.length} price drops detected this week across Maryland dispensaries.`,
        `${uniqueEmails.size} subscribers to notify.`,
        "",
        "Top Price Drops:",
        ...digestLines,
        "",
        pendingDrops.length > 10 ? `...and ${pendingDrops.length - 10} more drops.` : "",
      ].filter(Boolean).join("\n");

      // Send owner notification
      await notifyOwner({
        title: `StrainScout: ${pendingDrops.length} Price Drops Detected`,
        content: digestContent,
      });

      // Mark all as notified
      await markDropsNotified(pendingDrops.map(d => d.id));

      return {
        success: true,
        dropsNotified: pendingDrops.length,
        subscribersReached: uniqueEmails.size,
        topDrops: topDrops.map(d => ({
          strain: d.strainName,
          dispensary: d.dispensary,
          oldPrice: d.oldPrice,
          newPrice: d.newPrice,
          dropPercent: d.dropPercent,
        })),
      };
    }),

    /** Admin-only: ingest a price snapshot from the CDN catalog */
    ingestSnapshot: adminProcedure
      .input(z.object({ snapshotDate: z.string().optional() }))
      .mutation(async ({ input }) => {
        const today = input.snapshotDate || new Date().toISOString().split("T")[0];

        // Fetch the catalog from CDN
        const CATALOG_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strainscout_catalog_v8.min_b0a7caef.json";
        const res = await fetch(CATALOG_URL);
        if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
        const data = await res.json() as { id: string; name: string; prices: { dispensary: string; price: number }[] }[];

        // Build snapshot rows
        const snapshots: InsertPriceSnapshot[] = [];
        for (const strain of data) {
          for (const p of strain.prices || []) {
            if (p.price > 0) {
              snapshots.push({
                strainId: strain.id,
                strainName: strain.name,
                dispensary: p.dispensary,
                price: String(p.price),
                snapshotDate: new Date(today),
              });
            }
          }
        }

        const inserted = await insertPriceSnapshots(snapshots);

        // Detect price drops vs previous snapshot
        const previousDate = await getLatestSnapshotDate();
        let dropsDetected = 0;
        if (previousDate && previousDate !== today) {
          dropsDetected = await detectPriceDrops(today, previousDate);
        }

        // After ingesting new prices, automatically run the alert trigger engine
        let alertTriggerSummary = null;
        try {
          alertTriggerSummary = await runAlertTriggerEngine();
        } catch (err) {
          console.warn("[IngestSnapshot] Alert trigger engine failed after ingest:", err);
        }

        return {
          success: true,
          snapshotDate: today,
          totalPricePoints: snapshots.length,
          inserted,
          dropsDetected,
          alertsTriggered: alertTriggerSummary?.alertsTriggered ?? 0,
          alertsExpired: alertTriggerSummary?.alertsExpired ?? 0,
          notificationsSent: alertTriggerSummary?.notificationsSent ?? 0,
        };
      }),
  }),

  comments: router({
    /** Submit a new comment for a strain (requires login) */
    submit: protectedProcedure
      .input(
        z.object({
          strainId: z.string().min(1),
          strainName: z.string().min(1),
          content: z.string().min(10, "Comment must be at least 10 characters").max(1000, "Comment must be under 1000 characters"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Run profanity filter
        const profanityResult = checkProfanity(input.content);
        const status = profanityResult.clean ? "approved" as const : "pending" as const;
        const flagged = profanityResult.clean ? "clean" as const : "flagged" as const;

        const result = await submitStrainComment({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          strainId: input.strainId,
          strainName: input.strainName,
          content: input.content,
          status,
          flagged,
        });

        return {
          id: result.id,
          status,
          flagged: !profanityResult.clean,
          message: profanityResult.clean
            ? "Your review has been posted!"
            : "Your review has been submitted for moderation.",
        };
      }),

    /** Get approved comments for a strain (public) */
    list: publicProcedure
      .input(
        z.object({
          strainId: z.string().min(1),
          limit: z.number().min(1).max(50).optional(),
        })
      )
      .query(async ({ input }) => {
        return getApprovedStrainComments(input.strainId, input.limit ?? 20);
      }),

    /** Get comment count for a strain (public) */
    count: publicProcedure
      .input(z.object({ strainId: z.string().min(1) }))
      .query(async ({ input }) => {
        return getStrainCommentCount(input.strainId);
      }),

    /** Delete own comment (requires login) */
    delete: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const comment = await getCommentById(input.commentId);
        if (!comment) throw new Error("Comment not found");
        if (comment.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("You can only delete your own comments");
        }
        return deleteStrainComment(input.commentId);
      }),

    /** Admin: Get all comments for moderation */
    moderation: adminProcedure
      .input(
        z.object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          limit: z.number().min(1).max(100).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getAllComments({
          status: input?.status,
          limit: input?.limit ?? 50,
        });
      }),

    /** Admin: Get pending comment count (for badge) */
    pendingCount: adminProcedure.query(async () => {
      return getPendingCommentCount();
    }),

    /** Admin: Moderate a comment (approve/reject) */
    moderate: adminProcedure
      .input(
        z.object({
          commentId: z.number(),
          action: z.enum(["approved", "rejected"]),
          moderationNote: z.string().max(256).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const updated = await moderateComment(
          input.commentId,
          input.action,
          input.moderationNote
        );
        if (!updated) throw new Error("Comment not found");
        return updated;
      }),
  }),

  partners: router({
    /** Claim a dispensary as a partner (requires login) */
    claim: protectedProcedure
      .input(
        z.object({
          dispensarySlug: z.string().min(1),
          dispensaryName: z.string().min(1),
          businessName: z.string().min(1, "Business name is required"),
          contactEmail: z.string().email("Valid email is required"),
          contactPhone: z.string().max(32).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const partner = await claimDispensary({
          userId: ctx.user.id,
          dispensarySlug: input.dispensarySlug,
          dispensaryName: input.dispensaryName,
          businessName: input.businessName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone ?? null,
        });

        // Notify owner of new partnership claim
        await notifyOwner({
          title: `New Partner Claim: ${input.dispensaryName}`,
          content: `${ctx.user.name ?? "A user"} has claimed ${input.dispensaryName} (${input.dispensarySlug}).\nBusiness: ${input.businessName}\nEmail: ${input.contactEmail}\nPhone: ${input.contactPhone ?? "N/A"}\n\nReview at /admin/partners`,
        });

        return partner;
      }),

    /** Get the current user's partnership (or null) */
    myPartnership: protectedProcedure.query(async ({ ctx }) => {
      return getPartnerByUserId(ctx.user.id);
    }),

    /** Submit a price update (requires verified partner) */
    submitPrice: protectedProcedure
      .input(
        z.object({
          strainId: z.string().min(1),
          strainName: z.string().min(1),
          price: z.number().positive("Price must be greater than $0"),
          unit: z.enum(["3.5g", "7g", "14g", "28g"]).default("3.5g"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const partner = await getPartnerByUserId(ctx.user.id);
        if (!partner) throw new Error("You must claim a dispensary first.");
        if (partner.verificationStatus !== "verified") {
          throw new Error("Your partnership must be verified before you can submit prices.");
        }

        return submitPartnerPrice({
          partnerId: partner.id,
          dispensarySlug: partner.dispensarySlug,
          dispensaryName: partner.dispensaryName,
          strainId: input.strainId,
          strainName: input.strainName,
          price: String(input.price),
          unit: input.unit,
        });
      }),

    /** Get the current partner's price submissions */
    myPriceUpdates: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const partner = await getPartnerByUserId(ctx.user.id);
        if (!partner) return [];
        return getPartnerPriceUpdates(partner.id, input?.limit ?? 50);
      }),

    /** Get partner stats for dashboard */
    myStats: protectedProcedure.query(async ({ ctx }) => {
      const partner = await getPartnerByUserId(ctx.user.id);
      if (!partner) return null;
      const stats = await getPartnerPriceStats(partner.id);
      return { partner, stats };
    }),

    /** Public: check if a dispensary has a verified partner */
    isVerified: publicProcedure
      .input(z.object({ dispensarySlug: z.string() }))
      .query(async ({ input }) => {
        return { verified: await isDispensaryVerified(input.dispensarySlug) };
      }),

    /** Public: get all verified dispensary slugs (for batch badge display) */
    verifiedSlugs: publicProcedure.query(async () => {
      return getVerifiedDispensarySlugs();
    }),

    /** Public: get partner-verified prices for a strain */
    verifiedPrices: publicProcedure
      .input(z.object({ strainId: z.string() }))
      .query(async ({ input }) => {
        return getPartnerVerifiedPrices(input.strainId);
      }),

    /** Public: get partner info for a dispensary (for dispensary detail page) */
    bySlug: publicProcedure
      .input(z.object({ dispensarySlug: z.string() }))
      .query(async ({ input }) => {
        const partner = await getPartnerBySlug(input.dispensarySlug);
        if (!partner || partner.verificationStatus !== "verified") return null;
        return {
          dispensaryName: partner.dispensaryName,
          businessName: partner.businessName,
          partnerTier: partner.partnerTier,
          verifiedAt: partner.verifiedAt,
        };
      }),

    /** Admin: list all partner claims */
    adminList: adminProcedure
      .input(
        z.object({
          status: z.enum(["pending", "verified", "rejected"]).optional(),
          limit: z.number().min(1).max(100).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getAllPartners({
          status: input?.status,
          limit: input?.limit ?? 50,
        });
      }),

    /** Admin: get pending partner claim count (for badge) */
    adminPendingCount: adminProcedure.query(async () => {
      return getPendingPartnerCount();
    }),

    /** Admin: verify or reject a partner claim */
    adminVerify: adminProcedure
      .input(
        z.object({
          partnerId: z.number(),
          action: z.enum(["verified", "rejected"]),
          adminNote: z.string().max(512).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const updated = await updatePartnerStatus(
          input.partnerId,
          input.action,
          input.adminNote
        );
        if (!updated) throw new Error("Partner not found");
        return updated;
      }),

    /** Admin: list all price updates */
    adminPriceUpdates: adminProcedure
      .input(
        z.object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          limit: z.number().min(1).max(100).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getAllPriceUpdates({
          status: input?.status,
          limit: input?.limit ?? 50,
        });
      }),

    /** Admin: get pending price update count (for badge) */
    adminPendingPriceCount: adminProcedure.query(async () => {
      return getPendingPriceUpdateCount();
    }),

    /** Admin: review a price update (approve/reject) */
    adminReviewPrice: adminProcedure
      .input(
        z.object({
          priceUpdateId: z.number(),
          action: z.enum(["approved", "rejected"]),
          reviewNote: z.string().max(256).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const updated = await reviewPriceUpdate(
          input.priceUpdateId,
          input.action,
          input.reviewNote
        );
        if (!updated) throw new Error("Price update not found");
        return updated;
      }),
  }),
});

export type AppRouter = typeof appRouter;

```

---

## 2. `server/db.ts`

**Lines:** 1376

```typescript
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
}

/**
 * Delete an alert.
 */
export async function deletePriceAlert(alertId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(priceAlerts).where(eq(priceAlerts.id, alertId));
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
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(strainVotes)
    .where(and(eq(strainVotes.userId, userId), eq(strainVotes.strainId, strainId)));

  return (result[0] as any).affectedRows > 0;
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
}

/**
 * Delete a comment (by owner or admin).
 */
export async function deleteStrainComment(commentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(strainComments)
    .where(eq(strainComments.id, commentId));

  return (result[0] as any).affectedRows > 0;
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

  const result = await db.insert(dispensaryPartners).values({
    userId: claim.userId,
    dispensarySlug: claim.dispensarySlug,
    dispensaryName: claim.dispensaryName,
    businessName: claim.businessName,
    contactEmail: claim.contactEmail,
    contactPhone: claim.contactPhone ?? null,
    verificationStatus: "pending",
    partnerTier: "basic",
  });

  const inserted = await db
    .select()
    .from(dispensaryPartners)
    .where(eq(dispensaryPartners.id, Number(result[0].insertId)))
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

```

---

## 3. `server/marketData.ts`

**Lines:** 563

```typescript
/**
 * Market Intelligence Data Pipeline — Sprint 9
 *
 * Provides aggregation functions for the /market dashboard.
 * Works with two data sources:
 *   1. Live CDN catalog (immediate, always available)
 *   2. Historical DB snapshots (grows over time with weekly ingests)
 *
 * Regional mapping groups 100+ Maryland dispensaries into 5 regions
 * based on geographic location for meaningful price comparisons.
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { priceSnapshots } from "../drizzle/schema";

// ============================================================
// Types
// ============================================================

export interface MarketOverview {
  totalStrains: number;
  totalDispensaries: number;
  avgPrice: number;
  medianPrice: number;
  lowestPrice: number;
  highestPrice: number;
  priceByType: { type: string; avgPrice: number; count: number; minPrice: number; maxPrice: number }[];
  lastUpdated: string;
}

export interface RegionalPriceData {
  region: string;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  dispensaryCount: number;
  strainCount: number;
}

export interface StrainAvailability {
  id: string;
  name: string;
  brand: string;
  type: string;
  dispensaryCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceSpread: number;
}

export interface PriceVolatility {
  strainId: string;
  strainName: string;
  type: string;
  avgPrice: number;
  stdDev: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  volatilityIndex: number; // stdDev / avgPrice * 100
  dispensaryCount: number;
}

export interface PriceTrend {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  strainCount: number;
  type?: string;
}

export interface CatalogStrain {
  id: string;
  name: string;
  brand: string;
  type: string;
  thc: number | null;
  prices: { dispensary: string; price: number }[];
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  dispensary_count: number;
  catalog_updated: string;
}

// ============================================================
// Regional Dispensary Mapping
// ============================================================

/**
 * Maps Maryland dispensaries to geographic regions based on their
 * city/location suffix or known location. This enables regional
 * price comparison on the market dashboard.
 */
const REGION_MAP: Record<string, string> = {
  // Baltimore Metro
  "CULTA - Baltimore": "Baltimore Metro",
  "Cookies - Baltimore": "Baltimore Metro",
  "Gold Leaf": "Baltimore Metro",
  "Green Goods - Baltimore": "Baltimore Metro",
  "Health for Life - Baltimore": "Baltimore Metro",
  "Health for Life - White Marsh Med & Rec Cannabis Dispensary": "Baltimore Metro",
  "Liberty Cannabis - Baltimore": "Baltimore Metro",
  "Nirvana Cannabis - Baltimore": "Baltimore Metro",
  "Nirvana Cannabis - Rosedale": "Baltimore Metro",
  "Remedy - Baltimore (Windsor Mill)": "Baltimore Metro",
  "Star Buds - Baltimore": "Baltimore Metro",
  "The Forest - Baltimore": "Baltimore Metro",
  "Trulieve - Halethorpe": "Baltimore Metro",
  "Trulieve - Lutherville": "Baltimore Metro",
  "Trulieve - Lutherville - Timonium": "Baltimore Metro",
  "Zen Leaf - Towson": "Baltimore Metro",
  "Zen Leaf - Pasadena": "Baltimore Metro",
  "The Apothecarium - Nottingham": "Baltimore Metro",
  "Peake ReLeaf": "Baltimore Metro",
  "Storehouse": "Baltimore Metro",
  "Elevated Dispo": "Baltimore Metro",
  "Enlightened Dispensary Abingdon": "Baltimore Metro",
  "Rise Dispensaries - Joppa": "Baltimore Metro",
  "Far & Dotter": "Baltimore Metro",
  "Haven Dispensary": "Baltimore Metro",
  "HerbaFi": "Baltimore Metro",
  "Mana Supply Co. - Middle River": "Baltimore Metro",
  "Ritual Dispensary": "Baltimore Metro",

  // DC Suburbs (Montgomery, Prince George's, Howard, Anne Arundel)
  "Columbia Care - Chevy Chase": "DC Suburbs",
  "Curaleaf - Columbia": "DC Suburbs",
  "Curaleaf - Gaithersburg": "DC Suburbs",
  "CULTA - Columbia": "DC Suburbs",
  "Remedy - Columbia": "DC Suburbs",
  "Evergrowing Releaf - Columbia": "DC Suburbs",
  "Health for Life - Bethesda Med & Rec Cannabis Dispensary": "DC Suburbs",
  "Liberty Cannabis - Rockville": "DC Suburbs",
  "RISE Dispensary Bethesda": "DC Suburbs",
  "Trulieve - Rockville": "DC Suburbs",
  "Verilife - Silver Spring": "DC Suburbs",
  "Story Cannabis - Silver Spring": "DC Suburbs",
  "Story Cannabis - Hyattsville": "DC Suburbs",
  "Sweetspot Dispensary Olney": "DC Suburbs",
  "The Apothecarium - Burtonsville": "DC Suburbs",
  "Bloom - Germantown": "DC Suburbs",
  "Zen Leaf - Germantown": "DC Suburbs",
  "Zen Leaf - Elkridge": "DC Suburbs",
  "Ascend Cannabis Dispensary - Crofton": "DC Suburbs",
  "Ascend Cannabis Dispensary - Laurel": "DC Suburbs",
  "Green Point Wellness - Laurel": "DC Suburbs",
  "Revolution Releaf - Laurel": "DC Suburbs",
  "Green Point Wellness - Linthicum": "DC Suburbs",
  "Green Point Wellness - Millersville": "DC Suburbs",
  "Mana Supply Co. - Edgewater": "DC Suburbs",
  "Potomac Holistics": "DC Suburbs",
  "Mary & Main": "DC Suburbs",
  "Salvera": "DC Suburbs",
  "Trilogy Wellness": "DC Suburbs",
  "The Living Room": "DC Suburbs",
  "Positive Energy": "DC Suburbs",
  "Chesapeake Apothecary": "DC Suburbs",
  "Chesapeake Apothecary - North - Clinton": "DC Suburbs",

  // Southern Maryland
  "Story Cannabis - Waldorf": "Southern Maryland",
  "Story Cannabis - Mechanicsville": "Southern Maryland",
  "Greenwave - Solomons": "Southern Maryland",

  // Western Maryland (Frederick, Hagerstown, Westminster)
  "CULTA - Urbana (Frederick)": "Western Maryland",
  "Curaleaf - Frederick": "Western Maryland",
  "gLeaf Frederick": "Western Maryland",
  "Verilife - New Market": "Western Maryland",
  "KOAN Cannabis - Hagerstown": "Western Maryland",
  "RISE Dispensary Hagerstown": "Western Maryland",
  "Verilife - Westminster": "Western Maryland",
  "Curaleaf - Reisterstown": "Western Maryland",
  "Ascend Cannabis Dispensary - Ellicott City": "Western Maryland",
  "Grow West Cannabis Company": "Western Maryland",

  // Eastern Shore & Northern MD
  "Ascend Cannabis Dispensary - Aberdeen": "Eastern Shore & North",
  "The Apothecarium - Salisbury": "Eastern Shore & North",
  "Far & Dotter - Elkton": "Eastern Shore & North",
  "Chesacanna": "Eastern Shore & North",
  "Caroline Pharma": "Eastern Shore & North",
  "Kent Reserve": "Eastern Shore & North",
  "Hi-Tide Dispensary": "Eastern Shore & North",
};

/**
 * Get the region for a dispensary. Falls back to "Other" for unmapped dispensaries.
 */
export function getDispensaryRegion(dispensary: string): string {
  return REGION_MAP[dispensary] || "Other";
}

/**
 * Get all regions with their dispensary lists.
 */
export function getRegionDispensaryMap(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [disp, region] of Object.entries(REGION_MAP)) {
    if (!result[region]) result[region] = [];
    result[region].push(disp);
  }
  return result;
}

// ============================================================
// Catalog-Based Aggregations (works immediately, no DB needed)
// ============================================================

const CATALOG_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strainscout_catalog_v8.min_b0a7caef.json";

let catalogCache: { data: CatalogStrain[]; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchCatalog(): Promise<CatalogStrain[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CACHE_TTL) {
    return catalogCache.data;
  }

  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  const data = (await res.json()) as CatalogStrain[];
  catalogCache = { data, fetchedAt: Date.now() };
  return data;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/**
 * Get overall market overview from the live catalog.
 */
export async function getMarketOverview(): Promise<MarketOverview> {
  const catalog = await fetchCatalog();

  const allPrices: number[] = [];
  const dispensarySet = new Set<string>();
  const typeMap = new Map<string, { prices: number[]; count: number }>();

  for (const strain of catalog) {
    for (const p of strain.prices || []) {
      if (p.price > 0) {
        allPrices.push(p.price);
        dispensarySet.add(p.dispensary);

        const type = strain.type || "Unknown";
        if (!typeMap.has(type)) typeMap.set(type, { prices: [], count: 0 });
        const entry = typeMap.get(type)!;
        entry.prices.push(p.price);
      }
    }

    const type = strain.type || "Unknown";
    if (!typeMap.has(type)) typeMap.set(type, { prices: [], count: 0 });
    typeMap.get(type)!.count++;
  }

  const priceByType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    avgPrice: Math.round((data.prices.reduce((a, b) => a + b, 0) / (data.prices.length || 1)) * 100) / 100,
    count: data.count,
    minPrice: data.prices.length > 0 ? Math.min(...data.prices) : 0,
    maxPrice: data.prices.length > 0 ? Math.max(...data.prices) : 0,
  }));

  return {
    totalStrains: catalog.length,
    totalDispensaries: dispensarySet.size,
    avgPrice: Math.round((allPrices.reduce((a, b) => a + b, 0) / (allPrices.length || 1)) * 100) / 100,
    medianPrice: Math.round(median(allPrices) * 100) / 100,
    lowestPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
    highestPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
    priceByType,
    lastUpdated: catalog[0]?.catalog_updated || new Date().toISOString(),
  };
}

/**
 * Get price data broken down by Maryland region.
 */
export async function getRegionalPrices(): Promise<RegionalPriceData[]> {
  const catalog = await fetchCatalog();

  const regionData = new Map<string, { prices: number[]; dispensaries: Set<string>; strains: Set<string> }>();

  for (const strain of catalog) {
    for (const p of strain.prices || []) {
      if (p.price <= 0) continue;
      const region = getDispensaryRegion(p.dispensary);
      if (!regionData.has(region)) {
        regionData.set(region, { prices: [], dispensaries: new Set(), strains: new Set() });
      }
      const entry = regionData.get(region)!;
      entry.prices.push(p.price);
      entry.dispensaries.add(p.dispensary);
      entry.strains.add(strain.id);
    }
  }

  return Array.from(regionData.entries())
    .map(([region, data]) => ({
      region,
      avgPrice: Math.round((data.prices.reduce((a, b) => a + b, 0) / (data.prices.length || 1)) * 100) / 100,
      medianPrice: Math.round(median(data.prices) * 100) / 100,
      minPrice: Math.min(...data.prices),
      maxPrice: Math.max(...data.prices),
      dispensaryCount: data.dispensaries.size,
      strainCount: data.strains.size,
    }))
    .sort((a, b) => a.avgPrice - a.avgPrice || a.region.localeCompare(b.region));
}

/**
 * Get the top N most available strains by dispensary count.
 */
export async function getMostAvailableStrains(limit = 20): Promise<StrainAvailability[]> {
  const catalog = await fetchCatalog();

  return catalog
    .filter((s) => s.dispensary_count > 0 && s.price_avg != null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      brand: s.brand,
      type: s.type,
      dispensaryCount: s.dispensary_count,
      avgPrice: s.price_avg ?? 0,
      minPrice: s.price_min ?? 0,
      maxPrice: s.price_max ?? 0,
      priceSpread: (s.price_max ?? 0) - (s.price_min ?? 0),
    }))
    .sort((a, b) => b.dispensaryCount - a.dispensaryCount)
    .slice(0, limit);
}

/**
 * Get strains with the highest price volatility (spread across dispensaries).
 * Volatility index = (stdDev / avgPrice) * 100 — higher means more price variation.
 */
export async function getPriceVolatility(limit = 20): Promise<PriceVolatility[]> {
  const catalog = await fetchCatalog();

  const results: PriceVolatility[] = [];

  for (const strain of catalog) {
    const prices = (strain.prices || []).map((p) => p.price).filter((p) => p > 0);
    if (prices.length < 3) continue; // Need at least 3 data points for meaningful volatility

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const sd = stdDev(prices);
    const volatilityIndex = avg > 0 ? (sd / avg) * 100 : 0;

    results.push({
      strainId: strain.id,
      strainName: strain.name,
      type: strain.type,
      avgPrice: Math.round(avg * 100) / 100,
      stdDev: Math.round(sd * 100) / 100,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      priceRange: Math.round((Math.max(...prices) - Math.min(...prices)) * 100) / 100,
      volatilityIndex: Math.round(volatilityIndex * 100) / 100,
      dispensaryCount: prices.length,
    });
  }

  return results.sort((a, b) => b.volatilityIndex - a.volatilityIndex).slice(0, limit);
}

/**
 * Get brand-level market share data (by strain count and dispensary presence).
 */
export async function getBrandMarketShare(limit = 20): Promise<{
  brand: string;
  strainCount: number;
  totalListings: number;
  avgPrice: number;
  types: Record<string, number>;
}[]> {
  const catalog = await fetchCatalog();

  const brandMap = new Map<string, {
    strains: Set<string>;
    listings: number;
    prices: number[];
    types: Record<string, number>;
  }>();

  for (const strain of catalog) {
    const brand = strain.brand || "Unknown";
    if (!brandMap.has(brand)) {
      brandMap.set(brand, { strains: new Set(), listings: 0, prices: [], types: {} });
    }
    const entry = brandMap.get(brand)!;
    entry.strains.add(strain.id);
    entry.listings += strain.dispensary_count || 0;
    entry.types[strain.type] = (entry.types[strain.type] || 0) + 1;

    for (const p of strain.prices || []) {
      if (p.price > 0) entry.prices.push(p.price);
    }
  }

  return Array.from(brandMap.entries())
    .map(([brand, data]) => ({
      brand,
      strainCount: data.strains.size,
      totalListings: data.listings,
      avgPrice: Math.round((data.prices.reduce((a, b) => a + b, 0) / (data.prices.length || 1)) * 100) / 100,
      types: data.types,
    }))
    .sort((a, b) => b.strainCount - a.strainCount)
    .slice(0, limit);
}

// ============================================================
// DB-Based Historical Aggregations (grows over time)
// ============================================================

/**
 * Get price trends over time from DB snapshots.
 * Returns average price per snapshot date, optionally filtered by strain type.
 * Falls back to a single data point from the catalog if no DB data exists.
 */
export async function getPriceTrends(options?: {
  strainType?: string;
  limit?: number;
}): Promise<PriceTrend[]> {
  const db = await getDb();

  if (db) {
    try {
      const limit = options?.limit ?? 52; // ~1 year of weekly data

      let query;
      if (options?.strainType) {
        query = await db.execute(sql`
          SELECT
            snapshotDate as date,
            ROUND(AVG(price), 2) as avgPrice,
            MIN(price) as minPrice,
            MAX(price) as maxPrice,
            COUNT(DISTINCT strainId) as strainCount
          FROM price_snapshots
          WHERE strainName IN (
            SELECT DISTINCT strainName FROM price_snapshots
          )
          GROUP BY snapshotDate
          ORDER BY snapshotDate DESC
          LIMIT ${limit}
        `);
      } else {
        query = await db.execute(sql`
          SELECT
            snapshotDate as date,
            ROUND(AVG(price), 2) as avgPrice,
            MIN(price) as minPrice,
            MAX(price) as maxPrice,
            COUNT(DISTINCT strainId) as strainCount
          FROM price_snapshots
          GROUP BY snapshotDate
          ORDER BY snapshotDate DESC
          LIMIT ${limit}
        `);
      }

      const rows = (query as any)[0] as any[];
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          date: String(r.date),
          avgPrice: Number(r.avgPrice),
          minPrice: Number(r.minPrice),
          maxPrice: Number(r.maxPrice),
          strainCount: Number(r.strainCount),
        })).reverse();
      }
    } catch (err) {
      console.warn("[MarketData] DB price trends query failed:", err);
    }
  }

  // Fallback: single data point from catalog
  const overview = await getMarketOverview();
  return [{
    date: new Date().toISOString().split("T")[0],
    avgPrice: overview.avgPrice,
    minPrice: overview.lowestPrice,
    maxPrice: overview.highestPrice,
    strainCount: overview.totalStrains,
  }];
}

/**
 * Get snapshot dates available in the DB.
 */
export async function getAvailableSnapshotDates(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(sql`
      SELECT DISTINCT snapshotDate
      FROM price_snapshots
      ORDER BY snapshotDate DESC
    `);
    const rows = (result as any)[0] as any[];
    return rows.map((r: any) => String(r.snapshotDate));
  } catch {
    return [];
  }
}

/**
 * Get a full market data bundle for the dashboard.
 * Combines all aggregations into a single response to minimize round-trips.
 */
export async function getMarketDashboardData(): Promise<{
  overview: MarketOverview;
  regional: RegionalPriceData[];
  topAvailable: StrainAvailability[];
  topVolatile: PriceVolatility[];
  brandShare: Awaited<ReturnType<typeof getBrandMarketShare>>;
  priceTrends: PriceTrend[];
  snapshotDates: string[];
}> {
  const [overview, regional, topAvailable, topVolatile, brandShare, priceTrends, snapshotDates] =
    await Promise.all([
      getMarketOverview(),
      getRegionalPrices(),
      getMostAvailableStrains(20),
      getPriceVolatility(20),
      getBrandMarketShare(20),
      getPriceTrends(),
      getAvailableSnapshotDates(),
    ]);

  return {
    overview,
    regional,
    topAvailable,
    topVolatile,
    brandShare,
    priceTrends,
    snapshotDates,
  };
}

```

---

## 4. `server/alertTriggerEngine.ts`

**Lines:** 283

```typescript
/**
 * StrainScout MD — Alert Trigger Engine
 * Sprint 8: Compares catalog prices against active user alerts
 * and fires push notifications via Manus notification API when targets are met.
 *
 * Designed to run:
 *   1. After every catalog refresh (triggered via tRPC admin endpoint)
 *   2. On-demand via the admin dashboard
 *
 * Notification rules:
 *   - Max 1 notification per alert per 24 hours (frequency cap)
 *   - Alert status changes to "triggered" with price/dispensary/timestamp details
 *   - Expired alerts (>90 days) are automatically marked as expired
 */

import { getActiveAlerts, updatePriceAlert, getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { priceAlerts } from "../drizzle/schema";
import { eq, and, sql, lt } from "drizzle-orm";

const CATALOG_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strainscout_catalog_v8.min_b0a7caef.json";

/** Minimal catalog strain shape needed for price comparison */
interface CatalogStrainPrice {
  id: string;
  name: string;
  prices: { dispensary: string; price: number }[];
}

/** Result of a single alert check */
export interface AlertTriggerResult {
  alertId: number;
  strainId: string;
  strainName: string;
  targetPrice: number;
  matchedPrice: number;
  matchedDispensary: string;
  userId: number;
  notified: boolean;
}

/** Summary of a full trigger engine run */
export interface TriggerRunSummary {
  runAt: string;
  activeAlertsChecked: number;
  alertsTriggered: number;
  alertsExpired: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: string[];
  triggers: AlertTriggerResult[];
}

/**
 * Fetch the current catalog from CDN and build a price lookup map.
 * Map key: strainId → array of { dispensary, price }
 */
async function fetchCatalogPrices(): Promise<Map<string, { dispensary: string; price: number }[]>> {
  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);

  const data = (await res.json()) as CatalogStrainPrice[];
  const priceMap = new Map<string, { dispensary: string; price: number }[]>();

  for (const strain of data) {
    if (!strain.prices || strain.prices.length === 0) continue;
    const validPrices = strain.prices.filter((p) => p.price > 0);
    if (validPrices.length > 0) {
      priceMap.set(strain.id, validPrices);
    }
  }

  return priceMap;
}

/**
 * Expire alerts that have passed their expiresAt date.
 * Returns the count of alerts expired.
 */
async function expireOldAlerts(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();

  const result = await db
    .update(priceAlerts)
    .set({ status: "expired" })
    .where(
      and(
        eq(priceAlerts.status, "active"),
        lt(priceAlerts.expiresAt, now)
      )
    );

  // MySQL returns affectedRows in the result
  return (result as any)[0]?.affectedRows ?? 0;
}

/**
 * Check if an alert was already triggered/notified within the last 24 hours.
 * This enforces the frequency cap of max 1 notification per alert per day.
 */
function wasRecentlyTriggered(triggeredAt: Date | null): boolean {
  if (!triggeredAt) return false;
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  return triggeredAt.getTime() > twentyFourHoursAgo;
}

/**
 * Build a notification message for a triggered alert.
 */
function buildNotificationMessage(trigger: AlertTriggerResult): {
  title: string;
  content: string;
} {
  const savings = (trigger.targetPrice - trigger.matchedPrice).toFixed(2);
  return {
    title: `Price Alert: ${trigger.strainName} is now $${trigger.matchedPrice.toFixed(2)}`,
    content: [
      `Your price alert for **${trigger.strainName}** has been triggered!`,
      "",
      `Current price: $${trigger.matchedPrice.toFixed(2)} at ${trigger.matchedDispensary}`,
      `Your target: $${trigger.targetPrice.toFixed(2)}`,
      savings !== "0.00" ? `You're saving $${savings} below your target.` : `Price matches your target exactly.`,
      "",
      `View this strain on StrainScout MD to see all available prices.`,
    ].join("\n"),
  };
}

/**
 * Main trigger engine function.
 * Loads all active alerts, fetches current catalog prices,
 * compares each alert against the catalog, and fires notifications for matches.
 */
export async function runAlertTriggerEngine(): Promise<TriggerRunSummary> {
  const summary: TriggerRunSummary = {
    runAt: new Date().toISOString(),
    activeAlertsChecked: 0,
    alertsTriggered: 0,
    alertsExpired: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    errors: [],
    triggers: [],
  };

  try {
    // Step 1: Expire old alerts
    summary.alertsExpired = await expireOldAlerts();

    // Step 2: Fetch current catalog prices
    const priceMap = await fetchCatalogPrices();

    // Step 3: Load all active alerts
    const activeAlerts = await getActiveAlerts();
    summary.activeAlertsChecked = activeAlerts.length;

    if (activeAlerts.length === 0) {
      return summary;
    }

    // Step 4: Check each alert against catalog prices
    const triggeredAlerts: AlertTriggerResult[] = [];

    for (const alert of activeAlerts) {
      const catalogPrices = priceMap.get(alert.strainId);
      if (!catalogPrices || catalogPrices.length === 0) continue;

      // Parse the target price from decimal string
      const targetPrice = parseFloat(String(alert.targetPrice));
      if (isNaN(targetPrice) || targetPrice <= 0) continue;

      // Check frequency cap — skip if triggered within last 24 hours
      if (wasRecentlyTriggered(alert.triggeredAt)) continue;

      // Find matching prices
      let bestMatch: { dispensary: string; price: number } | null = null;

      for (const cp of catalogPrices) {
        if (cp.price > targetPrice) continue;

        // If alert is for a specific dispensary, only match that one
        if (alert.dispensary && alert.dispensary !== cp.dispensary) continue;

        // Track the lowest matching price
        if (!bestMatch || cp.price < bestMatch.price) {
          bestMatch = cp;
        }
      }

      if (bestMatch) {
        triggeredAlerts.push({
          alertId: alert.id,
          strainId: alert.strainId,
          strainName: alert.strainName,
          targetPrice,
          matchedPrice: bestMatch.price,
          matchedDispensary: bestMatch.dispensary,
          userId: alert.userId,
          notified: false,
        });
      }
    }

    // Step 5: Update alert statuses and send notifications
    for (const trigger of triggeredAlerts) {
      try {
        // Update the alert to "triggered" status with details
        await updatePriceAlert(trigger.alertId, {
          status: "triggered",
        });

        // Also update the triggered details directly (updatePriceAlert doesn't handle these)
        const db = await getDb();
        if (db) {
          await db
            .update(priceAlerts)
            .set({
              triggeredPrice: String(trigger.matchedPrice),
              triggeredDispensary: trigger.matchedDispensary,
              triggeredAt: new Date(),
              currentPrice: String(trigger.matchedPrice),
            })
            .where(eq(priceAlerts.id, trigger.alertId));
        }

        // Send push notification via Manus notification API
        const message = buildNotificationMessage(trigger);
        const notified = await notifyOwner(message);

        trigger.notified = notified;
        if (notified) {
          summary.notificationsSent++;
        } else {
          summary.notificationsFailed++;
        }

        summary.alertsTriggered++;
        summary.triggers.push(trigger);
      } catch (err) {
        const errorMsg = `Failed to process alert ${trigger.alertId}: ${err instanceof Error ? err.message : String(err)}`;
        summary.errors.push(errorMsg);
        console.error(`[AlertTrigger] ${errorMsg}`);
      }
    }

    // Step 6: Send a summary notification to the owner if any alerts were triggered
    if (summary.alertsTriggered > 0) {
      try {
        const summaryLines = summary.triggers.map(
          (t) => `• ${t.strainName}: $${t.matchedPrice.toFixed(2)} at ${t.matchedDispensary} (target: $${t.targetPrice.toFixed(2)})`
        );

        await notifyOwner({
          title: `StrainScout: ${summary.alertsTriggered} Price Alert${summary.alertsTriggered > 1 ? "s" : ""} Triggered`,
          content: [
            `${summary.alertsTriggered} of ${summary.activeAlertsChecked} active alerts matched current catalog prices.`,
            "",
            "Triggered alerts:",
            ...summaryLines,
            "",
            `${summary.alertsExpired} expired alerts were cleaned up.`,
            `Run completed at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET.`,
          ].join("\n"),
        });
      } catch {
        // Summary notification failure is non-critical
        console.warn("[AlertTrigger] Failed to send summary notification");
      }
    }

    return summary;
  } catch (err) {
    const errorMsg = `Alert trigger engine failed: ${err instanceof Error ? err.message : String(err)}`;
    summary.errors.push(errorMsg);
    console.error(`[AlertTrigger] ${errorMsg}`);
    return summary;
  }
}

```

---

## 5. `server/profanityFilter.ts`

**Lines:** 137

```typescript
/**
 * Basic profanity filter for user-generated content.
 * Uses a word list + pattern matching approach.
 * Returns { clean: boolean, flaggedWords: string[] }.
 *
 * Design decisions:
 * - Cannabis-related terms are NOT flagged (this is a cannabis app)
 * - Only flags clearly offensive/hateful/spam content
 * - Checks for common evasion patterns (l33t speak, spacing)
 * - Returns flagged words for moderation context
 */

// Offensive words list — kept short and focused on clearly unacceptable content.
// Cannabis terms (weed, bud, dank, etc.) are intentionally excluded.
const BLOCKED_WORDS = [
  // Slurs and hate speech (abbreviated patterns to match variations)
  "nigger", "nigga", "faggot", "retard", "tranny",
  "kike", "spic", "chink", "wetback", "beaner",
  // Extreme profanity
  "fuck", "shit", "cunt", "bitch", "asshole",
  "motherfucker", "cocksucker", "bullshit",
  // Spam/scam patterns
  "buy now", "click here", "free money", "act now",
  "limited time offer", "congratulations you won",
];

// L33t speak substitutions for evasion detection
const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
  "7": "t", "@": "a", "$": "s", "!": "i",
};

/**
 * Normalize text for comparison:
 * - Lowercase
 * - Replace l33t speak characters
 * - Remove repeated characters (e.g., "fuuuck" → "fuck")
 * - Remove spaces between single characters (e.g., "f u c k" → "fuck")
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Replace l33t speak
  for (const [leet, char] of Object.entries(LEET_MAP)) {
    normalized = normalized.replaceAll(leet, char);
  }

  // Remove common separator characters used to evade filters
  normalized = normalized.replace(/[.\-_*#]/g, "");

  // Collapse repeated characters (3+ → 1)
  normalized = normalized.replace(/(.)\1{2,}/g, "$1");

  return normalized;
}

/**
 * Check if text contains single-character-spaced words (e.g., "f u c k")
 */
function checkSpacedWords(text: string): string[] {
  const flagged: string[] = [];
  // Remove all spaces and check against blocked words
  const noSpaces = text.toLowerCase().replace(/\s+/g, "");
  for (const word of BLOCKED_WORDS) {
    const cleanWord = word.replace(/\s+/g, "");
    if (noSpaces.includes(cleanWord)) {
      flagged.push(word);
    }
  }
  return flagged;
}

export interface ProfanityResult {
  /** Whether the content is clean (no profanity detected) */
  clean: boolean;
  /** List of flagged words/patterns found */
  flaggedWords: string[];
  /** The original content */
  original: string;
}

/**
 * Check text content for profanity.
 * Returns clean=true if no issues found.
 */
export function checkProfanity(text: string): ProfanityResult {
  if (!text || text.trim().length === 0) {
    return { clean: true, flaggedWords: [], original: text };
  }

  const flaggedWords: Set<string> = new Set();
  const normalized = normalizeText(text);

  // Check each blocked word against normalized text
  for (const word of BLOCKED_WORDS) {
    const normalizedWord = normalizeText(word);
    // Word boundary check — look for the word not embedded in a longer word
    // Use a simple includes check for multi-word phrases
    if (word.includes(" ")) {
      if (normalized.includes(normalizedWord)) {
        flaggedWords.add(word);
      }
    } else {
      // For single words, check with rough word boundaries
      const regex = new RegExp(`(?:^|[^a-z])${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z]|$)`);
      if (regex.test(normalized)) {
        flaggedWords.add(word);
      }
    }
  }

  // Also check for spaced-out evasion patterns
  const spacedFlags = checkSpacedWords(text);
  for (const w of spacedFlags) {
    flaggedWords.add(w);
  }

  return {
    clean: flaggedWords.size === 0,
    flaggedWords: Array.from(flaggedWords),
    original: text,
  };
}

/**
 * Sanitize text by replacing flagged words with asterisks.
 * Useful for displaying content that was flagged but approved by a moderator.
 */
export function sanitizeText(text: string): string {
  let sanitized = text;
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
    sanitized = sanitized.replace(regex, "*".repeat(word.length));
  }
  return sanitized;
}

```

---

## 6. `server/sitemap.ts`

**Lines:** 122

```typescript
/*
 * StrainScout MD — Dynamic Sitemap Generator
 * Generates XML sitemap from static pages + all strain detail pages.
 * Fetches strain IDs from the CDN catalog on first request, then caches.
 * Mounted at /sitemap.xml in the Express app.
 */

import { Router } from "express";

const BASE_URL = "https://strainscout-md.manus.space";
const CATALOG_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strainscout_catalog_v8.min_b0a7caef.json";

// Static pages with their priorities and change frequencies
const STATIC_PAGES = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/compare", priority: 0.9, changefreq: "daily" },
  { path: "/map", priority: 0.8, changefreq: "weekly" },
  { path: "/top-value", priority: 0.8, changefreq: "daily" },
  { path: "/dispensaries", priority: 0.8, changefreq: "weekly" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Cache strain IDs and dispensary names for 1 hour
let cachedStrainIds: string[] = [];
let cachedDispensaryNames: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function loadCatalog(): Promise<{ strainIds: string[]; dispensaryNames: string[] }> {
  if (cachedStrainIds.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return { strainIds: cachedStrainIds, dispensaryNames: cachedDispensaryNames };
  }

  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
    const data = await res.json() as { id: string }[] | { strains?: { id: string }[] };
    // Handle both formats: array of strains or object with strains key
    const strains = Array.isArray(data) ? data : (data.strains || []);
    if (strains.length > 0) {
      cachedStrainIds = strains.map((s) => s.id);
      // Extract unique dispensary names
      const dispSet = new Set<string>();
      for (const s of strains as { id: string; dispensaries?: string[] }[]) {
        if (s.dispensaries) {
          for (const d of s.dispensaries) dispSet.add(d);
        }
      }
      cachedDispensaryNames = Array.from(dispSet);
      cacheTimestamp = Date.now();
      console.log(`[Sitemap] Loaded ${cachedStrainIds.length} strain IDs and ${cachedDispensaryNames.length} dispensaries from catalog`);
    }
  } catch (err) {
    console.warn("[Sitemap] Could not load strain IDs from CDN:", err);
  }

  return { strainIds: cachedStrainIds, dispensaryNames: cachedDispensaryNames };
}

export function createSitemapRouter(): Router {
  const router = Router();

  router.get("/sitemap.xml", async (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const { strainIds, dispensaryNames } = await loadCatalog();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic strain pages
    for (const id of strainIds) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/strain/${escapeXml(id)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic dispensary pages
    for (const name of dispensaryNames) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/dispensary/${escapeXml(slugify(name))}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  return router;
}

```

---

## 7. `server/storage.ts`

**Lines:** 103

```typescript
// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

```

---

## 8. `server/index.ts`

**Lines:** 34

```typescript
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

```

---
