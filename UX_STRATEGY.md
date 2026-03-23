# StrainScout MD — UX Strategy & Journey Improvement Plan

**Prepared for:** Cross-iteration handoff
**Scope:** web_2/ (Next.js static export — the launch target)
**Core conversion goal:** User arrives → identifies cheapest cannabis meeting their needs → takes a purchase action (visits dispensary website, calls, or gets directions)

---

## Context: What Has Already Been Fixed

Before reading the improvement plan, understand what was changed in the most recent iteration. These fixes are already live in web_2/:

| Fix | File | Before | After |
|---|---|---|---|
| Home grid sort | `app/page.tsx` | Sorted by `dispensary_count` (most available) | Sorted by `price_min` asc (cheapest first) |
| Home section title | `app/page.tsx` | "Most Available Strains" | "Cheapest Strains" |
| Search → Compare handoff | `app/page.tsx` | "Find Deals" always linked to `/compare` | Links to `/compare?q=[query]` — search intent carries through |
| "Cheapest Right Now" strip | `app/page.tsx` | Did not exist | Horizontal strip of 6 cheapest flower items, above the main grid |
| Email capture placement | `app/page.tsx` | Between hero and strain grid (before user sees any value) | After the strain grid (after user has seen the data) |
| Compare default sort | `app/compare/page.tsx` | `dispensaries` desc (most available) | `price` asc (cheapest first) |
| Compare URL params | `app/compare/page.tsx` | No URL param support | Reads `?q=` and `?sort=` on mount via `useSearchParams` |
| Compare quick filters | `app/compare/page.tsx` | None | "Under $30", "Under $40", "High THC 25%+", "Indica Under $40" pill buttons |
| Compare dispensary filter | `app/compare/page.tsx` | None | Dropdown to filter all strains by a specific dispensary |
| Compare compare tray | `app/compare/page.tsx` | Floating button in top filters | Fixed bottom tray showing selected strains with X to remove |
| Product category detection | `lib/utils.ts` | Did not exist | `getProductCategory(name)` classifies Flower/Pre-Roll/Cartridge/Concentrate/Edible/Topical |
| DealCard category badge | `components/DealCard.tsx` | Only showed Indica/Sativa/Hybrid type | Shows type + category badge (e.g., "Hybrid · Cartridge") |
| Home strip — flower only | `app/page.tsx` | Showed all products (RSO, edibles, carts appearing "cheapest") | Filtered to Flower only via `getProductCategory` |
| Home grid — flower only | `app/page.tsx` | Showed all products | Filtered to Flower only |
| DealCard dispensary name | `components/DealCard.tsx` | Truncated at 110px | Full width, no max-w cap |
| DealCard buy link | `components/DealCard.tsx` | No direct purchase action on card | "Buy →" button appears when `dispensary_links` or `ordering_links` has an entry |
| Deals page naming | `app/deals/page.tsx` | "Deals & Price Drops" — implied temporal sales that don't exist | "Best Prices Across Dispensaries" — accurate description of cross-dispensary price spread |
| Footer nav label | `components/Footer.tsx` | "Price Drops" | "Best Prices" |
| Catalog URL (production) | `hooks/useCatalog.ts` | `/strainscout_catalog_v10.min.json` (wrong for IONOS) | `/data/strainscout_catalog_v10.min.json` (matches pipeline upload path) |
| Catalog file structure | `public/` | Catalog at `public/` root | Moved to `public/data/` to match production path |
| Deploy script | `publish/upload_ionos.py` | Only `--full-deploy` (Vite SPA) | Added `--next-deploy` flag — deploys Next.js `out/` with correct `.htaccess` |

---

## The Nine User Journeys

### How to Read the Scores

Each journey is scored **1–10** against this rubric:

- **10** — User reaches a purchase action in ≤2 clicks, with correct pricing, zero dead ends
- **7–9** — Minor friction; user gets there but has to work a bit
- **4–6** — Meaningful gaps; user may drop off or make a worse purchasing decision
- **1–3** — Journey is broken, misleading, or leads to a dead end

