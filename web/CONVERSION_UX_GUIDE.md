# StrainScout MD — Conversion & UX Guide for Claude

**Last updated:** March 23, 2026
**Purpose:** Guide a Claude session on improving UI/UX with conversion context. This document explains how the site currently works, what's optimized, what's broken, and where the biggest opportunities are.

---

## What This Site Does

StrainScout MD (strainscoutmd.com) is Maryland's cannabis price comparison tool. Users find strains → compare prices across dispensaries → click through to buy at the cheapest one.

**The business model:** The website is the acquisition channel. The newsletter is the business. Every design decision should be evaluated against: "Does this build trust and capture emails?"

**Primary conversion goals (in order):**
1. Email signup (newsletter subscriber)
2. Outbound click to dispensary (proves value, builds habit)
3. Return visit (habit formation)

---

## Current Tech Stack

- **Frontend:** Vite + React 19 SPA, Tailwind CSS, shadcn/ui components
- **Data:** Static JSON catalog (844 strains, 66 dispensaries) served from `/data/strainscout_catalog_v10.min.json`
- **Hosting:** IONOS shared hosting (Apache), no Node.js backend
- **Analytics:** Google Analytics (G-GM6V8H260M), PostHog instrumented but key not set
- **Backend features (NOT working):** tRPC API calls fail silently — no auth, votes, comments, alerts, partner portal. These pages render but interactive features are dead.

---

## The User Journey (Current State)

### Happy Path (works well)
```
Google/direct → Home page → See hero + stats
  → Search or "Find Deals" → Compare page (1,297 → 844 strains)
  → Click strain row → Strain Detail page
  → See prices ranked by dispensary
  → Click "Order on Weedmaps" / "Order Here" → Lands on dispensary menu
  → User purchases at dispensary
```

### Email Capture Path (partially working)
```
Home page → "Save $15-40 Per 8th" banner → Email input → Submit
  → Currently: no backend to store the email (localStorage only)
  → Need: webhook to email service (Mailchimp, ConvertKit, etc.)
```

---

## What's Currently Optimized for Conversions

### 1. Ordering Links (90% coverage)
- 761 of 844 strains have `ordering_links` — direct URLs to dispensary menus
- Link hierarchy: Weedmaps menu → Dutchie menu → dispensary website → Leafly fallback
- Implementation: `getBuyLink()` in `client/src/lib/utils.ts`
- Buttons say "Order on Weedmaps", "Order Here", "Visit Store" (not vague "View on Leafly")

