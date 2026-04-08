# StrainScout MD — Session Handoff

**Last updated:** April 8, 2026
**Branch:** `claude/read-repo-handoff-W9aBX`

---

## Project Overview

StrainScout MD is a Maryland cannabis price comparison platform. Two codebases exist:
- **`web_2/`** (Next.js, static export) — **active production app** deployed to IONOS via SFTP
- **`web/`** (Vite + React + tRPC) — legacy app, still has useful admin features

**Database:** Supabase (PostgreSQL) for `web_2/`, TiDB/MySQL + Drizzle for `web/`
**Catalog:** 2.5MB JSON (2,220 strains, 97 dispensaries) fetched client-side via `useCatalog()` hook
**Deploy:** `python3 -m publish.upload_ionos --next-incremental` (SFTP to IONOS)

---

## Completed Work (All Sessions)

### March 26-28 — Category System Overhaul
- Built complete product category pipeline (7 categories: Flower, Pre-Roll, Vape, Concentrate, Edible, Topical, Other)
- Updated all 6 scrapers to capture multi-category data
- Created manual verification system with 63 overrides
- Built frontend category pages at `/category/[slug]` (7 routes)
- Added "Browse by Category" section on home page
- Created agent skill system (`.claude/commands/`)
- QA passed, build passed

### April 5 — Data Pipeline & Infrastructure
- Weekly data pipeline GitHub Actions workflow
- SFTP port fallback and deploy logging
- Catalog data freshness date display

### April 8 — Phases 1-4 Improvements (8 commits)

**Phase 1 — Analytics & Bug Fixes:**
- Wired 4 dead analytics events: `trackPriceCompared`, `trackDispensaryClicked`, `trackOutboundLinkClicked`, `trackMapInteracted`
- Fixed AdminPartners expandedItem collision bug (eliminated `id + 10000` hack)
- Extracted shared `slugify()` to `@/lib/utils` (consolidated 8 duplicates across 6 files)
- Added `staleTime: 5min` to verifiedSlugs query (web/ only)

**Phase 2 — Attribution & Security:**
- Created `database/migrations/001_add_attribution_columns.sql` (7 new columns on email_signups)
- Updated Drizzle schema + `useEmailCapture` hook with UTM tracking (30-day cookie persistence)
- Hardened CSP: removed `unsafe-inline` from `script-src`
- Cleaned SFTP credentials from docstrings
- Added `withDbErrorHandling` wrapper to 12 mutation functions (web/ only)
- Created Terms of Service page at `/terms`

**Phase 3 — Bundle Splitting & Nav:**
- Webpack `splitChunks` config with 6 named vendor chunks (react, supabase, posthog, trpc, lucide, zod)
- Added Partner link to Navbar
- Replaced all `innerHTML` with DOM API on map markers (XSS hardening)
- ARIA labels and keyboard accessibility across map, admin, and partner pages

**Phase 4 — Skeleton Screens & Trust Signals:**
- Replaced spinner loading states with layout-matching skeletons on 4 pages:
  - Strain detail (hero, description, effects, price table, sidebar)
  - Dispensary detail (breadcrumb, hero, stats, strain table)
  - Deals page (12-card skeleton grid)
  - Map page (sidebar + map area)
- DealCard enhancements:
  - Green "Verified" badge (ShieldCheck) for Leafly/Weedmaps verified strains
  - Price freshness indicator (emerald/amber/muted based on days since last check)
  - Grade A glow ring

---

## What Needs To Be Done

### Activation Tasks (Jaret — manual, no code needed)

- [ ] **Deploy to IONOS** — Run: `PYTHONIOENCODING=utf-8 python3 -m publish.upload_ionos --next-incremental`
  - Requires local `.env` with SFTP creds (IONOS_HOST, IONOS_USER, IONOS_PASS)
  - The build output in `web_2/out/` needs to be regenerated first: `cd web_2 && npm run build`
- [ ] **Set PostHog key** — Add `NEXT_PUBLIC_POSTHOG_KEY=phc_xxx` to `web_2/.env.local`
  - 17 custom events are wired and ready; they no-op until the key is set
- [ ] **Enable GA4 Enhanced Measurement** — In Google Analytics dashboard, turn on page views, scrolls, outbound clicks, site search
- [ ] **Run Supabase migration** — Execute `database/migrations/001_add_attribution_columns.sql` in Supabase SQL Editor (if not already done — Jaret confirmed this was completed April 8)
- [ ] **Merge PR** — Review and merge `claude/read-repo-handoff-W9aBX` into main when ready