---

### Journey 1: Price-First Discovery
> *"Show me the cheapest cannabis available right now"*

**Entry point:** Home page, cold visit, no prior intent
**Current score: 6/10**

#### Current path
```
Home
 └─ "Cheapest Flower Right Now" strip (above fold)
     └─ Strain Detail (/strain/[id])
         └─ Price table → dispensary link (external)
```

#### What works now
The Cheapest Flower strip exists and shows the right data. `$18` is immediately visible. The dispensary name appears on each mini-card. After clicking a strain, the price table on Strain Detail links out to the cheapest dispensary's website.

#### What still fails

**Problem 1: The terminal conversion action is buried.**
On Strain Detail, the purchase link lives inside a price comparison table — the user has to scroll past description, genetics, effects, terpenes, and a verification summary before they reach it. The most important action on the page is treated as a data point, not a call to action.

*Example:* A user clicks "Blue Dream — $22" from the strip. They land on a page that opens with the strain name, type badge, brand, Leafly link, grade, and a stats row showing THC/price/dispensaries/verification. The cheapest dispensary's "Visit Website" button is ~600px below the fold on mobile.

**Problem 2: No product category filter on the strip or main grid.**
While the home strip and grid are now filtered to Flower by `getProductCategory`, this filter is silent — there's no UI element showing the user "You're seeing flower only." A user specifically looking for a cartridge has no obvious way to switch.

**Problem 3: Loading spinner blocks the purchase decision.**
The entire catalog (~3MB JSON) must load before any strain renders. The spinner has no progress indicator and no skeleton content — users on slow connections see a blank page.

#### Improvements to implement

1. **Strain Detail: Add a primary "Buy at [Cheapest Dispensary]" CTA in the hero**, directly below the strain name. Logic: find the cheapest price entry, check `dispensary_links` or `ordering_links` for a URL, render a green CTA button. The price table below can remain for full comparison. See implementation spec below.

2. **Home: Add a "Flower / Pre-Roll / Cartridge" tab strip** above the Cheapest strip to let users toggle product category. Default: Flower.

3. **Skeleton loading**: Replace the full-page spinner with content skeleton cards that approximate the layout. Reduces perceived wait time significantly.

---

### Journey 2: Strain-First Research
> *"I want Blue Dream — where's it cheapest in Maryland?"*

**Entry point:** Home search bar
**Current score: 5/10**

#### Current path
```
Home search → "Find Deals" → /compare?q=blue+dream
 └─ Strain row in table
     └─ Strain Detail
         └─ Price table
```

#### What works now
The search query now carries through to /compare correctly. The compare page defaults to price ascending so the cheapest matching results appear first.

#### What still fails

**Problem 1: The compare table row doesn't show which dispensary has the cheapest price.**
The `price` column in the compare table shows `$22` but not *where* that $22 is available. The user must click through to the strain detail to find the dispensary name.

*Example:* User searches "Blue Dream" on home, clicks "Find Deals." They land on a table with 8 Blue Dream variants sorted by price. The cheapest is $22. They don't know whether that's at a dispensary 2 miles away or 40 miles away. They have to click every row to find out.

**Problem 2: Compare table mixes all product categories.**
Searching "Blue Dream" returns Blue Dream flower, Blue Dream pre-rolls, Blue Dream carts, and Blue Dream concentrate — all mixed in the price-sorted list. The cheapest result might be a $10 cart rather than flower.

*Example:* User wants to buy an eighth of Blue Dream flower. The table shows:
- Blue Dream Cart (Sativa) — $12
- Blue Dream Pre-Roll (Hybrid) — $18
- Blue Dream (Hybrid) — $22 ← what they actually want
The user now has to mentally filter the list.

**Problem 3: Home search gives no feedback when the typed query doesn't match the visible 12 cards.**
If you type "Gorilla Glue" on home, the 12-card grid filters to zero results but shows a blank space. There's no "No results in preview — click Find Deals to search all 1,297 strains" message.

