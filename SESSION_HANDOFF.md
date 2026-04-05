# StrainScout MD — Session Handoff

**Date:** March 26–28, 2026 (categories); April 5, 2026 (data collection)
**Session scope:** Category system overhaul, pipeline updates, frontend category pages, 6-phase manual verification plan, strain/product list separation, data collection optimization

---

## What Was Accomplished

### 1. Category Pipeline Infrastructure (Complete)

The entire data pipeline was updated to support `product_category` and `category_confidence` fields end-to-end.

**Files modified:**

| File | Change |
|------|--------|
| `scraper/category_map.py` | NEW — Central normalization table mapping 50+ platform-specific labels to 7 standard categories: Flower, Pre-Roll, Vape, Concentrate, Edible, Topical, Other |
| `scraper/test_categories.py` | NEW — Audit tool that checks raw data for category field coverage, unmapped labels, and per-platform scraper status |
| `scraper/scrape_weedmaps.py` | Removed flower-only filter. Now captures `edge_category.slug` via `normalize_category()` as `product_category` |
| `scraper/scrape_dutchie.py` | Removed flower-only gate. Now captures `type` field via `normalize_category()` |
| `scraper/scrape_jane.py` | Removed flower-only filter. Now captures `kind` field via `normalize_category()` |
| `pipeline/parse_raw.py` | Added `extract_category_from_url()` for URL-based cross-verification (Dutchie `/products/{cat}`, Trulieve `/category/{cat}`, Curaleaf `/menu/{cat}-{id}`). Added `assign_category_confidence()` producing "verified"/"inferred"/"conflict". Added `category_confidence` to output records. |
| `pipeline/deduplicate.py` | Threads `product_category` and `category_confidence` through deduplication. Uses majority vote for category across group records. Prefers "verified" > "inferred" > "conflict" for confidence. |
| `pipeline/build_catalog.py` | Emits `product_category` and `category_confidence` on every catalog entry. Defaults to "Flower"/"inferred" for legacy records. |

**Key finding:** All 192 raw scrape files contain ONLY `product_type: "flower"` because every scraper navigates exclusively to flower pages. The scraper code was updated to capture multi-category data, but no new scrape has been run yet. The existing raw data is all flower-sourced.

### 2. Manual Category Verification System (Complete — 6-Phase Plan)

Because the raw data is all flower-sourced, we implemented a manual verification system on top of name-based classification.

**Phase 1 — Classification Report (Complete)**
- Created `pipeline/classify_and_report.py`
- Generates `data/processed/category_review.csv` with all 1,297 products, auto-detected category, and confidence level
- Results: 571 Flower, 249 Vape, 183 Concentrate, 165 Edible, 94 Pre-Roll, 33 Other, 2 Topical
- 24 MEDIUM confidence items flagged for manual review

**Phase 2 — Manual Review & Overrides (Complete)**
- Created `data/manual_overrides.json` with 63 verified overrides
- Reviewed all 24 MEDIUM confidence items
- Reviewed all 33 "Other" junk entries (t-shirts, discount strings, category pages)
- Scanned all 571 Flower entries for edge cases — found 18 corrections
- Override breakdown: Other: 34, Pre-Roll: 21, Flower: 2, Concentrate: 2, Edible: 2, Vape: 1, + 1 late QA fix

**Phase 3 — Apply Categories to Catalog (Complete)**
- Created `pipeline/apply_manual_categories.py`
- Applied overrides + auto-classification to all 1,297 strains
- Output written to `web_2/public/data/strainscout_catalog_v10.min.json`
- Final distribution: Flower 554, Vape 249, Concentrate 185, Edible 167, Pre-Roll 100, Other 40, Topical 2

**Phase 4 — Frontend Category Usage (Complete)**
- `DealCard.tsx`: Changed from `getProductCategory(strain.name)` to `getCategoryFromStrain(strain)` — now reads authoritative `product_category` field. Added `hideCategory` prop.
- `page.tsx` (home): Already uses `getCategoryFromStrain` — verified correct
- `compare/page.tsx`: Already uses `getCategoryFromStrain` — verified correct
- `CategoryPageClient.tsx`: Passes `hideCategory` to DealCard on category pages