### 2. Price Row CTAs
- Each dispensary row in "Prices by Dispensary" has an action button
- Best price row (rank #1) is highlighted with green left border + "Order — Best Price" label
- Shopping bag icon on ordering buttons vs external link icon on info buttons

### 3. Sticky Mobile Bar
- Fixed bottom bar on mobile showing cheapest price + "Order Now" button
- Always visible while scrolling through effects/terpenes/description

### 4. Compare Page Quick-Buy
- "Order" button on each strain row in the compare table
- Links to cheapest dispensary's menu directly
- User can go from compare → dispensary in one click (no detail page needed)

### 5. Similar Strains
- 6 related strains at bottom of each detail page
- Similarity scoring: type match (30pts) + shared terpenes (20pts each) + same brand (15pts)
- Each has "Buy" button linking to cheapest dispensary

### 6. Product Category Detection
- `getProductCategory()` in utils.ts identifies: Flower, Pre-Roll, Cartridge, Concentrate, Edible, Topical
- Colored category badge on strain cards and detail pages
- Helps users understand what product type they're viewing

---

## What's BROKEN or Not Working

### Critical (affects conversions directly)

1. **Email signup goes nowhere**
   - The home page email form and all email CTAs use `useEmailCapture` hook
   - This hook stores to localStorage only — no backend, no webhook, no email service
   - **Fix needed:** Connect to Mailchimp/ConvertKit/Buttondown API or a simple webhook
   - Files: `client/src/hooks/useEmailCapture.ts`, `client/src/components/DealDigestBanner.tsx`

2. **"Alert Me" button doesn't work**
   - Strain detail page has a bell icon "Alert Me" button
   - Opens `PriceAlertModal` which tries tRPC API call → fails (no backend)
   - Should either: connect to email service with strain context, or be hidden
   - Files: `client/src/components/PriceAlertModal.tsx`, `client/src/components/PriceAlertSignup.tsx`

3. **Account/Auth is dead**
   - "Account" button in navbar links to `/account` which shows login UI
   - Auth uses Manus OAuth (removed) — stub returns null user
   - All auth-gated features (votes, comments, alerts, partner portal) are non-functional
   - Files: `client/src/_core/hooks/useAuth.ts`

4. **tRPC API calls 404**
   - Multiple pages make tRPC queries that fail silently (no backend server)
   - Affected pages: Deals (price drops), Market Dashboard (analytics), Alerts, Moderation, Partner Portal, Admin
   - These pages render but show "loading" or empty states for API-dependent sections
   - The tRPC error handler is patched to not crash, but features are dead

### Medium (affects user experience)

5. **Leafly URLs are auto-generated, many are broken**
   - URLs like `leafly.com/strains/gelato-cake` are slug-guesses, not verified
   - ~60% of Leafly links 404 on Leafly's site
   - Weedmaps URLs are search links (`weedmaps.com/search?q=...`), not direct strain pages
   - Fix: HEAD-request verification pass, or remove unverified links

6. **Google Maps not rendering**
   - Map page (`/map`) has the API key but map doesn't render (JS loading issue)
   - Dispensary list panel works fine, but the actual map is blank
   - File: `client/src/components/Map.tsx` — loads Google Maps via script injection

7. **No "back" context preservation**
   - Going Compare → Strain Detail → Back loses search/filter state
   - Users have to re-enter their search query after viewing a strain

8. **Price data is from March 22-23, 2026**
   - No automated refresh yet (pipeline exists but not scheduled)
   - Stale data banner should show if data is >7 days old
   - The Home page has a stale data check but threshold may need adjustment

---

## Areas That Are Difficult for Users

### 1. Finding a Specific Strain at a Specific Dispensary
**Problem:** A user knows they want "Gelato Cake at Zen Leaf Germantown". There's no way to search for this combination directly.
**Current path:** Search "Gelato Cake" → Find it in compare list → Click → Scroll to Prices by Dispensary → Find Zen Leaf → Click order.
**Improvement:** Add dispensary filter to compare page, or add search-by-dispensary functionality.

### 2. Understanding Price Differences
**Problem:** Gelato Cake shows $25.5 at Zen Leaf Germantown and $100.5 at Zen Leaf Elkridge. Users don't understand why — different weights? Different quality? Error?
**Current state:** No explanation of price variance. Some "prices" are for 1g, some for 3.5g, some for 7g — our parser normalizes to "eighth" but not all scraped data is for eighths.
**Improvement:** Show weight/size alongside price, or add "per gram" normalization.

### 3. Mobile Navigation to Purchase
**Problem:** On mobile, the strain detail page is very long (hero → description → genetics → effects → flavors → prices → available at → similar). Users have to scroll a LOT to find the buy button.
**Current fix:** Sticky bottom bar helps, but it only shows the #1 cheapest — user can't see other options without scrolling.
**Improvement:** Move price comparison higher on mobile, or add a "Jump to Prices" anchor.

### 4. Compare Page is Overwhelming
**Problem:** 844 strains with no visual hierarchy. All rows look the same. Hard to know where to start.
**Current state:** Sort by price, type filter, search — but no curated sections like "Staff Picks" or "Popular This Week".
**Improvement:** Add featured sections, category groupings, or "quick filter" chips (e.g., "Under $30", "High THC", "Indica Under $40").

### 5. Dispensary Detail → Purchase Flow
**Problem:** `/dispensary/{slug}` page lists all strains at that dispensary, but clicking a strain goes to the strain detail page — user loses the dispensary context.
**Improvement:** Add "Order from {dispensary}" button directly on the dispensary detail page strain list, without requiring navigation to strain detail.

### 6. No Visual Product Imagery
**Problem:** Every strain card and detail page is text-only. No photos, no visual differentiation.
**Current state:** The hero section has a generic cannabis background image, but individual strains have no imagery.
**Improvement:** Could add Leafly strain images (if available in API), or use generated placeholder imagery based on strain type/color.

---

## Key Files for UI/UX Changes

| Area | File | Lines |
|------|------|-------|
| **Home page** | `client/src/pages/Home.tsx` | ~240 |
| **Compare/search** | `client/src/pages/CompareStrains.tsx` | ~476 |
| **Strain detail** | `client/src/pages/StrainDetail.tsx` | ~790 |
| **Dispensary detail** | `client/src/pages/DispensaryDetail.tsx` | ~386 |
| **Dispensary list** | `client/src/pages/DispensaryDirectory.tsx` | ~279 |
| **Map** | `client/src/pages/MapView.tsx` | ~1100 |
| **Top Value** | `client/src/pages/TopValue.tsx` | ~236 |
| **Deals/Price Drops** | `client/src/pages/Deals.tsx` | ~426 |
| **Market Dashboard** | `client/src/pages/MarketDashboard.tsx` | ~900 |
| **Navbar** | `client/src/components/Navbar.tsx` | ~209 |
| **Footer** | `client/src/components/Footer.tsx` | ~163 |
| **Email capture hook** | `client/src/hooks/useEmailCapture.ts` | ~168 |
| **Catalog data hook** | `client/src/hooks/useCatalog.ts` | ~387 |
| **Shared utilities** | `client/src/lib/utils.ts` | ~80 |
| **Catalog JSON** | `public/data/strainscout_catalog_v10.min.json` | (static data) |

---

## Data Available in CatalogStrain

Every strain object in the catalog JSON has these fields:

```typescript
{
  id: string;                    // URL-safe slug
  name: string;                  // "Gelato Cake"
  brand: string;                 // "District Cannabis"
  type: "Indica" | "Sativa" | "Hybrid";
  thc: number;                   // 26.27
  cbd: number;                   // usually 0
  terpenes: string[];            // ["Limonene", "Caryophyllene"]
  effects: string[];             // ["Sleepy", "Relaxed"]
  flavors: string[];             // ["Vanilla", "Berry"]
  description: string;           // Leafly description (29% have this)
  genetics: string;              // "Gelato #33 x Wedding Cake"
  grade: "A" | "B" | "C";       // Data quality grade
  prices: [{                     // Sorted cheapest first
    dispensary: string;
    price: number;
    source: string;              // "weedmaps", "dutchie", etc.
    last_verified: string;       // ISO timestamp
  }];
  price_min: number;
  price_max: number;
  price_avg: number;
  dispensaries: string[];        // All dispensary names
  dispensary_count: number;
  dispensary_links: Record<string, string>;    // dispensary name → website URL
  ordering_links: Record<string, string>;      // dispensary name → ordering menu URL
  leafly_url: string;            // Auto-generated, ~40% are broken
  weedmaps_url: string;          // Search URL, always works
}
```

---

## Conversion Priorities (Recommended Order)

1. **Wire up email capture to a real service** — This is THE business. Every email signup without a backend is lost revenue.
2. **Fix the compare page UX** — Add quick filters ("Under $30", "High THC 25%+"), featured sections, better mobile card layout.
3. **Add "Jump to Prices" on mobile strain detail** — Reduce scroll-to-purchase time.
4. **Add dispensary filter to compare page** — "Show me strains at Zen Leaf" is a very common use case.
5. **Remove or hide non-functional features** — Dead auth buttons, non-working alerts, empty market dashboard hurt trust.
6. **Improve price display** — Show weight context, add "per gram" calculation, explain price variance.
7. **Add Open Graph / social sharing meta** — Strain detail pages should have rich previews for sharing.

---

## Build & Deploy Commands

```bash
# From strainscout_md/ directory:

# Rebuild the data catalog (if scrape data changed):
python run_all.py --publish

# Rebuild the web app (if frontend code changed):
cd web && npx vite build && cd ..

# Deploy everything to IONOS:
python -m publish.upload_ionos --full-deploy

# Or just update the catalog JSON:
python -m publish.upload_ionos
```

**Important:** After rebuilding the web app, copy the latest catalog to the web public folder:
```bash
cp data/output/strainscout_catalog_v10.min.json web/public/data/
```

---

## Notes for the Next Claude Session

- The `web/` folder is a Vite SPA. The `web_2/` folder is a parallel Next.js rebuild — don't confuse them.
- All tRPC calls fail silently (no backend). Pages that rely on tRPC show empty states.
- The `useAuth` hook returns null always. Auth-gated features are non-functional.
- Sources of truth: Strain List (`strainscout_strains_v1.json`) for strain data, Product List (`strainscout_products_v1.json`) for prices/availability, Dispensary List (`dispensary_benchmark_geocoded.json`) for locations, and Leafly for strain enrichment. Weedmaps is a scraping target for menu data only, not authoritative for strain properties.
- Ordering links are string URLs (not the `{ dutchie, weedmaps }` object format from the original interface). The `getBuyLink()` utility in `utils.ts` handles both formats.
- Browser caching can cause confusion during development. The `.htaccess` now sets `no-cache` on JSON and HTML files.
- SFTP credentials for deployment are in `.env` (IONOS_SFTP_*).
- Google Analytics is active. PostHog is instrumented in code but needs VITE_POSTHOG_KEY in .env to activate.