#### Improvements to implement

1. **Add a "cheapest dispensary" column to the compare table desktop view.** Replace `col-span-1` Avail column with a combined `col-span-2` showing `$price · Dispensary Name`. This is the most impactful single change to Journey 2.

2. **Add product category filter pills to /compare** (in addition to Indica/Sativa/Hybrid). Options: All Products / Flower / Pre-Roll / Cartridge / Concentrate / Edible. Default: All (to avoid breaking existing behavior), but placing it visually near the type filter makes it easy to find.

3. **Add zero-result feedback on home search** with a direct CTA: `"No results for 'Gorilla Glue' in preview — search all 1,297 strains →"` linking to `/compare?q=gorilla+glue`.

---

### Journey 3: Dispensary-Location
> *"Which dispensary near me has the best prices?"*

**Entry point:** Navbar → Dispensaries OR Navbar → Map
**Current score: 3/10** ← lowest-scoring journey

#### Current path (working)
```
/dispensaries (default sort: strain_count desc)
 └─ Sort by "Price" (manual step)
     └─ DispensaryCard → /dispensary/[slug]
         └─ Strain grid
             └─ Strain Detail → buy
```

#### Current path (broken)
```
Navbar "Map" → /map → 404
```

#### What works now
The dispensaries page has a price sort. Dispensary Detail shows min/avg price stats and has Visit Website + Get Directions CTAs. The NearbyDispensaries section helps users discover alternatives if the current one isn't the best value.

#### What still fails

**Problem 1: /map is in the desktop nav and 404s on every visit.**
This is the most natural entry point for "near me" intent. A user arriving via mobile and clicking "Map" hits a dead 404 page. There's no error redirect, no helpful fallback.

**Problem 2: The dispensaries page defaults to strain_count sort, not price.**
A user whose intent is "where's cheapest" has to notice and click the "Price" sort button. Most users won't.

**Problem 3: Dispensary Detail shows the wrong prices on its strain cards.**
`DealCard` shows `price_min` from the global catalog — the cheapest price across all 97 dispensaries, not the price at this dispensary. A user browsing their local dispensary's page may see "$22" for Blue Dream but that $22 is the price at a different dispensary across the state.

*Example:* User is on the Zen Leaf page. Blue Dream shows "$22" in the DealCard. The actual price at Zen Leaf is $38. User drives to Zen Leaf expecting to pay $22.

**Problem 4: No "cheapest dispensary overall" page exists.**
The single most useful answer to "where's cheapest in Maryland?" — a ranked list of dispensaries by average price — is available only as an unlinkable sidebar on /top-value. It has no navigation, no links, and is buried behind a page that isn't in the desktop nav.

#### Improvements to implement

1. **Fix /map immediately.** Either redirect `/map` to `/dispensaries` with a toast ("Map coming soon") or remove it from the navbar entirely. A 404 from a primary nav item destroys trust.

2. **Change dispensaries page default sort to `price_min` asc.** Users who want "cheapest" are the target audience. Users who want "most strains" can re-sort.

3. **Build `/cheapest` page** — see full spec in the New Features section below. This is the highest-priority missing page.

4. **Fix Dispensary Detail strain card prices.** Pass a `contextDispensary` prop to DealCard. When set, DealCard should show the price for that specific dispensary (`s.prices.find(p => p.dispensary === contextDispensary)?.price`) rather than the global `price_min`.

5. **Make "Lowest 8th in MD" stat card on home page a link** to `/cheapest`. Currently it displays a number with no navigation.

---

### Journey 4: Dispensary-Loyal
> *"I always go to Zen Leaf — what's the best deal there today?"*

**Entry point:** Dispensaries directory → search by name
**Current score: 5/10**

#### Current path
```
/dispensaries → search "Zen Leaf" → DispensaryCard → /dispensary/zen-leaf
 └─ Strain grid (sorted by price_avg — wrong)
     └─ Strain Detail
```

