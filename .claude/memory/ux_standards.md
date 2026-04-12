# UX Standards — StrainScout MD

## User Journey Scores (Last assessed: April 2026)

| # | Journey | Score | Primary Blocker |
|---|---------|-------|-----------------|
| 1 | Price-First Discovery | 6/10 | Buy link buried ~600px below fold on mobile |
| 2 | Strain-First Research | 5/10 | Compare table doesn't show cheapest dispensary |
| 3 | Dispensary-Location | 3/10 | `/map` 404 in production (code exists, deploy issue) |
| 4 | Dispensary-Loyal | 5/10 | Strain grid sorted by global avg, not local price |
| 5 | Value-First | 4/10 | `/top-value` not in desktop nav |
| 6 | Deal Hunting | 6/10 | DealDropCard missing "Buy →" button |
| 7 | Returning User / Price Alerts | 1/10 | Auth stub means alerts never save |
| 8 | Mobile First Visit | 5/10 | Compare table hidden on mobile |
| 9 | SEO Landing on Strain | 6/10 | No per-page meta titles, no schema markup |

**Target:** All journeys ≥ 7/10 before marketing spend increases.

## DealCard Visual Hierarchy

Priority order — must be preserved on every card:
1. **Strain name** — largest text, top of card
2. **Price** — bold, amber (`#F59E0B`), immediately below name
3. **Dispensary name** — full name, never truncated
4. **THC % + category badge** — secondary data row
5. **"Buy →" button** — amber CTA, shown only when `ordering_link` exists

Never:
- Show price as secondary to strain type or brand
- Truncate dispensary name (users need this to identify source)
- Show a "Buy" button when no ordering link exists

## Navigation Rules

### Desktop Nav (required items)
- Home
- Compare (strains)
- Top Value ← must be here, not in hamburger
- Dispensaries
- Deals
- Map

### Mobile Nav
- Hamburger reveals all nav items
- Bottom sticky bar for primary CTA on detail pages

### Route Health
All routes in the nav must return 200. Current known issue: `/map` returns 404 in
production despite `MapView.tsx` being fully implemented. Likely a deploy/routing gap.

## Trust Signals

Every page that displays prices must include:
- "Prices last updated [date]" near the price display
- "Verified Source" badge on partner-submitted prices
- Disclosure text near affiliate links: "Links may earn a referral fee"

Strain detail pages must show:
- Data quality grade (A/B/C) with tooltip explaining what it means
- Source attribution (Weedmaps / Dutchie / Jane / etc.)

## Category Browse Standards

The 7 product categories:
`Flower` | `Pre-Roll` | `Vape` | `Concentrate` | `Edible` | `Topical` | `Other`

Rules:
- Home page and Compare page filter to Flower by default
- Category filter chips show live count: "Flower (554)"
- Category pages at `/category/[slug]` suppress category badge on DealCards (redundant)
- "Other" category should be deprioritized in browse surfaces

## Mobile Standards (primary platform)

- Viewport target: 390px (iPhone 14 / Pixel 7 class)
- Primary CTA must be visible without scrolling on strain detail and home pages
- Compare table: show top 3 columns with horizontal scroll, or switch to card layout
- No fixed-width containers — all widths responsive
- Font sizes: minimum 14px for body text, 16px for input fields (prevents iOS zoom)

## Loading & Empty States

| State | Treatment |
|-------|-----------|
| Catalog loading | Skeleton cards matching DealCard dimensions |
| No search results | "No strains found for '[query]'" + suggested filters |
| Dispensary no strains | "No strains listed for this dispensary" + link to compare page |
| Price alert no alerts | Prompt to create first alert (not just empty state) |
| Comment no comments | "Be the first to review [strain name]" |
| Error boundary | "Something went wrong" with retry button — no raw error messages to users |