**Phase 5 — Category Filter Chips (Complete)**
- Added horizontal category filter chip strip to Compare page
- Chips: All | Flower | Pre-Rolls | Vapes | Concentrates | Edibles
- Each chip shows count, e.g. "Flower (554)"
- Active chip uses `CATEGORY_COLORS` from utils.ts
- Wired to existing `categoryFilter` state

**Phase 6 — QA & Deploy (PARTIALLY COMPLETE — stopped here)**
- QA verification PASSED all checks:
  - All 1,297 strains have `product_category` and `category_confidence`
  - Zero edibles in Flower category
  - Zero vapes in Flower category
  - Zero pre-rolls in Flower category
  - All frontend files use `getCategoryFromStrain`
  - `npm run build` passed clean (1,409+ static pages)
- One borderline item fixed: `200mgCBD : 100MGTHC : 100MGCBN` moved from Flower → Edible
- **DEPLOY NOT YET RUN** — the IONOS incremental upload has not been executed for these changes

### 3. Category Pages (Complete)

Created static category browse pages at `/category/[slug]`:

| File | Purpose |
|------|---------|
| `web_2/src/app/category/[slug]/page.tsx` | Server component with `generateStaticParams()` for 7 slugs, SEO metadata |
| `web_2/src/app/category/[slug]/CategoryPageClient.tsx` | Client component with sidebar category nav, search, sort, filtered product grid |

Features:
- 7 static routes: `/category/flower`, `/category/pre-roll`, `/category/vape`, `/category/concentrate`, `/category/edible`, `/category/topical`, `/category/other`
- Sidebar navigation with category counts
- Search within category
- Sort by price, name, or availability
- Category badge suppressed on these pages (via `hideCategory` prop)

### 4. Home Page "Browse by Category" Section (Complete)

Added to `web_2/src/app/page.tsx`:
- Grid of 5 category cards: Flower, Pre-Roll, Vape, Concentrate, Edible
- Each card shows icon, name, description, and live product count
- Links to `/category/[slug]`
- Positioned between "Cheapest Flower Right Now" strip and main strain grid

### 5. Frontend Utility Functions (Complete)

In `web_2/src/lib/utils.ts`:
- `getCategoryFromStrain(strain)` — reads `product_category` field first, falls back to `classifyProduct(name)` if absent
- `classifyProduct(name)` — comprehensive regex classifier (kept as fallback)
- `CATEGORY_COLORS`, `CATEGORY_LABELS` — display constants for all 7 categories
- `TYPE_COLORS` — exported as shared constant

In `web_2/src/hooks/useCatalog.ts`:
- `CatalogStrain` interface now includes `product_category?: string` and `category_confidence?: "verified" | "inferred" | "conflict"`
- `useStrains()` hook accepts `category` filter option

### 6. Agent System (Complete)

Five agent skill files created in `.claude/commands/`:

| Skill | File | Role |
|-------|------|------|
| `/orchestrator` | `orchestrator.md` | Directs all agents, enforces quality/security, does NOT modify code |
| `/engineer` | `engineer.md` | Implements code changes as directed by orchestrator |
| `/qa-agent` | `qa-agent.md` | Enforces quality standards, checks code after each phase |
| `/security-agent` | `security-agent.md` | Researches threats, enforces security standards |
| `/ux-agent` | `ux-agent.md` | Prioritizes user experience, researches UI/UX standards |

Agent research saved to memory:
- `memory/qa_standards.md` — WCAG 2.1 AA, data integrity, code quality, performance, per-phase checklists
- `memory/security_standards.md` — OWASP, CSP, credential management, input validation, cannabis compliance
- `memory/ux_standards.md` — User journey, DealCard hierarchy, navigation rules, trust signals, category browse

### 7. Other Fixes Made During Session

