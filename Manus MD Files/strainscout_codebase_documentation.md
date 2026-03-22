# StrainScout MD — Complete Codebase Documentation

**Prepared for:** Claude Code Review
**Date:** March 16, 2026
**Version:** Sprint 14 (Checkpoint 6570492f)
**Total Lines of Code:** ~27,800 (custom source files, excluding node_modules and framework plumbing)
**Test Coverage:** 218 tests across 12 test files, all passing

---

## Table of Contents

1. [Project Intent and Business Context](#1-project-intent-and-business-context)
2. [User Journey Map](#2-user-journey-map)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Database Schema](#5-database-schema)
6. [Server Layer — tRPC Procedures](#6-server-layer--trpc-procedures)
7. [Server Layer — Supporting Modules](#7-server-layer--supporting-modules)
8. [Frontend Layer — Pages and Routes](#8-frontend-layer--pages-and-routes)
9. [Frontend Layer — Components](#9-frontend-layer--components)
10. [Frontend Layer — Hooks and Data Loading](#10-frontend-layer--hooks-and-data-loading)
11. [Design System](#11-design-system)
12. [Analytics Instrumentation](#12-analytics-instrumentation)
13. [Known Issues and Technical Debt](#13-known-issues-and-technical-debt)
14. [File Index](#14-file-index)

---

## 1. Project Intent and Business Context

StrainScout MD is a cannabis price comparison and market intelligence platform focused exclusively on the Maryland medical and recreational cannabis market. The application serves three primary user personas:

**Consumers** are Maryland cannabis patients and recreational users who want to find the cheapest prices for specific strains across the state's ~100 licensed dispensaries. The core value proposition is simple: before StrainScout, a consumer had to visit individual dispensary websites or drive between locations to compare prices. StrainScout aggregates pricing data from 2,220 verified strains across 97 dispensaries into a single searchable interface, saving users time and money.

**Dispensary Operators** are business owners who want to claim their dispensary listing, submit real-time verified prices, and gain a "Partner Verified" badge that builds trust with consumers. The partnership program creates a two-sided marketplace where dispensaries compete on price transparency, and consumers benefit from more accurate data.

**Market Analysts** are industry professionals, investors, or regulators who want to understand pricing trends, regional variations, brand market share, and price volatility across the Maryland cannabis market. The Market Dashboard provides aggregated analytics that would otherwise require manual data collection.

The application was built over 14 development sprints following a structured execution strategy. Each sprint added a distinct feature layer, building from a static catalog viewer (Sprint 1) to a full-stack platform with user accounts, community voting, comments with moderation, price alerts, market intelligence, and a dispensary partnership program (Sprint 14).

### Revenue Model (Planned)

The application is pre-revenue. The planned monetization strategy is:
1. **Partner subscriptions** — dispensaries pay for premium partner features (priority placement, analytics dashboard, bulk price updates)
2. **Email digest sponsorship** — weekly deal digest emails include sponsored placements
3. **Data licensing** — aggregated market data sold to industry analysts

---

## 2. User Journey Map

The application supports 6 distinct user journeys, each mapped to specific pages and backend procedures:

### Journey 1: Price Discovery (Core Loop)

This is the primary user journey and the reason the application exists.

```
Homepage (/) → Search bar or "Browse All" CTA
    ↓
Compare Strains (/compare) → Filter by type, brand, price range, terpene
    ↓
Strain Detail (/strain/:id) → View prices at each dispensary, sorted lowest-first
    ↓
Outbound Link → Click dispensary name to visit their ordering page (Dutchie/Weedmaps)
```

**How the code executes this:**

1. The `Home` page (`client/src/pages/Home.tsx`) renders a hero section with a search bar. The search bar is a controlled `<input>` that filters the catalog client-side using `useMemo`. The catalog data is loaded once via the `useCatalog()` hook, which fetches a 2.5MB JSON file from CloudFront CDN and caches it in a module-level singleton (`cachedCatalog`). This means the catalog is fetched once per browser session, not once per page.

2. When the user types a search query, the `filteredStrains` memo in `Home.tsx` filters the 2,220 strains by name, brand, type, terpenes, effects, flavors, and genetics. Results are sorted by `dispensary_count` (most available first) and limited to 12 cards. Each card is a `DealCard` component that shows the strain name, type badge, brand, price range, and dispensary count.

3. Clicking a strain card navigates to `/strain/:id` via wouter's `<Link>`. The `StrainDetail` page (`client/src/pages/StrainDetail.tsx`, 697 lines) is the most complex page in the application. It loads the strain from the cached catalog (no additional network request), then renders:
   - A hero section with strain name, type, THC/CBD, genetics, grade badge
   - A price table showing every dispensary that carries this strain, sorted by price
   - Terpene profile, effects, and flavors as pill badges
   - Community voting (StrainVoting component — 3-dimension thumbs up/down)
   - Community comments (StrainComments component — moderated text reviews)
   - Similar strains sidebar (same type, similar THC range)
   - Partner Verified badges on dispensaries that have claimed their listing
   - Partner Verified Prices section showing real-time prices from verified partners

4. Each dispensary row in the price table includes an outbound link. The link destination is determined by the `ordering_links` field in the catalog data, which maps dispensary names to Dutchie and Weedmaps ordering URLs. If no ordering link exists, the row links to the dispensary detail page instead.

### Journey 2: Geographic Discovery

```
Map (/map) → Interactive Google Maps with dispensary markers
    ↓
Click marker → Info window with dispensary name, address, strain count
    ↓
Dispensary Detail (/dispensary/:slug) → Full dispensary profile with strain list
```

**How the code executes this:**

The `MapView` page (`client/src/pages/MapView.tsx`, 1,102 lines — the largest page) uses the template's `Map.tsx` component, which provides a Google Maps instance via the Manus proxy (no API key needed). The `onMapReady` callback receives the `google.maps` object, and MapView initializes:
- Custom markers for each dispensary using `google.maps.marker.AdvancedMarkerElement`
- Marker clustering via `@googlemaps/markerclusterer`
- A sidebar list of dispensaries with search, type filter, and distance sorting
- Drive time calculation using `google.maps.DistanceMatrixService` (via the `useDriveTime` hook)
- Info windows with dispensary details and a "View Details" link

The dispensary data comes from the same CDN catalog via `useCatalog()`. Each dispensary has `lat`/`lng` coordinates, so no geocoding is needed.

### Journey 3: Market Intelligence

```
Market Dashboard (/market) → 6 analytics panels
    ↓
Overview → Total strains, avg/median/min/max prices, price by type
Regional Prices → 5 Maryland regions with price comparisons
Most Available → Top strains by dispensary count
Price Volatility → Strains with highest price variance
Brand Market Share → Treemap of brand dominance
Price Trends → Historical price movement (requires DB snapshots)
```

**How the code executes this:**

The `MarketDashboard` page (`client/src/pages/MarketDashboard.tsx`, 899 lines) calls `trpc.market.dashboard.useQuery()`, which hits a single tRPC procedure that bundles all 6 data sections into one response. On the server, `getMarketDashboardData()` in `server/marketData.ts` (562 lines) orchestrates 6 aggregation functions:

- `getMarketOverview()` — computes statistics from the live CDN catalog
- `getRegionalPrices()` — maps dispensaries to 5 Maryland regions (Baltimore Metro, DC Metro, Eastern Shore, Western Maryland, Central Maryland) using a hardcoded geographic lookup table, then computes per-region price statistics
- `getMostAvailableStrains()` — sorts strains by dispensary count
- `getPriceVolatility()` — computes standard deviation of prices across dispensaries for each strain
- `getBrandMarketShare()` — counts strains per brand
- `getPriceTrends()` — queries the `price_snapshots` database table for historical data (requires the admin to run the weekly snapshot ingest)

The frontend renders these using Recharts (bar charts, line charts, area charts) and custom card layouts. The regional map is a static SVG of Maryland with colored regions.

### Journey 4: Community Engagement

```
Strain Detail (/strain/:id) → Scroll to voting section
    ↓
Vote (requires login) → 3-dimension thumbs up/down + optional 140-char comment
    ↓
Strain Detail → Scroll to comments section
    ↓
Comment (requires login) → 1000-char review, auto-moderated by profanity filter
    ↓
Admin: Moderation (/moderation) → Review flagged comments, approve/reject
```

**How the code executes this:**

The `StrainVoting` component (`client/src/components/StrainVoting.tsx`, ~200 lines) provides a 3-dimension voting interface. Each dimension (Effects Accuracy, Value for Money, Overall Quality) has thumbs-up and thumbs-down buttons. The component:
1. Fetches aggregate vote data via `trpc.votes.aggregates.useQuery({ strainId })` (public)
2. Fetches the user's existing vote via `trpc.votes.myVote.useQuery({ strainId })` (protected, only fires if authenticated)
3. On vote submission, calls `trpc.votes.submit.useMutation()`, which upserts the vote (one vote per user per strain, enforced by a UNIQUE index)
4. Uses optimistic cache updates — the vote counts update immediately, then reconcile with the server response

The `StrainComments` component (`client/src/components/StrainComments.tsx`, ~180 lines) provides a comment form and comment list. The submission flow:
1. User types a comment (10-1000 characters)
2. On submit, `trpc.comments.submit` is called
3. Server-side, the comment text is run through `checkProfanity()` from `server/profanityFilter.ts`
4. If clean: comment is auto-approved (status: "approved") and immediately visible
5. If flagged: comment goes to "pending" status and the user sees "Your comment is under review"
6. The profanity filter checks for: blocked words, l33t speak evasion (e.g., "f*ck" → "fuck"), spaced evasion (e.g., "f u c k"), and spam patterns ("buy now", "click here")

The `Moderation` page (`client/src/pages/Moderation.tsx`, 288 lines) is admin-only. It lists all comments with filter tabs (All, Pending, Approved, Rejected), shows a pending count badge in the header, and provides approve/reject buttons with optional moderation notes.

### Journey 5: Price Alerts

```
Strain Detail (/strain/:id) → "Set Price Alert" button
    ↓
Alerts (/alerts) → Dashboard with active/triggered/expired alerts
    ↓
Background: Alert Trigger Engine → Checks catalog prices against alert targets
    ↓
Notification → Owner notification when alert triggers
```

**How the code executes this:**

The `Alerts` page (`client/src/pages/Alerts.tsx`, 478 lines) provides a full alert management dashboard. Users can:
1. Create alerts from strain detail pages (target price, optional dispensary filter)
2. View all alerts in a sortable table with status badges
3. Edit alert target prices and dispensary filters
4. Pause/resume alerts
5. Delete alerts

The backend enforces a maximum of 20 active alerts per user. Alert lifecycle: `active` → `triggered` (price met) or `expired` (90-day timeout).

The `alertTriggerEngine.ts` (282 lines) is a server-side module that:
1. Fetches the live CDN catalog
2. Queries all active alerts from the database
3. For each alert, checks if any dispensary price is at or below the target
4. If triggered: updates the alert status, records the trigger price and dispensary, and sends an owner notification
5. Also expires alerts past their `expiresAt` date
6. Has a 24-hour frequency cap to prevent notification spam

The engine is triggered manually via `trpc.alerts.runTriggerCheck` (admin-only). A future sprint would add a cron job.

### Journey 6: Dispensary Partnership

```
Partner Portal (/partner) → Login gate
    ↓
Claim Wizard → Step 1: Search and select dispensary
    ↓
Step 2: Enter business info (name, email, phone)
    ↓
Step 3: Review and submit claim
    ↓
Admin: Admin Partners (/admin/partners) → Review and verify claim
    ↓
Partner Dashboard → Stats, price update form, submission history
    ↓
Submit Price → Strain search, price entry, unit selection
    ↓
Admin: Admin Partners → Review and approve price update
    ↓
Strain Detail → "Partner Verified" badge appears on dispensary row
```

**How the code executes this:**

The `PartnerPortal` page (`client/src/pages/PartnerPortal.tsx`, 791 lines) has two states:
1. **No partnership:** Shows the ClaimWizard, a 3-step form that searches dispensaries from the catalog, collects business info, and submits a claim via `trpc.partners.claim`
2. **Has partnership:** Shows the PartnerDashboard with stats (total submissions, approved count, pending count), a PriceUpdateForm, and a RecentSubmissions list

The `AdminPartners` page (`client/src/pages/AdminPartners.tsx`, 501 lines) has two tabs:
1. **Claims:** Lists all partner claims with filter by status, expand/collapse details, approve/reject with notes
2. **Price Updates:** Lists all price submissions with the same pattern

When an admin approves a claim, the dispensary's `verificationStatus` changes to "verified". The `StrainDetail` page queries `trpc.partners.verifiedSlugs` to get all verified dispensary slugs, then shows a `PartnerVerifiedBadge` next to matching dispensary names in the price table.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client (React 19)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Pages   │ │Components│ │  Hooks   │ │ Analytics │  │
│  │ (15 pgs) │ │ (12 cmp) │ │ (7 hooks)│ │ (18 evts) │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│       └─────────────┴────────────┘              │        │
│                     │                           │        │
│              trpc.*.useQuery()            PostHog SDK     │
│              trpc.*.useMutation()                        │
│                     │                                    │
└─────────────────────┼────────────────────────────────────┘
                      │ HTTP (batched JSON-RPC over /api/trpc)
┌─────────────────────┼────────────────────────────────────┐
│                 Server (Express 4 + tRPC 11)             │
│                     │                                    │
│  ┌──────────────────┴──────────────────────────────┐     │
│  │              routers.ts (53 procedures)          │     │
│  │  alerts(7) · votes(6) · auth(2) · emailSignup(3)│     │
│  │  market(7) · priceDrops(6) · comments(7)         │     │
│  │  partners(15)                                     │     │
│  └──────────────────┬──────────────────────────────┘     │
│                     │                                    │
│  ┌──────────┐ ┌─────┴──────┐ ┌────────────┐ ┌────────┐  │
│  │  db.ts   │ │marketData  │ │profanity   │ │sitemap │  │
│  │(54 funcs)│ │(6 agg fns) │ │Filter.ts   │ │.ts     │  │
│  └────┬─────┘ └────┬───────┘ └────────────┘ └────────┘  │
│       │             │                                    │
│       │      CDN Catalog Fetch                           │
│       │      (2.5MB JSON)                                │
│       │                                                  │
│  ┌────┴──────────────────────────────────────────────┐   │
│  │           Drizzle ORM → TiDB (MySQL)              │   │
│  │  7 tables: users, email_signups, price_snapshots, │   │
│  │  price_drops, price_alerts, strain_votes,         │   │
│  │  strain_comments, dispensary_partners,             │   │
│  │  partner_price_updates                             │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │           S3 Storage (storagePut/storageGet)       │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

The application has a **hybrid data architecture** that uses two data sources:

1. **CDN Catalog (Read-Only, Static):** A 2.5MB JSON file hosted on CloudFront containing all 2,220 strains with their prices, dispensary listings, terpene profiles, effects, and metadata. This file is the single source of truth for strain and dispensary data. It is generated externally (outside this codebase) by a data pipeline that scrapes dispensary websites weekly. The catalog is versioned (currently v8) and includes a validation score (96.2%).

2. **TiDB Database (Read-Write, Dynamic):** A MySQL-compatible database that stores user-generated data: accounts, email signups, price snapshots (historical), price drops, price alerts, strain votes, strain comments, dispensary partnerships, and partner price updates. All 7 tables are defined in `drizzle/schema.ts` and managed via Drizzle ORM.

This hybrid approach means the application works even if the database is down — the core price comparison features (search, filter, strain detail, map) only need the CDN catalog. Database-dependent features (voting, comments, alerts, partnerships) degrade gracefully with loading states and error messages.

---

## 4. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 19 | UI rendering, component model |
| **Routing** | wouter | Lightweight client-side routing (3KB vs React Router's 30KB) |
| **Styling** | Tailwind CSS 4 | Utility-first CSS with OKLCH color tokens |
| **UI Components** | shadcn/ui | Pre-built accessible components (Button, Card, Dialog, etc.) |
| **Charts** | Recharts | Market dashboard visualizations |
| **Icons** | Lucide React | Consistent icon set (tree-shakeable) |
| **Maps** | Google Maps JS API | Dispensary map with markers, clustering, drive time |
| **SEO** | react-helmet-async | Dynamic `<title>` and `<meta>` tags per page |
| **Markdown** | Streamdown | Rendering markdown content with streaming support |
| **API Client** | tRPC 11 + TanStack Query | Type-safe RPC with automatic caching and invalidation |
| **Serialization** | superjson | Preserves Date, Decimal, and other types across the wire |
| **Server** | Express 4 | HTTP server, OAuth callback, sitemap, static files |
| **RPC Framework** | tRPC 11 | Type-safe procedures with Zod validation |
| **ORM** | Drizzle ORM | Type-safe SQL queries, schema management, migrations |
| **Database** | TiDB (MySQL-compatible) | Managed cloud database |
| **Auth** | Manus OAuth | Session cookies, JWT signing |
| **Storage** | AWS S3 | File storage via `storagePut`/`storageGet` helpers |
| **Analytics** | PostHog | Event tracking (18 custom events) |
| **Testing** | Vitest | Unit tests for server logic (218 tests) |
| **Build** | Vite | Frontend bundling, HMR, code splitting |
| **Deployment** | Manus Platform | Managed hosting with .manus.space domain |

---

## 5. Database Schema

The database contains 8 tables (7 custom + 1 system `users` table). All tables use auto-incrementing integer primary keys and UTC timestamps.

### Table: `users`

The core authentication table, populated automatically by the Manus OAuth flow.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | Surrogate key for all relations |
| `openId` | VARCHAR(64), UNIQUE | Manus OAuth identifier |
| `name` | TEXT | Display name from OAuth |
| `email` | VARCHAR(320) | Email from OAuth (nullable) |
| `loginMethod` | VARCHAR(64) | OAuth provider method |
| `role` | ENUM('user','admin') | Access control (default: 'user') |
| `createdAt` | TIMESTAMP | Account creation |
| `updatedAt` | TIMESTAMP | Last profile update |
| `lastSignedIn` | TIMESTAMP | Last login timestamp |

**Reasoning:** The `role` field enables admin-only procedures (moderation, partner management, snapshot ingestion). The `openId` is the stable identifier from Manus OAuth — it never changes even if the user's name or email changes.

### Table: `email_signups`

Captures email addresses from 4 different capture points throughout the application.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | |
| `email` | VARCHAR(320) | Subscriber email |
| `source` | ENUM('footer','deal_digest','price_alert','compare_inline') | Which capture form |
| `strainId` | VARCHAR(128) | Strain context (if from price_alert or compare_inline) |
| `strainName` | VARCHAR(256) | Human-readable strain name |
| `status` | ENUM('active','unsubscribed') | Subscription status |
| `subscribedAt` | TIMESTAMP | Signup time |

**Reasoning:** The `source` enum tracks conversion funnel effectiveness. The `strainId`/`strainName` fields enable personalized digest emails ("You signed up while viewing Blue Dream — here are this week's deals").

### Table: `price_snapshots`

Historical price data ingested weekly from the CDN catalog.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | |
| `strainId` | VARCHAR(128) | Strain identifier |
| `strainName` | VARCHAR(256) | Human-readable name |
| `dispensary` | VARCHAR(256) | Dispensary name |
| `price` | DECIMAL(8,2) | Price at this dispensary |
| `snapshotDate` | DATE | Date of the snapshot |
| `createdAt` | TIMESTAMP | Ingestion time |

**Indexes:** `UNIQUE(strainId, dispensary, snapshotDate)` prevents duplicate snapshots. `INDEX(strainId, snapshotDate)` optimizes the price history query.

**Reasoning:** This table enables the "Price Trends" chart on the Market Dashboard and the "Price History" section on strain detail pages. Each weekly catalog ingest creates ~50,000 rows (2,220 strains × ~23 dispensaries each).

### Table: `price_drops`

Computed price drops detected by comparing consecutive snapshots.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | |
| `strainId` | VARCHAR(128) | |
| `strainName` | VARCHAR(256) | |
| `dispensary` | VARCHAR(256) | |
| `oldPrice` | DECIMAL(8,2) | Previous week's price |
| `newPrice` | DECIMAL(8,2) | Current week's price |
| `dropAmount` | DECIMAL(8,2) | Absolute dollar drop |
| `dropPercent` | DECIMAL(5,2) | Percentage drop |
| `detectedAt` | TIMESTAMP | When the drop was detected |
| `snapshotDate` | DATE | Which snapshot comparison |
| `notified` | ENUM('pending','sent') | Email digest notification status |

**Reasoning:** Separating price drops from snapshots allows efficient querying of "what dropped this week" without scanning the full snapshot history. The `notified` flag enables the weekly email digest to only include new drops.

### Table: `price_alerts`

User-created price alerts with target prices.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | |
| `userId` | INT | Owner (no FK constraint — see Finding #15) |
| `strainId` | VARCHAR(128) | |
| `strainName` | VARCHAR(256) | |
| `dispensary` | VARCHAR(256) | Optional: specific dispensary filter |
| `targetPrice` | DECIMAL(8,2) | Alert triggers when price ≤ this |
| `currentPrice` | DECIMAL(8,2) | Price at time of alert creation |
| `status` | ENUM('active','paused','triggered','expired') | Lifecycle state |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |
| `triggeredAt` | TIMESTAMP | When the alert fired |
| `triggeredPrice` | DECIMAL(8,2) | The price that triggered the alert |
| `triggeredDispensary` | VARCHAR(256) | Which dispensary had the matching price |
| `expiresAt` | TIMESTAMP | 90-day auto-expiration |

**Reasoning:** The `dispensary` field is nullable — `NULL` means "any dispensary". The `triggeredPrice` and `triggeredDispensary` fields record the exact match for the notification message. The 90-day expiration prevents stale alerts from accumulating.

### Table: `strain_votes`

Community 3-dimension voting system.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | |
| `userId` | INT | Voter |
| `strainId` | VARCHAR(128) | |
| `strainName` | VARCHAR(256) | |
| `effectsAccuracy` | INT | +1 (thumbs up) or -1 (thumbs down) |
| `valueForMoney` | INT | +1 or -1 |
| `overallQuality` | INT | +1 or -1 |
| `comment` | VARCHAR(140) | Optional short comment |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |

**Indexes:** `UNIQUE(userId, strainId)` enforces one vote per user per strain. The vote is an upsert — if the user votes again, the existing vote is updated.

**Reasoning:** Three dimensions provide more nuanced feedback than a single rating. The 140-character comment limit keeps vote comments brief (longer reviews go in the `strain_comments` table).

### Table: `strain_comments`

Moderated community reviews.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | |
| `userId` | INT | Author |
| `userName` | VARCHAR(256) | Denormalized for display |
| `strainId` | VARCHAR(128) | |
| `strainName` | VARCHAR(256) | |
| `content` | TEXT | Review text (10-1000 chars) |
| `status` | ENUM('pending','approved','rejected') | Moderation state |
| `moderationNote` | VARCHAR(256) | Admin rejection reason |
| `flagged` | ENUM('clean','flagged') | Profanity filter result |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |

**Reasoning:** The `userName` is denormalized (copied from the `users` table at submission time) to avoid a JOIN on every comment display. The `flagged` field records the profanity filter's verdict independently of the moderation status — a flagged comment can still be approved by an admin.

### Table: `dispensary_partners`

Dispensary partnership claims.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | |
| `userId` | INT | Claiming user |
| `dispensarySlug` | VARCHAR(256), UNIQUE | URL-safe dispensary identifier |
| `dispensaryName` | VARCHAR(256) | Human-readable name |
| `businessName` | VARCHAR(256) | Legal business name |
| `contactEmail` | VARCHAR(320) | Business contact |
| `contactPhone` | VARCHAR(32) | Optional phone |
| `verificationStatus` | ENUM('pending','verified','rejected') | Admin review state |
| `partnerTier` | ENUM('basic','premium') | Feature tier |
| `adminNote` | VARCHAR(512) | Admin notes |
| `claimedAt` | TIMESTAMP | |
| `verifiedAt` | TIMESTAMP | When admin approved |
| `updatedAt` | TIMESTAMP | |

**Reasoning:** The `dispensarySlug` UNIQUE constraint ensures one claim per dispensary. The `partnerTier` field enables future premium features without a schema change.

### Table: `partner_price_updates`

Real-time prices submitted by verified partners.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT (PK, auto) | |
| `partnerId` | INT | Submitting partner |
| `dispensarySlug` | VARCHAR(256) | |
| `dispensaryName` | VARCHAR(256) | |
| `strainId` | VARCHAR(128) | |
| `strainName` | VARCHAR(256) | |
| `price` | DECIMAL(8,2) | Submitted price |
| `unit` | VARCHAR(16) | Weight unit (3.5g, 7g, 14g, 28g) |
| `status` | ENUM('pending','approved','rejected') | Admin review state |
| `reviewNote` | VARCHAR(256) | Admin notes |
| `submittedAt` | TIMESTAMP | |
| `reviewedAt` | TIMESTAMP | |
| `expiresAt` | TIMESTAMP | 7-day auto-expiration |

**Reasoning:** The `expiresAt` field ensures partner prices don't stay visible indefinitely — cannabis prices change frequently, and a 7-day window keeps the data fresh. The `unit` field supports different weight tiers (eighth, quarter, half, ounce).

---

## 6. Server Layer — tRPC Procedures

All backend logic is exposed through tRPC procedures defined in `server/routers.ts` (703 lines). Procedures are organized into 8 routers with 53 total procedures. Each procedure uses one of three access levels:

- **`publicProcedure`** — No authentication required. Used for read-only data access.
- **`protectedProcedure`** — Requires a valid session cookie. Injects `ctx.user` with the authenticated user record.
- **`adminProcedure`** — Requires authentication AND `ctx.user.role === 'admin'`. Used for moderation and data management.

### Router: `alerts` (7 procedures)

| Procedure | Access | Input | Purpose |
|-----------|--------|-------|---------|
| `create` | protected | strainId, strainName, dispensary?, targetPrice, currentPrice? | Create a new price alert (max 20 per user) |
| `list` | protected | — | List all alerts for the current user |
| `update` | protected | id, targetPrice?, status?, dispensary? | Edit an alert (ownership verified) |
| `delete` | protected | id | Delete an alert (ownership verified) |
| `count` | protected | — | Count active alerts for the current user |
| `hasAlert` | protected | strainId | Check if user has an active alert for a strain |
| `runTriggerCheck` | admin | — | Manually run the alert trigger engine |

### Router: `votes` (6 procedures)

| Procedure | Access | Input | Purpose |
|-----------|--------|-------|---------|
| `submit` | protected | strainId, strainName, effectsAccuracy, valueForMoney, overallQuality, comment? | Upsert a 3-dimension vote |
| `myVote` | protected | strainId | Get the current user's vote for a strain |
| `aggregates` | public | strainId | Get aggregate vote counts for a strain |
| `comments` | public | strainId | Get all vote comments for a strain |
| `delete` | protected | strainId | Delete the current user's vote |
| `myCount` | protected | — | Count total votes by the current user |

### Router: `auth` (2 procedures)

| Procedure | Access | Input | Purpose |
|-----------|--------|-------|---------|
| `me` | public | — | Get the current user (null if not logged in) |
| `logout` | public | — | Clear session cookie |

### Router: `emailSignup` (3 procedures)

| Procedure | Access | Input | Purpose |
|-----------|--------|-------|---------|
| `submit` | public | email, source, strainId?, strainName? | Submit an email signup |
| `list` | admin | limit?, offset? | List all signups (paginated) |
| `stats` | admin | — | Get signup statistics by source |

### Router: `market` (7 procedures)

| Procedure | Access | Input | Purpose |
|-----------|--------|-------|---------|
| `dashboard` | public | — | Bundle all 6 market data sections |
| `overview` | public | — | Market overview statistics |
| `regional` | public | — | Regional price comparisons |
| `topAvailable` | public | limit? | Most available strains |
| `volatility` | public | limit? | Most price-volatile strains |
| `brands` | public | limit? | Brand market share |
| `trends` | public | strainId? | Historical price trends |

### Router: `priceDrops` (6 procedures)

| Procedure | Access | Input | Purpose |
|-----------|--------|-------|---------|
| `recent` | public | limit? | Recent price drops |
| `byStrain` | public | strainId | Price drops for a specific strain |
| `history` | public | strainId | Full price history for a strain |
| `stats` | admin | — | Price drop statistics |
| `sendDigest` | admin | — | Send weekly email digest |
| `ingestSnapshot` | admin | snapshots[] | Ingest weekly price snapshot data |

### Router: `comments` (7 procedures)

| Procedure | Access | Input | Purpose |
|-----------|--------|-------|---------|
| `submit` | protected | strainId, strainName, content | Submit a comment (profanity-checked) |
| `list` | public | strainId, limit? | Get approved comments for a strain |
| `count` | public | strainId | Count approved comments for a strain |
| `delete` | protected | id | Delete own comment (ownership verified) |
| `moderation` | admin | status?, limit?, offset? | List all comments with filter |
| `pendingCount` | admin | — | Count pending comments |
| `moderate` | admin | id, status, moderationNote? | Approve or reject a comment |

### Router: `partners` (15 procedures)

| Procedure | Access | Input | Purpose |
|-----------|--------|-------|---------|
| `claim` | protected | dispensarySlug, dispensaryName, businessName, contactEmail, contactPhone? | Submit a partnership claim |
| `myPartnership` | protected | — | Get the current user's partnership |
| `submitPrice` | protected | strainId, strainName, price, unit? | Submit a verified price |
| `myPriceUpdates` | protected | limit? | List own price submissions |
| `myStats` | protected | — | Get own submission statistics |
| `isVerified` | public | dispensarySlug | Check if a dispensary is verified |
| `verifiedSlugs` | public | — | Get all verified dispensary slugs |
| `verifiedPrices` | public | strainId | Get approved partner prices for a strain |
| `bySlug` | public | dispensarySlug | Get partner info by slug |
| `adminList` | admin | status? | List all partner claims |
| `adminPendingCount` | admin | — | Count pending claims |
| `adminVerify` | admin | id, status, adminNote? | Approve or reject a claim |
| `adminPriceUpdates` | admin | status? | List all price submissions |
| `adminPendingPriceCount` | admin | — | Count pending price submissions |
| `adminReviewPrice` | admin | id, status, reviewNote? | Approve or reject a price submission |

---

## 7. Server Layer — Supporting Modules

### `server/db.ts` (1,375 lines, 54 functions)

The database access layer. Every function follows the same pattern:
1. Get the Drizzle DB instance via `getDb()` (lazy-initialized singleton)
2. If DB is unavailable, return a sensible default (empty array, null, 0) — never throw
3. Execute a Drizzle query using the schema types
4. Return the raw result (no transformation — tRPC + superjson handle serialization)

**Key design decision:** Functions return raw Drizzle rows, not transformed DTOs. This keeps the DB layer thin and lets the tRPC procedures handle any business logic. The tradeoff is that some procedures have more logic than ideal, but it keeps the DB functions simple and testable.

### `server/marketData.ts` (562 lines, 7 functions)

Market intelligence aggregation engine. Fetches the CDN catalog and computes statistics. Uses a module-level cache (`cachedCatalog`) with a 5-minute TTL to avoid re-fetching the 2.5MB catalog on every dashboard load.

**Key design decision:** The regional mapping is hardcoded (a `REGION_MAP` object mapping dispensary name substrings to regions). This is fragile — if a new dispensary opens with a name that doesn't match any pattern, it falls into "Other". A future improvement would be to use geocoding to assign regions based on lat/lng.

### `server/profanityFilter.ts` (136 lines, 3 functions)

Content moderation for user-generated comments. Exports:
- `checkProfanity(text)` → `{ clean: boolean, flaggedWords: string[], original: string }`
- `sanitizeText(text)` → text with flagged words replaced by asterisks

**Key design decision:** Cannabis-related terms (weed, bud, dank, etc.) are intentionally NOT flagged. The blocked word list is kept short (~25 words) and focused on clearly offensive content. The filter checks for l33t speak evasion (e.g., "f*ck" → "fuck") and spaced evasion (e.g., "f u c k").

### `server/alertTriggerEngine.ts` (282 lines)

Background processing engine for price alerts. Fetches the live catalog, compares prices against all active alerts, triggers matching alerts, sends notifications, and expires old alerts. Has a 24-hour frequency cap per alert.

### `server/sitemap.ts` (121 lines)

Dynamic XML sitemap generator mounted at `/sitemap.xml`. Includes static pages and all strain detail pages (fetched from the CDN catalog with a 1-hour cache).

### `server/storage.ts` (102 lines)

S3 file storage helpers. Exports `storagePut(key, data, contentType)` and `storageGet(key, expiresIn)`. Used for any file uploads (not currently used in the UI, but available for future features like partner logo uploads).

---

## 8. Frontend Layer — Pages and Routes

The application has 16 routes defined in `client/src/App.tsx`. All pages except `Home` are lazy-loaded via `React.lazy()` for code splitting. The app is wrapped in:
- `ErrorBoundary` — catches React render errors and shows a fallback UI
- `HelmetProvider` — enables per-page `<title>` and `<meta>` tags
- `ThemeProvider` — manages dark/light theme (default: dark)
- `TooltipProvider` — enables shadcn/ui tooltips
- `Toaster` — sonner toast notifications

| Route | Page | Lines | Purpose |
|-------|------|-------|---------|
| `/` | Home.tsx | 240 | Landing page with hero, search, stats, strain grid |
| `/compare` | CompareStrains.tsx | 475 | Full strain comparison table with filters |
| `/search` | CompareStrains.tsx | — | Alias for /compare |
| `/map` | MapView.tsx | 1,102 | Interactive Google Maps with dispensary markers |
| `/top-value` | TopValue.tsx | 235 | Strains ranked by value (price vs. quality) |
| `/strain/:id` | StrainDetail.tsx | 697 | Strain profile with prices, voting, comments |
| `/account` | Account.tsx | 65 | User account page |
| `/dispensaries` | DispensaryDirectory.tsx | 278 | Dispensary directory with search |
| `/dispensary/:slug` | DispensaryDetail.tsx | 385 | Dispensary profile with strain list |
| `/deals` | Deals.tsx | 425 | Price drops and deals feed |
| `/alerts` | Alerts.tsx | 478 | Price alert management dashboard |
| `/market` | MarketDashboard.tsx | 899 | Market intelligence dashboard |
| `/compare/dispensaries` | DispensaryCompare.tsx | 766 | Side-by-side dispensary comparison |
| `/moderation` | Moderation.tsx | 288 | Admin comment moderation queue |
| `/partner` | PartnerPortal.tsx | 791 | Partner claim wizard and dashboard |
| `/admin/partners` | AdminPartners.tsx | 501 | Admin partner management |

---

## 9. Frontend Layer — Components

### Layout Components

**`Navbar.tsx`** — Top navigation bar with 6 primary links (Home, Compare, Map, Dispensaries, Price Drops, Market), mobile hamburger menu with 3 extra links (Top Value, My Alerts, Partner Portal), and a search icon. Closes on route change and outside click. Prevents body scroll when mobile menu is open.

**`Footer.tsx`** — 4-column footer with navigation links, resources, legal links, and an email capture form. The email capture uses the `useEmailCapture` hook with source "footer".

**`ErrorBoundary.tsx`** — React error boundary that catches render errors and shows a "Something went wrong" fallback with a reload button.

### Feature Components

**`DealCard.tsx`** — Strain card used on the homepage grid. Shows type badge (color-coded: Indica=indigo, Sativa=amber, Hybrid=emerald), brand, strain name, price range, dispensary count, savings percentage, and top terpene.

**`DealDigestBanner.tsx`** — Full-width CTA banner on the homepage offering the weekly deal digest email. Uses the `useEmailCapture` hook with source "deal_digest". Dismissible for 7 days (stored in localStorage).

**`PriceAlertSignup.tsx`** — Email capture form on strain detail pages. Uses the `useEmailCapture` hook with source "price_alert" and passes the strain context.

**`StrainVoting.tsx`** — 3-dimension voting interface (Effects Accuracy, Value for Money, Overall Quality). Shows aggregate vote bars, the user's existing vote (if any), and a vote submission form. Uses optimistic cache updates.

**`StrainComments.tsx`** — Comment submission form and approved comment list. Login-gated submission, public display. Shows submission result feedback (approved, pending review, or error). Integrates analytics tracking.

**`PartnerVerifiedBadge.tsx`** — Two badge variants: `PartnerVerifiedBadge` (compact inline or full) and `PartnerPriceBadge` (shows price, unit, dispensary, and date). Used on strain detail and dispensary detail pages.

---

## 10. Frontend Layer — Hooks and Data Loading

### `useCatalog.ts` (386 lines)

The most important hook in the application. Fetches the 2.5MB CDN catalog and provides typed access to strains, dispensaries, brands, and metadata. Uses a module-level singleton cache (`cachedCatalog`) so the catalog is fetched once per browser session, not once per component mount.

Exports:
- `useCatalog()` → `{ catalog, loading, error }` — the full catalog
- `useCatalogStats()` → `{ stats }` — computed statistics (total strains, avg price, etc.)
- `useStrain(id)` → `{ strain, loading }` — single strain lookup
- `useDispensary(slug)` → `{ dispensary, strains, loading }` — dispensary with its strains
- `CatalogStrain`, `CatalogDispensary`, `CatalogBrand`, `CatalogMetadata` — TypeScript types

**Key design decision:** The catalog is loaded client-side, not server-side. This means the initial page load doesn't block on a 2.5MB fetch — the hero section renders immediately, and the strain grid shows a loading spinner until the catalog arrives. The tradeoff is that the first visit to the site requires downloading the full catalog, but subsequent navigations are instant (cached in memory).

### `useEmailCapture.ts` (167 lines)

Manages email signup forms across 4 capture points. Handles:
- Form state (email, status, error)
- tRPC mutation (`emailSignup.submit`)
- localStorage fallback (if API is unreachable)
- Dismissal state (7-day localStorage timer)
- Duplicate detection (checks localStorage for existing signups)
- Analytics tracking (`trackEmailSignup`)

### `useDispensaryDirectory.ts` (107 lines)

Provides search, filter, and sort functionality for the dispensary directory page. Wraps `useCatalog()` and adds:
- Text search (name, city, brand)
- Region filter (5 Maryland regions)
- Sort options (name, strain count, city)

### `useDriveTime.ts` (160 lines)

Integrates Google Maps Distance Matrix API to calculate drive times from the user's location to dispensaries. Uses the browser's Geolocation API and caches results.

### `useComposition.ts` (81 lines)

Handles IME (Input Method Editor) composition events for search inputs. Prevents premature search triggers when typing CJK characters.

### `useMobile.tsx` (21 lines)

Simple viewport width hook that returns `true` if the window is narrower than 768px.

---

## 11. Design System

The application uses a **"Botanical Data Lab"** design language — dark backgrounds with green accents, inspired by laboratory data interfaces. The design system is defined in `client/src/index.css` using CSS custom properties in OKLCH color space (required by Tailwind CSS 4).

### Color Palette

| Token | OKLCH Value | Purpose |
|-------|------------|---------|
| `--background` | `0.145 0.015 160` | Page background (very dark green-black) |
| `--foreground` | `0.95 0.01 160` | Primary text (near-white with green tint) |
| `--primary` | `0.65 0.2 155` | Brand green — CTAs, badges, active states |
| `--card` | `0.18 0.02 160` | Card backgrounds (slightly lighter than page) |
| `--muted` | `0.25 0.015 160` | Muted backgrounds |
| `--muted-foreground` | `0.6 0.02 160` | Secondary text |
| `--destructive` | `0.55 0.2 25` | Error states, delete buttons |
| `--border` | `0.28 0.02 160` | Subtle borders |

### Custom Tokens (Beyond shadcn/ui Defaults)

| Token | Purpose |
|-------|---------|
| `--cta` / `--cta-foreground` | Amber call-to-action buttons (email signup, "Find Deals") |
| `--savings` | Green highlight for savings percentages |
| `--shadow-cta` | Amber glow shadow on CTA buttons |

### Typography

| Class | Font | Usage |
|-------|------|-------|
| `font-sans` | Inter | Body text, UI elements |
| `font-serif` | Playfair Display | Headings, hero text |
| `font-price` | JetBrains Mono | Price values, statistics |

### Animations

| Class | Effect |
|-------|--------|
| `animate-marquee` | Horizontal scrolling ticker bar on homepage |
| `animate-spin` | Loading spinners |
| `transition-all duration-300` | Standard hover/focus transitions |

---

## 12. Analytics Instrumentation

The application instruments 18 custom PostHog events. Analytics are initialized in `client/src/lib/analytics.ts` and require a `VITE_POSTHOG_KEY` environment variable (currently not set — analytics are disabled).

| # | Event | Trigger | Properties |
|---|-------|---------|------------|
| 1 | `session_started` | App mount | landing_page, utm_source/medium/campaign, device_type |
| 2 | `page_viewed` | Route change | page_name, strain_id, referrer |
| 3 | `strain_searched` | Search input | query, result_count, selected_strain_id |
| 4 | `strain_viewed` | Strain detail mount | strain_id, strain_name, type, thc, price_min/max/avg |
| 5 | `price_compared` | **NOT WIRED** | strain_ids, strain_count |
| 6 | `dispensary_clicked` | **NOT WIRED** | dispensary_name, strain_id, price |
| 7 | `outbound_link_clicked` | **NOT WIRED** | destination, dispensary, strain_id, link_type |
| 8 | `map_interacted` | **NOT WIRED** | action, dispensary_name, lat/lng |
| 9 | `filter_applied` | Filter change | filter_type, filter_value, result_count |
| 10 | `badge_tooltip_viewed` | Badge hover | badge_type, strain_id, dispensary |
| 11 | `email_signup` | Email form submit | source, strain_id |
| 12 | `price_alert_set` | Alert creation | strain_id, target_price, current_price, dispensary |
| 13 | `market_dashboard_viewed` | Dashboard mount | section, total_strains, avg_price |
| 14 | `dispensary_compared` | Comparison mount | dispensary_slugs, dispensary_count |
| 15 | `strain_voted` | Vote submission | strain_id, effects/value/quality, has_comment |
| 16 | `comment_submitted` | Comment submission | strain_id, was_flagged, content_length |
| 17 | `partner_claimed` | Partner claim | dispensary_slug, dispensary_name |
| 18 | `partner_price_submitted` | Price submission | strain_id, price, unit, dispensary_slug |

**Note:** Events 5-8 are defined in the analytics module but never called from any component. This is documented in Finding #5 of the fix strategy.

---

## 13. Cross-Cutting Concerns and Patterns

### State Management

The application does not use a global state management library (no Redux, Zustand, or Jotai). Instead, state is managed through three mechanisms:

1. **TanStack Query cache** — All server state (votes, comments, alerts, partner data) lives in the tRPC/TanStack Query cache. Components subscribe to specific queries, and mutations invalidate relevant cache keys. This is the primary state management mechanism and handles 90% of the application's dynamic data.

2. **Module-level singletons** — The CDN catalog is cached in a module-level variable (`cachedCatalog` in `useCatalog.ts`). This survives React re-renders and route changes but is lost on page refresh. The same pattern is used in `marketData.ts` on the server.

3. **Component-local state** — Form inputs, UI toggles, search queries, and filter selections use `useState`. No state is lifted higher than necessary. This keeps components self-contained but means some state is lost on navigation (e.g., the search query on `/compare` resets when you navigate away and back).

**Why no global store:** The application is read-heavy with few cross-component write operations. The TanStack Query cache already provides a global cache for server data, and the CDN catalog singleton handles the largest dataset. A global store would add complexity without solving a real problem.

### Authentication Pattern

Authentication flows through three layers:

1. **Server:** The `protectedProcedure` in `server/_core/trpc.ts` checks the session cookie, decodes the JWT, and injects `ctx.user`. If the cookie is missing or invalid, it throws `UNAUTHORIZED` with the message `"Please login (10001)"`.

2. **Client middleware:** In `client/src/main.tsx`, the TanStack Query cache subscribes to error events. If any query or mutation returns the `UNAUTHORIZED` error message, the client automatically redirects to the Manus OAuth login page via `getLoginUrl()`.

3. **Component level:** The `useAuth()` hook (from `client/src/_core/hooks/useAuth.ts`) calls `trpc.auth.me.useQuery()` and provides `{ user, loading, isAuthenticated, logout }`. Components use this to conditionally render login gates (e.g., the comment form shows "Sign in to leave a review" when not authenticated).

**Admin access:** The `Moderation` and `AdminPartners` pages check `user?.openId === import.meta.env.VITE_APP_ID` (the app owner's OpenID) on the client side. On the server, `adminProcedure` checks `ctx.user.role === 'admin'`. This means the client-side check is a UX convenience (hides the admin UI), while the server-side check is the security boundary.

### Error Handling Pattern

Errors are handled at four levels:

1. **React ErrorBoundary** — Wraps the entire app in `App.tsx`. Catches render errors and shows a fallback UI with a reload button. Does not catch async errors.

2. **tRPC error propagation** — Server-side `TRPCError` instances are serialized and sent to the client. The client's TanStack Query cache surfaces these as `error` objects on the query/mutation hooks. Components check `isError` and display error messages.

3. **Toast notifications** — Mutation errors (vote, comment, alert, partner) are caught in `onError` callbacks and displayed as sonner toast notifications. This provides immediate feedback without disrupting the page layout.

4. **Graceful degradation** — DB helper functions return sensible defaults when the database is unavailable (empty arrays, null, 0). This means the CDN-dependent features (search, filter, strain detail) continue working even if the database is down.

**Gap:** As noted in Finding #10, most DB helpers don't have try/catch blocks, so raw MySQL errors can propagate to the client. The fix strategy proposes a `withDbErrorHandling` wrapper.

### SEO Strategy

The application uses `react-helmet-async` for per-page `<title>` and `<meta>` tags. Key SEO features:

- **Dynamic titles:** Each strain detail page sets `<title>` to "[Strain Name] — Prices, Reviews | StrainScout MD"
- **Dynamic meta descriptions:** Strain pages include THC%, type, and price range in the meta description
- **Sitemap:** `server/sitemap.ts` generates a dynamic XML sitemap at `/sitemap.xml` with all static pages and all strain detail pages
- **Canonical URLs:** Not yet implemented (future sprint)
- **Open Graph tags:** Not yet implemented (future sprint)

**Limitation:** Because the app is a client-side SPA, search engine crawlers that don't execute JavaScript will only see the initial HTML shell. Server-side rendering (SSR) is not implemented. For a cannabis price comparison site, this is a moderate SEO risk — Google's crawler does execute JavaScript, but other crawlers (Bing, social media previews) may not.

### Data Freshness Model

The application has three tiers of data freshness:

| Tier | Source | Freshness | Update Mechanism |
|------|--------|-----------|------------------|
| **Catalog data** | CDN JSON | Weekly | External pipeline scrapes dispensary sites, publishes new JSON to CloudFront |
| **User-generated data** | TiDB database | Real-time | tRPC mutations with optimistic updates |
| **Partner prices** | TiDB database | 7-day TTL | Partners submit prices, admin approves, prices auto-expire after 7 days |

The weekly catalog update is the primary data pipeline. It runs outside this codebase (a separate scraping system). The `priceDrops.ingestSnapshot` admin procedure is used to import the weekly snapshot into the database for historical tracking and price drop detection.

---

## 14. Known Issues and Technical Debt

This section summarizes the 23 findings from the intensive 6-role audit. See the companion document `strainscout_fix_strategy.md` for detailed fix instructions and test plans.

### Real Bugs (User-Facing)

1. **PriceUpdateForm cache not invalidated** — Partner submits a price, but the "Recent Submissions" list doesn't update until page refresh.
2. **Race condition in claimDispensary()** — SELECT-then-INSERT pattern; UNIQUE constraint prevents data corruption but error message leaks raw MySQL details.
3. **AdminPartners expandedItem collision** — Uses `id + 10000` hack to separate claim IDs from price update IDs.

### Code Quality

4. **Slugify function duplicated 6 times** across 4 files + 2 inline usages.
5. **30+ unused imports** across 12 pages, including 4 analytics events that are imported but never called.
6. **Partner procedures call getPartnerByUserId 3 times** for the same user on dashboard load.
7. **console.log in ComponentShowcase.tsx** — development artifact.

### Performance

8. **919KB main bundle chunk** — no manual chunk splitting configured.
9. **verifiedSlugs query has no staleTime** — re-fetches on every strain page mount.
10. **No DB error handling wrapper** — raw MySQL errors can propagate to the client.

### UX and Accessibility

11. **No client-side email validation** on partner claim form.
12. **Partner contact info exposed without audit logging.**
13. **No rate limiting** on partner claim or price submission.
14. **innerHTML usage in MapView** — hardcoded HTML, low XSS risk.
15. **Partner price expiration not enforced** via background cleanup.
16. **No foreign key constraints** on partner tables.
17. **Partner Portal not in desktop nav.**
18. **AdminPartners back arrow goes to /moderation** instead of /partner.
19. **No ARIA labels** on partner pages.
20. **Voting section positioning on mobile** — accepted behavior.

---

## 14. File Index

### Server Files (Custom)

| File | Lines | Purpose |
|------|-------|---------|
| `server/routers.ts` | 703 | All 53 tRPC procedures across 8 routers |
| `server/db.ts` | 1,375 | 54 database helper functions |
| `server/marketData.ts` | 562 | Market intelligence aggregation engine |
| `server/alertTriggerEngine.ts` | 282 | Background price alert trigger engine |
| `server/profanityFilter.ts` | 136 | Content moderation for comments |
| `server/sitemap.ts` | 121 | Dynamic XML sitemap generator |
| `server/storage.ts` | 102 | S3 file storage helpers |
| `server/index.ts` | 33 | Server entry point (re-exports) |

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `server/partners.test.ts` | 29 | Partner claim, price submission, verification |
| `server/comments.test.ts` | 35 | Comment CRUD, profanity filter, moderation |
| `server/alertTriggerEngine.test.ts` | 24 | Alert trigger engine logic |
| `server/votes.test.ts` | 20 | Strain voting CRUD |
| `server/marketData.test.ts` | 21 | Market data aggregation |
| `server/marketDashboard.test.ts` | 18 | Market dashboard bundle |
| `server/deals.test.ts` | 17 | Price drops and deals |
| `server/alerts.test.ts` | 16 | Price alert CRUD |
| `server/dispensaryCompare.test.ts` | 15 | Dispensary comparison |
| `server/emailSignup.test.ts` | 11 | Email signup CRUD |
| `server/priceDrops.test.ts` | 11 | Price drop detection |
| `server/auth.logout.test.ts` | 1 | Auth logout |

### Frontend Pages

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/pages/MapView.tsx` | 1,102 | Interactive dispensary map |
| `client/src/pages/MarketDashboard.tsx` | 899 | Market intelligence dashboard |
| `client/src/pages/PartnerPortal.tsx` | 791 | Partner claim wizard and dashboard |
| `client/src/pages/DispensaryCompare.tsx` | 766 | Side-by-side dispensary comparison |
| `client/src/pages/StrainDetail.tsx` | 697 | Strain profile with prices, voting, comments |
| `client/src/pages/AdminPartners.tsx` | 501 | Admin partner management |
| `client/src/pages/Alerts.tsx` | 478 | Price alert management |
| `client/src/pages/CompareStrains.tsx` | 475 | Strain comparison table |
| `client/src/pages/Deals.tsx` | 425 | Price drops feed |
| `client/src/pages/DispensaryDetail.tsx` | 385 | Dispensary profile |
| `client/src/pages/Moderation.tsx` | 288 | Admin comment moderation |
| `client/src/pages/DispensaryDirectory.tsx` | 278 | Dispensary directory |
| `client/src/pages/Home.tsx` | 240 | Landing page |
| `client/src/pages/TopValue.tsx` | 235 | Top value strains |
| `client/src/pages/Account.tsx` | 65 | User account |
| `client/src/pages/NotFound.tsx` | 52 | 404 page |

### Frontend Components

| File | Purpose |
|------|---------|
| `client/src/components/Navbar.tsx` | Top navigation with mobile menu |
| `client/src/components/Footer.tsx` | Footer with email capture |
| `client/src/components/DealCard.tsx` | Strain card for homepage grid |
| `client/src/components/DealDigestBanner.tsx` | Email capture banner |
| `client/src/components/PriceAlertSignup.tsx` | Strain-specific email capture |
| `client/src/components/StrainVoting.tsx` | 3-dimension voting interface |
| `client/src/components/StrainComments.tsx` | Comment form and display |
| `client/src/components/PartnerVerifiedBadge.tsx` | Partner badge variants |
| `client/src/components/ErrorBoundary.tsx` | React error boundary |

### Frontend Hooks

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/hooks/useCatalog.ts` | 386 | CDN catalog loading and caching |
| `client/src/hooks/useEmailCapture.ts` | 167 | Email signup form management |
| `client/src/hooks/useDriveTime.ts` | 160 | Google Maps drive time calculation |
| `client/src/hooks/useDispensaryDirectory.ts` | 107 | Dispensary search/filter/sort |
| `client/src/hooks/useComposition.ts` | 81 | IME composition handling |
| `client/src/hooks/useMobile.tsx` | 21 | Viewport width detection |

### Configuration

| File | Purpose |
|------|---------|
| `drizzle/schema.ts` | Database table definitions (8 tables) |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `vite.config.ts` | Vite build configuration |
| `vitest.config.ts` | Vitest test configuration |
| `tsconfig.json` | TypeScript configuration |
| `package.json` | Dependencies and scripts |
| `client/src/index.css` | Design system CSS variables |
| `client/src/App.tsx` | Routes and layout providers |
| `client/src/main.tsx` | tRPC client setup and React mount |
| `client/src/const.ts` | OAuth login URL helper |
| `client/src/lib/analytics.ts` | PostHog analytics (18 events) |
| `shared/const.ts` | Shared constants (error messages) |
| `shared/types.ts` | Shared TypeScript types |