#### What works now
The dispensary search on the directory page works well. The Dispensary Detail page is well structured — it shows stats, has CTAs, and the NearbyDispensaries section is a useful cross-sell for comparison shoppers.

#### What still fails

**Problem 1: Strain grid sorted by `price_avg` (global catalog average), not by price at this dispensary.**
The first strain shown isn't the cheapest option at Zen Leaf — it's the strain with the lowest average price across all Maryland dispensaries, regardless of what Zen Leaf charges.

**Problem 2: No "cheapest 5 here" callout at the top.**
A user's likely first question on a dispensary page is "what's the cheapest thing here?" There's no quick-answer section before the full grid loads.

**Problem 3: No product category filter on the dispensary strain grid.**
The grid shows flower, carts, pre-rolls, edibles, and concentrates mixed together. The cheapest items will often be non-flower.

#### Improvements to implement

1. **Sort dispensary strain grid by price at this dispensary**, not global `price_avg`. Use `s.prices.find(p => p.dispensary === dispensary.name)?.price ?? 999` as the sort key.

2. **Add a "Cheapest Here" horizontal strip** at the top of the Available Strains section showing the 4 cheapest flower items at this dispensary with their local price prominently displayed.

3. **Add product category filter tabs** above the strain grid on dispensary detail.

---

### Journey 5: Value-First
> *"I want the most potency per dollar"*

**Entry point:** /top-value
**Current score: 4/10**

#### Current path
```
Mobile menu → Top Value (hidden on desktop)
 └─ Value Leaderboard → Strain Detail → buy
```

#### What works now
The value score formula is explained transparently in the UI. Leaderboard rows link to strain detail. The Biggest Price Spreads sidebar is useful for identifying arbitrage opportunities.

#### What still fails

**Problem 1: /top-value is not in the desktop navigation.**
The most analytically useful page for the target user — someone optimizing THC-per-dollar — is invisible to anyone using a desktop browser. It's hidden in the mobile hamburger menu's "extra links" section.

**Problem 2: The value leaderboard mixes product categories.**
A concentrate with 72% THC at $50 will score dramatically higher than flower at 25% THC and $25, because the formula is raw `(THC / price)`. The leaderboard will be dominated by concentrates and hash, which may not be what most users are shopping for.

*Example:* A user clicks "Top Value" expecting to find the best value flower. The #1 result is "#Hash Wax Nana's Wedding Cake Budder — Score: 144.8". This is technically correct math but not what they came for.

**Problem 3: "Cheapest Dispensaries" sidebar has no links.**
It lists dispensary names and average prices but clicking a name does nothing. This is the closest thing on the site to the "cheapest dispensary overall" feature the site needs — and it's non-interactive.

#### Improvements to implement

1. **Add /top-value to the desktop navbar** — replace "Market" (which is analytical, not transactional) or add it as a 7th link. Market can remain accessible via footer.

2. **Default the value leaderboard to Flower only** using `getProductCategory`. Add a product category toggle so users can opt into seeing concentrates if they want.

3. **Make Cheapest Dispensaries sidebar entries clickable** — wrap each row in `<Link href={/dispensary/${slugify(d.name)}}>`. One line change, massive improvement.

---

### Journey 6: Deal Hunting
> *"What has the biggest savings available right now?"*

**Entry point:** Navbar "Price Drops" → /deals
**Current score: 6/10**

#### Current path
```
/deals (default: Biggest % Off)
 └─ DealDropCard → Strain Detail → buy
```

#### What works now
The page now accurately describes itself ("same product, lower cost at a different dispensary"). Default sort by % savings is the right default. Cards show both the best price and worst price clearly.

#### What still fails

**Problem 1: Navbar label still says "Price Drops" but page says "Best Prices Across Dispensaries".**
A user who clicked "Price Drops" expecting time-based sales data will see a differently-titled page explaining cross-dispensary spreads. Minor friction but contributes to distrust.