### High Priority (Code — next session)

- [ ] **Connect email service for deal digest** — Wire up Resend or SendGrid
  - `useEmailCapture` hook already collects emails to `email_signups` table
  - `DealDigestBanner` component already exists on home page
  - Need: API route to send weekly digest, email template, cron trigger
  - Jaret provides: Resend or SendGrid API key
- [ ] **Run multi-category scrape** — Scraper code supports non-flower products but no new scrape has been run since the March update. Running scrapers will populate real platform-authoritative categories instead of name-based classification.
- [ ] **Re-run full pipeline** after scrape — `parse_raw.py` → `enrich.py` → `deduplicate.py` → `build_catalog.py`

### Medium Priority (Code — future sessions)

- [ ] **Pipeline hardening (Phase 5)**
  - Retry logic with exponential backoff on scraper HTTP requests
  - Circuit breaker pattern for failing dispensary endpoints
  - Monitoring/alerting (Slack webhook or email on pipeline failure)
  - Health check endpoint for catalog freshness
- [ ] **Error boundaries** — Add React error boundaries to key pages so a single component crash doesn't white-screen the app
- [ ] **Improved data freshness UX** — Show "last updated X hours ago" on pages, warn if catalog is stale (>48h)

### Low Priority (Polish — when time allows)

- [ ] **Privacy Policy page** — `/privacy` (Terms of Service at `/terms` is done)
- [ ] **Update manual_overrides.json** — Review any MEDIUM confidence items after next scrape
- [ ] **Skeleton for remaining pages** — cheapest, market, top-value, category pages still use spinner
- [ ] **Mobile nav improvements** — Hamburger menu behavior, active state indicators
- [ ] **SEO audit** — Structured data (JSON-LD), OpenGraph images, sitemap updates

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Next.js app (production) | `web_2/` |
| Legacy Vite app | `web/` |
| Live catalog JSON | `web_2/public/data/strainscout_catalog_v10.min.json` |
| DB schema (Drizzle) | `web_2/src/db/schema.ts` |
| DB migrations | `database/migrations/` |
| Supabase RLS docs | `database/README.md` |
| Analytics events | `web_2/src/lib/analytics.ts` (17 events) |
| Email capture hook | `web_2/src/hooks/useEmailCapture.ts` |
| Shared utilities | `web_2/src/lib/utils.ts` (slugify, category helpers) |
| Deploy script | `publish/upload_ionos.py` |
| Deploy manifest | `publish/deploy_manifest_next.json` |
| Scraper code | `scraper/` (weedmaps, dutchie, jane, leafly) |
| Pipeline scripts | `pipeline/` (parse, enrich, deduplicate, build_catalog) |
| Manual overrides | `data/manual_overrides.json` (63 entries) |
| Category map | `scraper/category_map.py` |
| Agent skills | `.claude/commands/` |
| GitHub Actions | `.github/workflows/` |
| Next.js config | `web_2/next.config.ts` (splitChunks configured) |
| CSP / deploy | `publish/upload_ionos.py` (CSP headers in .htaccess) |

---

## Architecture Notes

- **Catalog is client-side**: The 2.5MB JSON is fetched once via `useCatalog()` hook with global cache + request deduplication. All filtering/sorting happens in the browser.
- **No server-side rendering**: `web_2/` uses `output: "export"` (static HTML). All dynamic behavior is client-side.
- **Supabase for writes only**: Email signups, price alerts, comments, votes, partner claims go to Supabase. Read-heavy pages use the static catalog JSON.
- **Two deploy targets**: IONOS (production static site) and Supabase (database). They're independent.
- **Attribution tracking**: UTM params captured from URL → stored in 30-day cookie → sent with email signups to Supabase.

---

## Catalog Stats

| Category | Count | % |
|----------|-------|---|
| Flower | 554 | 42.7% |
| Vape | 249 | 19.2% |
| Concentrate | 185 | 14.3% |
| Edible | 167 | 12.9% |
| Pre-Roll | 100 | 7.7% |
| Other | 40 | 3.1% |
| Topical | 2 | 0.2% |
| **Total** | **1,297** | |

---

## Previous Session Handoffs

The March 26-28 session handoff covered category system overhaul in detail. That work is fully complete and deployed. The content has been consolidated into this document above.

For the original Manus MD audit files and detailed component handoffs, see `Manus MD Files/` directory.