| Fix | File |
|-----|------|
| Base UI DialogTrigger `asChild` TypeScript error | `web_2/src/components/admin/CreateUserDialog.tsx` — removed unsupported `asChild` prop |
| DialogTrigger typing | `web_2/src/components/ui/dialog.tsx` — changed to `React.ComponentProps<typeof DialogPrimitive.Trigger>` |
| Dev server port conflict | `web_2/start-dev.bat` — removed hardcoded `--port 3000`, added `autoPort: true` to launch.json |

### 8. Strain / Product List Separation (Complete — April 5, 2026)

Separated the v10 catalog (which mixed strains and products) into distinct data files:

| File | Records | Purpose |
|------|---------|---------|
| `data/output/strainscout_strains_v1.json` | 1,161 strains | Strain identity: name, type, genetics, terpenes, effects, flavors, description, THC range |
| `data/output/strainscout_products_v1.json` | 1,297 products | Product data: prices, dispensaries, brand, `strain_id` FK to strain list, `strain_agnostic` flag |
| `data/output/unmapped_products_report.json` | 398 unmatched | Reasoning per item: strain_not_identified (173), strain_agnostic (126), scrape_artifact (51), proprietary_flavor (40), non_cannabis_or_bundle (8) |
| `data/output/strain_data_quality_report.json` | 6 root causes | Pipeline blame analysis with per-dispensary breakdown |