**Problem 2: No product category filter.**
Deals page mixes all product types. Concentrates and extracts naturally have high price spreads (a gram of live resin at one dispensary vs another). The "biggest deals" list will be dominated by non-flower products.

**Problem 3: The `dispensary` shown on DealDropCard is the cheapest dispensary — but there's no purchase link directly on the card.**
DealDropCard links the entire card to `/strain/[id]`, adding an extra click before the user can act. Unlike DealCard (used on home/compare), DealDropCard doesn't have the "Buy →" button logic.

#### Improvements to implement

1. **Update navbar label** from "Price Drops" to "Best Prices" — one line change in `components/Navbar.tsx`.

2. **Add product category filter** to /deals page — same pill approach as compare. Default: Flower.

3. **Add "Buy →" link to DealDropCard** using the same `getBuyLink()` logic implemented in DealCard.

---

### Journey 7: Returning User / Price Alerts
> *"Alert me when the price of Blue Dream drops below $25"*

**Entry point:** Navbar bell icon → /alerts
**Current score: 1/10** — feature is non-functional end-to-end

#### Current path
```
/alerts → email signup (stores nothing)
 └─ Demo alerts shown (hardcoded, not real)
     └─ No way to create a new alert from any page
```

#### What fails
The entire alerts feature is a UI mockup. The empty state message says *"Browse strains and tap 'Alert Me' to track price drops"* — but there is no "Alert Me" button anywhere on the site. There is no persistence. The email form on the page submits to a local `useState`, not a backend.

Until a real alerts backend is built, the current implementation actively misleads users who sign up expecting to receive notifications.

#### Improvements to implement (pre-backend, no server required)

1. **Replace the broken alerts UI with an honest email digest signup.** Instead of pretending users can create per-strain alerts, repurpose the page as a "Weekly Deals Digest" signup using `useEmailCapture`. Same localStorage-based submission as the footer form. Users get honest expectations: "We'll email you Maryland's best prices every Tuesday."

2. **Remove "My Alerts" from the navbar bell icon** or relabel it "Deals Digest" to set correct expectations.

3. **When a real backend is available:** Add an "Alert Me" button on Strain Detail that opens a modal with: target price input + email field + dispensary selector (any/specific). Store to a database and send triggered emails from the pipeline.

---

### Journey 8: Mobile First Visit
> *Cold visitor on a phone from a Google search*

**Entry point:** Home page on mobile
**Current score: 5/10**

#### What works now
The responsive layout is generally solid. The Cheapest Flower strip is above the fold. The hamburger menu is functional.

#### What still fails

**Problem 1: Compare table is hidden on mobile.**
`/compare` shows minimal stacked rows on mobile — name, price, dispensary count. The type badge, terpenes, and product category badge are all `hidden md:block`. Mobile users get a stripped-down list with no way to compare strains side by side.

**Problem 2: Top Value and Alerts are buried in the mobile hamburger "extra links" section.**
The primary transactional pages are accessible from desktop nav. Top Value — arguably the stickiest page for a price-conscious user — requires three taps on mobile (hamburger → scroll down → Top Value).

**Problem 3: The compare panel modal (side-by-side comparison) is rendered `items-end` on mobile — it slides up from the bottom.**
This works for 2 strains but the `max-h-[90vh] overflow-y-auto` container can become difficult to use on small phones when comparing 3 strains.

#### Improvements to implement

1. **Expose Top Value in the mobile main nav links array** (move it out of `mobileExtraLinks` into `navLinks`). It can replace Map (which 404s anyway).

2. **Mobile compare view**: Add a condensed product category badge to the mobile row (the `md:hidden` section in compare). At minimum show `strain.type + category` so users can distinguish flower from carts at a glance.

---

### Journey 9: SEO Landing on Strain or Dispensary Page
> *"Blue Dream Maryland cheapest" → lands on /strain/blue-dream*

**Entry point:** Google search → direct URL
**Current score: 6/10**

#### What works now
Strain Detail is self-contained. Price table, dispensary links, verification badges, similar strains section for internal linking, Leafly/Weedmaps external links.

