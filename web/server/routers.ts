import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
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
        let partner;
        try {
          partner = await claimDispensary({
            userId: ctx.user.id,
            dispensarySlug: input.dispensarySlug,
            dispensaryName: input.dispensaryName,
            businessName: input.businessName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone ?? null,
          });
        } catch (err: any) {
          if (err.message.includes("already been claimed")) {
            throw new TRPCError({ code: "CONFLICT", message: err.message });
          }
          throw err;
        }

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