- 899 products (69%) matched to strains via exact name, cleaned name, or substring match
- 11 strains added via web research (Grape Stomper, Lamb's Bread, Peach Cobbler, etc.)
- 5 strains enriched with missing data (Northern Lights, Maui Wowie, etc.)
- Pipeline filters added to `parse_raw.py`: scrape artifact rejection, category inference, dispensary-specific reject patterns
- Defense filter added to `build_catalog.py`: rejects "Other" category entries

**Sources of truth updated:** Strain List, Product List, Dispensary List (`dispensary_benchmark_geocoded.json`), and Leafly. Weedmaps is a scraping target for menu/price data only, not authoritative for strain properties.

### 9. Data Collection Optimization (Complete — April 5, 2026)

Built a complete data collection system to track user behavior, attribution, and optimize email conversion.

**Phase 1 — Cookie Consent + GA4 + Attribution:**

| File | Type | What |
|------|------|------|
| `web_2/src/lib/cookies.ts` | NEW | Consent management, UTM attribution (30-day cookie), IP-based geo via ipapi.co |
| `web_2/src/components/CookieConsent.tsx` | NEW | GDPR/CCPA banner: 3 tiers (Essential/Analytics/Marketing), customizable toggles |
| `web_2/src/components/GoogleAnalytics.tsx` | NEW | GA4 (`G-GM6V8H260M`) loaded only after analytics consent |
| `web_2/src/components/PostHogProvider.tsx` | EDIT | PostHog init gated behind consent, listens for `consent-updated` event |
| `web_2/src/lib/analytics.ts` | EDIT | All 17 PostHog events gated behind `hasConsent("analytics")` |
| `web_2/src/hooks/useEmailCapture.ts` | EDIT | Email signups enriched with utm_source, utm_medium, utm_campaign, channel, referrer, city, region |
| `publish/upload_ionos.py` | EDIT | CSP updated: allows `googletagmanager.com`, `google-analytics.com`, `ipapi.co` |

**Phase 2 — Email Collection Optimization:**

| File | Type | What |
|------|------|------|
| `web_2/src/components/ExitIntentPopup.tsx` | NEW | Desktop-only exit-intent email capture (once/session, 10s delay gate, skips signed-up users) |
| `web_2/src/components/DealDigestBanner.tsx` | EDIT | Smart timing: shows after 2nd pageview or 30s instead of immediately; city personalization from geo cookie |

**Phase 3 — Privacy & Compliance:**

| File | Type | What |
|------|------|------|
| `web_2/src/app/privacy/page.tsx` | NEW | Full privacy policy: cookies, data collection, third parties, retention, user rights, COPPA |
| `web_2/src/components/Footer.tsx` | EDIT | Privacy Policy link now routes to `/privacy` |

**Phase 4 — Schema & Admin Dashboard:**

| File | Type | What |
|------|------|------|
| `web_2/src/db/schema.ts` | EDIT | 7 new columns on `emailSignups`: utmSource, utmMedium, utmCampaign, channel, referrer, city, region |
| `database/migrations/001_add_attribution_columns.sql` | NEW | SQL migration with 3 indexes (channel, city, source+channel) |
| `database/README.md` | EDIT | Migration instructions added |
| `web_2/src/app/admin/analytics/page.tsx` | REWRITE | Real dashboard: signups by source/channel/city, recent signups table with masked emails |

**User journey after these changes:**
```
1. LAND → Cookie consent banner slides up
   Accept All → GA4 + PostHog + geo lookup activate
2. BROWSE (page 1) → Attribution cookie stores UTM/referrer/channel
3. ENGAGE (page 2 or 30s) → Deal Digest banner appears with city personalization
4. LEAVE (exit intent) → "Don't miss this week's deals" popup (desktop only)
5. CONVERT (email signup) → Attribution + city/region attached to Supabase record
6. RETURN → Consent remembered, personalization persists
```

**Requires activation** — see "Immediate — Data Collection Activation" in next steps below.

---

## Where We Stopped

**Phase 6 is 90% complete.** QA passed, build passed, catalog updated. The only remaining step:

### Deploy to IONOS

Run:
```bash
cd C:/Users/jaretwyatt/.local/bin/strainscoutmd/strainscout_md
PYTHONIOENCODING=utf-8 python3 -m publish.upload_ionos --next-incremental
```

This will upload only the changed files (catalog JSON + updated HTML pages) via the MD5 incremental manifest.

---

## What Still Needs to Happen (Future Work)

### Immediate — Data Collection Activation (next session)

These steps are required to activate the data collection system built in the April 5, 2026 session:

1. **Run Supabase migration** — Execute `database/migrations/001_add_attribution_columns.sql` in the Supabase SQL Editor. This adds `utm_source`, `utm_medium`, `utm_campaign`, `channel`, `referrer`, `city`, `region` columns to `email_signups` plus reporting indexes.

2. **Set PostHog environment variable** — Add `NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here` to your build environment:
   - **Local dev**: Create `web_2/.env.local` with the key
   - **GitHub Actions**: Add as a repository secret in Settings > Secrets > Actions
   - **Manual build**: Export the var before running `npm run build`
   - Get the key from your PostHog project at https://us.posthog.com → Project Settings → API Key

3. **Rebuild and deploy** — After setting the env var:
   ```bash
   cd web_2 && npm run build
   cd .. && python3 -m publish.upload_ionos --next-incremental
   ```

4. **Verify live site** — After deploy, confirm:
   - Cookie consent banner appears on first visit
   - Accepting cookies activates GA4 (check GA4 Real-time report)
   - Privacy Policy page loads at `/privacy`
   - Email signup sends attribution data (check Supabase `email_signups` table for new columns)
   - Exit-intent popup triggers on desktop (move cursor toward browser tabs)
   - Admin dashboard at `/admin/analytics` shows signup data

5. **Configure GA4 Enhanced Measurement** — In Google Analytics (property `G-GM6V8H260M`):
   - Go to Admin > Data Streams > Web > Enhanced Measurement
   - Enable: Scrolls, Outbound clicks, Site search, File downloads
   - This gives you scroll depth, external link tracking, and search queries for free

### Short-term — Data & Pipeline
6. **Run a multi-category scrape** — the scraper code now captures non-flower products, but no new scrape has been run. Running the scrapers will populate real platform-provided categories (Dutchie `type`, Jane `kind`) instead of relying on name-based classification. Note: Weedmaps is a scraping target for menu/price data only — Leafly is the authoritative source for strain properties (type, genetics, terpenes, effects).
7. **Re-run the full pipeline** after multi-category scrape — `parse_raw.py` → `enrich.py` → `deduplicate.py` → `build_catalog.py` will produce a catalog with "verified" confidence (URL cross-verification) instead of "inferred" (name regex).
8. **Update manual_overrides.json** — as new products are scraped, review any MEDIUM confidence items and add overrides.

### Medium-term — Data Collection Optimization
9. **Connect email service** — Email signups currently go to Supabase + localStorage but no actual emails are sent. Integrate with a transactional email service (Resend, SendGrid, or Mailchimp) to send the weekly Tuesday deal digest.
10. **A/B test email CTAs** — Use PostHog feature flags to test different Deal Digest banner headlines, exit-intent copy, and CTA button text to optimize conversion rates.
11. **Add Facebook/Meta Pixel** — When ready for paid acquisition, add the Meta pixel behind the "marketing" cookie consent tier (already built, just needs the pixel script).
12. **Terms of Service page** — Footer link is still a placeholder. Create `/terms` page with service terms.

### Medium-term — Infrastructure (from improvement plan)
13. **Phase 1 (Security)** — Credential audit, input validation (CSP headers already updated)
14. **Phase 2 (Quick Wins)** — SEO metadata, performance optimization
15. **Phase 3 (Code Quality)** — Consolidate duplicate code, proper error boundaries
16. **Phase 4 (UX)** — Skeleton screens, improved DealCard, trust signals
17. **Phase 5 (Pipeline Reliability)** — Retry logic, monitoring, alerting

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Project root | `C:\Users\jaretwyatt\.local\bin\strainscoutmd\strainscout_md` |
| Next.js app | `web_2/` |
| Live catalog | `web_2/public/data/strainscout_catalog_v10.min.json` |
| Manual overrides | `data/manual_overrides.json` (63 entries) |
| Classification report | `data/processed/category_review.csv` |
| Classification script | `pipeline/classify_and_report.py` |
| Apply overrides script | `pipeline/apply_manual_categories.py` |
| Category normalization | `scraper/category_map.py` |
| Cookie consent + utilities | `web_2/src/lib/cookies.ts` — consent, attribution, geo helpers |
| Cookie consent banner | `web_2/src/components/CookieConsent.tsx` |
| Google Analytics (GA4) | `web_2/src/components/GoogleAnalytics.tsx` — gated behind consent |
| Exit-intent popup | `web_2/src/components/ExitIntentPopup.tsx` |
| PostHog provider | `web_2/src/components/PostHogProvider.tsx` — gated behind consent |
| Analytics events (17) | `web_2/src/lib/analytics.ts` — all gated behind consent |
| Email capture hook | `web_2/src/hooks/useEmailCapture.ts` — enriched with attribution + geo |
| Privacy policy | `web_2/src/app/privacy/page.tsx` |
| Admin analytics dashboard | `web_2/src/app/admin/analytics/page.tsx` |
| DB migration (attribution) | `database/migrations/001_add_attribution_columns.sql` |
| Drizzle schema | `web_2/src/db/schema.ts` |
| CSP / .htaccess generator | `publish/upload_ionos.py` — CSP allows GA4 + PostHog + ipapi.co |
| Agent skills | `.claude/commands/orchestrator.md`, `engineer.md`, `qa-agent.md`, `security-agent.md`, `ux-agent.md` |
| Agent research | Memory files in `C:\Users\jaretwyatt\.claude\projects\C--Users-jaretwyatt--local-bin-strainscoutmd\memory\` |
| Build output | `web_2/out/` (1,409+ static pages) |
| Deploy manifest | `publish/deploy_manifest_next.json` |
| Deploy script | `python3 -m publish.upload_ionos --next-incremental` |

---

## Catalog Stats After Fix

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

- 63 manually verified overrides
- 1,234 auto-classified (inferred)
- 0 edibles in Flower section (QA verified)
- 0 vapes in Flower section (QA verified)
- 0 pre-rolls in Flower section (QA verified)