#### What still fails

**Problem 1: No primary "Buy" CTA in the hero.**
The cheapest price and dispensary are visible in the stats row but as data, not as an action. The user has to scroll to find the clickable link.

**Problem 2: No structured data / schema markup.**
Google can't extract key facts (price, dispensary, availability) as rich snippets. A Yelp-style product page with `Product` schema + `Offer` schema would dramatically increase click-through rates from search.

**Problem 3: Page title and meta description are generic.**
`layout.tsx` sets a single global title: "StrainScout MD — Find the Cheapest Cannabis in Maryland." Individual strain pages should have titles like "Blue Dream — Cheapest $22 | StrainScout MD" and dispensary pages like "Zen Leaf Frederick | Prices from $22 | StrainScout MD."

#### Improvements to implement

1. **Add `generateMetadata()` to `app/strain/[id]/page.tsx`** — since it's already a server component (required for `generateStaticParams`), it can export a metadata function that reads the catalog and returns a strain-specific title and description.

2. **Add schema markup** — in StrainDetailClient, render a `<script type="application/ld+json">` block with Product/Offer schema. Can be injected via `next/head` or as a direct script tag in the client component.

3. **Primary CTA in hero** — same fix as Journey 1, Problem 1.

---

## New Feature: `/cheapest` — Cheapest Dispensary Page

This is the highest-priority missing feature. It directly answers the site's core question.

### What the page does

Ranks all Maryland dispensaries by average price across their catalog, with a secondary sort by lowest single item price. Gives users a clear, data-backed answer to "where should I go today?"

### Proposed layout

```
Header: "Cheapest Dispensaries in Maryland"
Subtext: "Ranked by average price per eighth across all tracked strains."

[Sort pills]: Avg Price | Lowest Price | Most Strains

┌─────────────────────────────────────────────────────┐
│ #1  🏆  Green Goods Rockville          Rockville, MD │
│         Avg eighth: $28   From: $18   42 strains    │
│         [View Menu →]                                │
├─────────────────────────────────────────────────────┤
│ #2  Zen Leaf Frederick                Frederick, MD  │
│         Avg eighth: $31   From: $20   38 strains    │
│         [View Menu →]                                │
└─────────────────────────────────────────────────────┘
```

### Data source

The data already exists. `top-value/page.tsx` computes `dispensaryRankings` with this exact logic:

```typescript
// Already in top-value/page.tsx
const map = new Map<string, number[]>();
catalog.strains.forEach((s) => {
  s.prices.forEach((p) => {
    if (!map.has(p.dispensary)) map.set(p.dispensary, []);
    map.get(p.dispensary)!.push(p.price);
  });
});
return Array.from(map.entries())
  .map(([name, prices]) => ({
    name,
    avgPrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0),
    strainCount: ...,
  }))
  .sort((a, b) => Number(a.avgPrice) - Number(b.avgPrice));
```

This is already working — it just needs to be promoted to its own page with links to each dispensary.

### Where to link it from

| Location | Change |
|---|---|
| Navbar | Add "Cheapest" link (replace "Map" which 404s) |
| Home hero stat card | "Lowest 8th in MD: $18" → make this a link to /cheapest |
| /top-value sidebar | Wrap each dispensary row in `<Link href={/dispensary/${slug}}>` |
| Footer | Add under Explore section |

---

## Priority Order for Implementation

Ranked by conversion impact × implementation effort:

