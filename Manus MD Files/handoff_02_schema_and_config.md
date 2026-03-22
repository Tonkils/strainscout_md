# StrainScout MD — Database Schema, Shared Types, and Configuration

**Handoff Document for Claude Code Review**
**Date:** March 16, 2026 | **Sprint:** 14 | **Checkpoint:** 6570492f

> Database schema definitions, shared constants/types, and all project configuration files.

---

## Files in This Document

1. `drizzle/schema.ts` (245 lines)
2. `drizzle/relations.ts` (2 lines)
3. `shared/const.ts` (6 lines)
4. `shared/types.ts` (8 lines)
5. `package.json` (118 lines)
6. `tsconfig.json` (24 lines)
7. `tsconfig.node.json` (23 lines)
8. `vite.config.ts` (188 lines)
9. `vitest.config.ts` (20 lines)
10. `drizzle.config.ts` (16 lines)
11. `components.json` (20 lines)
12. `client/index.html` (27 lines)
13. `.gitignore` (111 lines)
14. `.prettierrc` (16 lines)
15. `.prettierignore` (36 lines)

---

## 1. `drizzle/schema.ts`

**Lines:** 245

```typescript
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

```

---

## 2. `drizzle/relations.ts`

**Lines:** 2

```typescript
import {} from "./schema";

```

---

## 3. `shared/const.ts`

**Lines:** 6

```typescript
export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

```

---

## 4. `shared/types.ts`

**Lines:** 8

```typescript
/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

```

---

## 5. `package.json`

**Lines:** 118

```json
{
  "name": "strainscout-md",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run",
    "db:push": "drizzle-kit generate && drizzle-kit migrate"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.693.0",
    "@aws-sdk/s3-request-presigner": "^3.693.0",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@tanstack/react-query": "^5.90.2",
    "@trpc/client": "^11.6.0",
    "@trpc/react-query": "^11.6.0",
    "@trpc/server": "^11.6.0",
    "axios": "^1.12.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "cookie": "^1.0.2",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.2",
    "drizzle-orm": "^0.44.5",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "framer-motion": "^12.23.22",
    "input-otp": "^1.4.2",
    "jose": "6.1.0",
    "lucide-react": "^0.453.0",
    "mysql2": "^3.15.0",
    "nanoid": "^5.1.5",
    "next-themes": "^0.4.6",
    "posthog-js": "^1.360.2",
    "react": "^19.2.1",
    "react-day-picker": "^9.11.1",
    "react-dom": "^19.2.1",
    "react-helmet-async": "^3.0.0",
    "react-hook-form": "^7.64.0",
    "react-resizable-panels": "^3.0.6",
    "recharts": "^2.15.4",
    "sonner": "^2.0.7",
    "streamdown": "^1.4.0",
    "superjson": "^1.13.3",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@builder.io/vite-plugin-jsx-loc": "^0.1.1",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/express": "4.17.21",
    "@types/google.maps": "^3.58.1",
    "@types/node": "^24.7.0",
    "@types/react": "^19.2.1",
    "@types/react-dom": "^19.2.1",
    "@vitejs/plugin-react": "^5.0.4",
    "add": "^2.0.6",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.31.4",
    "esbuild": "^0.25.0",
    "pnpm": "^10.15.1",
    "postcss": "^8.4.47",
    "prettier": "^3.6.2",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.19.1",
    "tw-animate-css": "^1.4.0",
    "typescript": "5.9.3",
    "vite": "^7.1.7",
    "vite-plugin-manus-runtime": "^0.0.57",
    "vitest": "^2.1.4"
  },
  "packageManager": "pnpm@10.4.1+sha512.c753b6c3ad7afa13af388fa6d808035a008e30ea9993f58c6663e2bc5ff21679aa834db094987129aa4d488b86df57f7b634981b2f827cdcacc698cc0cfb88af",
  "pnpm": {
    "patchedDependencies": {
      "wouter@3.7.1": "patches/wouter@3.7.1.patch"
    },
    "overrides": {
      "tailwindcss>nanoid": "3.3.7"
    }
  }
}

```

---

## 6. `tsconfig.json`

**Lines:** 24

```json
{
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,
    "module": "ESNext",
    "strict": true,
    "lib": ["esnext", "dom", "dom.iterable"],
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}

```

---

## 7. `tsconfig.node.json`

**Lines:** 23

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}

```

---

## 8. `vite.config.ts`

**Lines:** 188

```typescript
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

```

---

## 9. `vitest.config.ts`

**Lines:** 20

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  },
});

```

---

## 10. `drizzle.config.ts`

**Lines:** 16

```typescript
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});

```

---

## 11. `components.json`

**Lines:** 20

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "client/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}

```

---

## 12. `client/index.html`

**Lines:** 27

```html
<!doctype html>
<html lang="en">

  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>StrainScout MD — Find the Cheapest Cannabis in Maryland</title>
    <meta name="description" content="Compare cannabis prices across 102 Maryland dispensaries. Find the cheapest 8ths, track price drops, and discover the best deals near you. Updated weekly." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://d2xsxph8kpxj0f.cloudfront.net" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script
      defer
      src="%VITE_ANALYTICS_ENDPOINT%/umami"
      data-website-id="%VITE_ANALYTICS_WEBSITE_ID%"></script>
  </body>

</html>

```

---

## 13. `.gitignore`

**Lines:** 111

```
# Dependencies
**/node_modules
.pnpm-store/

# Build outputs
dist/
build/
*.dist

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock
*.bak

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt

# Gatsby files
.cache/

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Database
*.db
*.sqlite
*.sqlite3

# Webdev artifacts (checkpoint zips, migrations, etc.)
.webdev/

```

---

## 14. `.prettierrc`

**Lines:** 16

```
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "proseWrap": "preserve"
}

```

---

## 15. `.prettierignore`

**Lines:** 36

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
*.dist

# Generated files
*.tsbuildinfo
coverage/

# Package files
package-lock.json
pnpm-lock.yaml

# Database
*.db
*.sqlite
*.sqlite3

# Logs
*.log

# Environment files
.env*

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

```

---