| Priority | Fix | Impact | Effort | File(s) |
|---|---|---|---|---|
| 🔴 P1 | Fix /map (remove from nav or redirect) | High — 404 on primary nav | Trivial | `components/Navbar.tsx` |
| 🔴 P1 | Build /cheapest dispensary page | High — core feature missing | Medium | `app/cheapest/page.tsx` |
| 🔴 P1 | "Buy at [Dispensary]" CTA in Strain Detail hero | High — terminal action buried | Small | `app/strain/[id]/StrainDetailClient.tsx` |
| 🔴 P1 | Add Top Value to desktop nav | High — best page is invisible | Trivial | `components/Navbar.tsx` |
| 🟡 P2 | Fix dispensary detail strain prices (show local price) | High — currently misleading | Medium | `app/dispensary/[slug]/DispensaryDetailClient.tsx` + `DealCard.tsx` |
| 🟡 P2 | Add cheapest dispensary name to compare table row | Medium | Small | `app/compare/page.tsx` |
| 🟡 P2 | Add product category filter to /compare | Medium | Small | `app/compare/page.tsx` |
| 🟡 P2 | Make /top-value cheapest dispensaries sidebar clickable | Medium | Trivial | `app/top-value/page.tsx` |
| 🟡 P2 | Update navbar "Price Drops" → "Best Prices" | Low-Medium | Trivial | `components/Navbar.tsx` |
| 🟢 P3 | Zero-result feedback on home search | Medium | Small | `app/page.tsx` |
| 🟢 P3 | Replace /alerts with honest email digest page | Medium | Small | `app/alerts/page.tsx` |
| 🟢 P3 | Per-strain metadata (generateMetadata) | Medium (SEO) | Medium | `app/strain/[id]/page.tsx` |
| 🟢 P3 | Product category filter on /deals | Low-Medium | Small | `app/deals/page.tsx` |
| 🟢 P3 | Add "Buy →" button to DealDropCard | Low-Medium | Small | `app/deals/page.tsx` |
| 🔵 P4 | Schema markup on strain/dispensary pages | SEO long-term | Large | StrainDetailClient + DispensaryDetailClient |
| 🔵 P4 | Skeleton loading states | UX polish | Medium | All pages |
| 🔵 P4 | Mobile compare table category badge | Low | Small | `app/compare/page.tsx` |

---

## Before vs. After: Conversion Path Comparison

### Before (original web_2 before this session's changes)

```
Home (sorted by dispensary_count)
 │
 ├─ "Most Available Strains" grid (popularity sort)
 │   └─ DealCard (no category badge, no buy button, truncated dispensary)
 │
 ├─ DealDigestBanner (before user sees any data)
 │
 └─ "Find Deals" button (ignores search query, always → /compare)

/compare (default: dispensaries desc)
 └─ No price-sorted default, no quick filters, no dispensary filter

/deals ("Price Drops")
 └─ Correctly shows spreads but labeled as "Price Drops" (misleading)

/top-value
 └─ Not in desktop nav
 └─ Cheapest dispensaries sidebar (no links)

/map → 404
/account → 404
```

A user wanting cheapest flower: **Home → confused by popularity sort → clicks random card → strain detail → scrolls to find price table → clicks link → 4-5 clicks, no guidance**

### After (current web_2 with all session changes applied)

```
Home (sorted by price_min asc — FLOWER ONLY)
 │
 ├─ "Cheapest Flower Right Now" strip (6 cheapest, dispensary visible)
 │   └─ Each mini-card → Strain Detail
 │
 ├─ "Cheapest Strains" grid (price sort, flower only, category badges on non-flower)
 │   └─ DealCard (category badge, "Buy →" button if link exists, full dispensary name)
 │
 ├─ "Browse All Strains" CTA
 │
 └─ DealDigestBanner (after seeing data — correct placement)

/compare (default: price asc)
 └─ URL params: ?q= and ?sort= carried from home search
 └─ Quick filter pills: Under $30, Under $40, High THC, Indica Under $40
 └─ Dispensary filter dropdown
 └─ Fixed bottom compare tray

/deals ("Best Prices Across Dispensaries")
 └─ Accurate description of cross-dispensary spreads

/top-value
 └─ Cheapest Dispensaries sidebar (still no links — P2 fix pending)
```

A user wanting cheapest flower: **Home → "Cheapest Flower Right Now" strip visible immediately → click → Strain Detail → "Buy at [Dispensary]" CTA (P1 fix) → dispensary website → 2-3 clicks**

### After (with all P1+P2 fixes applied — target state)

```
Navbar: Home | Compare | Cheapest | Dispensaries | Best Prices | Top Value | [Bell]
              ↑ (replaces broken /map)              ↑ (promoted from mobile-only)

Home:
 ├─ "Cheapest Flower Right Now" strip
 │   └─ [category tabs: Flower | Pre-Roll | Cartridge]  ← NEW
 ├─ "Cheapest Strains" grid
 │   └─ "Lowest 8th in MD: $18" stat → links to /cheapest  ← NEW
 └─ DealDigestBanner

/cheapest (NEW PAGE):
 ├─ Dispensary ranked list (avg price, min price, strain count)
 └─ Each row → /dispensary/[slug]

/compare:
 ├─ Price column shows "$22 · Green Goods"  ← dispensary name in row
 ├─ Category filter: All | Flower | Pre-Roll | Cartridge | ...
 └─ Home search zero-result feedback

/strain/[id]:
 ├─ Hero: "Buy at Green Goods for $22 →" PRIMARY CTA  ← MOVED TO TOP
 └─ Price table below (full comparison)

/dispensary/[slug]:
 ├─ "Cheapest Here" strip (4 items at this dispensary's actual price)
 └─ Strain grid sorted by local price, not global average

/top-value:
 ├─ Leaderboard filtered to Flower by default
 └─ Cheapest Dispensaries sidebar → each name links to /dispensary/[slug]

/deals:
 └─ Category filter: Flower | Cartridge | ...
 └─ "Buy →" link on each card

/alerts:
 └─ Repurposed as Weekly Deals Digest signup (honest, functional)
```

A user wanting cheapest flower: **Home → "Cheapest Flower Right Now" → Strain Detail hero CTA → dispensary website → 2 clicks**

A user wanting cheapest dispensary: **Navbar "Cheapest" → ranked list → /dispensary/[slug] → browse menu → buy → 3 clicks**

---

## Implementation Notes for the Other Claude Iteration

### Navbar changes (one file, high impact)
`components/Navbar.tsx` — `navLinks` array:
- Remove `{ href: "/map", label: "Map", icon: MapPin }` — this 404s
- Add `{ href: "/cheapest", label: "Cheapest", icon: TrendingDown }`
- Add `{ href: "/top-value", label: "Top Value", icon: TrendingUp }` (move from `mobileExtraLinks`)

### /cheapest page
Create `app/cheapest/page.tsx` as a `"use client"` component. The dispensary ranking logic can be copied directly from the `dispensaryRankings` useMemo in `app/top-value/page.tsx`. Add a `slugify()` function and wrap each row in `<Link href={/dispensary/${slugify(name)}}>`. Add sort buttons for avg/min/count.

### Strain Detail primary CTA
In `app/strain/[id]/StrainDetailClient.tsx`, after the strain name heading, find the cheapest price:
```typescript
const cheapestPrice = strain.prices.reduce((a, b) => a.price < b.price ? a : b, strain.prices[0]);
const buyUrl = strain.dispensary_links?.[cheapestPrice?.dispensary]
  || strain.ordering_links?.[cheapestPrice?.dispensary]?.dutchie
  || strain.leafly_url;
```
Render as a green CTA button in the hero section if `buyUrl` exists.

### Dispensary Detail local prices
In `app/dispensary/[slug]/DispensaryDetailClient.tsx`, pass `dispensary.name` to the strain grid. Create a `DispensaryDealCard` wrapper (or add a `localPrice` prop to DealCard) that overrides the displayed price with `s.prices.find(p => p.dispensary === dispensaryName)?.price`.

### Top Value sidebar links
In `app/top-value/page.tsx`, the `dispensaryRankings.slice(0, 10).map(...)` block — wrap the inner `<div>` in:
```tsx
<Link href={`/dispensary/${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}>
```

### Navbar "Price Drops" label
`components/Navbar.tsx` line 14: change `label: "Price Drops"` to `label: "Best Prices"`.
