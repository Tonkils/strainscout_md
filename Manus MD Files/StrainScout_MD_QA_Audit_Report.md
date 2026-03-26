# StrainScout MD — QA Audit Report

**Prepared by:** QA Engineering Review  
**Date:** March 25, 2026  
**Repository:** `Tonkils/strainscout_md` (private)  
**Scope:** Full-stack code quality, data pipeline integrity, frontend architecture, and security audit  
**Framework:** ISO/IEC 25010 Software Quality Model + Web Scraping Data Quality Standards

---

## Executive Summary

StrainScout MD is a cannabis price comparison platform for Maryland dispensaries. The system consists of a **Python-based scraping and data pipeline** (Playwright scrapers, JSON processing, SFTP deployment) and a **Next.js 15 static-export frontend** hosted on IONOS shared hosting. The codebase is functional and ships a working product, but this audit identifies **43 findings** across 5 severity levels. The most critical issues center around the absence of automated testing, hardcoded credentials in source code, fragile scraper architecture with no retry/circuit-breaker patterns, and a monolithic frontend catalog load that will not scale.

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 6 | Must fix immediately — security vulnerabilities, data corruption risk |
| **High** | 12 | Should fix before next release — reliability, maintainability |
| **Medium** | 14 | Plan to fix — performance, code quality, DRY violations |
| **Low** | 8 | Nice to have — polish, minor UX, documentation |
| **Info** | 3 | Observations and architectural notes |

---

## Phase 1: Data Pipeline and Scraper Evaluation

### 1.1 Scraper Architecture

#### CRITICAL-01: No Retry Logic or Circuit Breaker Pattern

**Files:** `scraper/scrape_weedmaps.py`, `scraper/scrape_dutchie.py`, `scraper/scrape_sweedpos.py`

All three scrapers execute a single attempt per dispensary. If a page times out, returns a transient error, or the age gate fails to dismiss, the dispensary is marked as failed and skipped permanently for that run. There is no exponential backoff, no retry queue, and no circuit breaker to pause scraping if a target site begins rate-limiting.

**Impact:** A single network hiccup can cause an entire dispensary's data to go stale. Over multiple runs, this compounds into data gaps that silently degrade catalog quality.

**Recommendation:** Implement a retry decorator with exponential backoff (e.g., `tenacity` library). Add a circuit breaker that pauses all requests to a domain if more than 3 consecutive failures occur within a 5-minute window.

---

#### HIGH-01: Single Browser Context Shared Across All Dispensaries

**File:** `scraper/scrape_weedmaps.py` (lines 553–574)

A single Playwright browser context and page is reused for all ~57 dispensaries sequentially. If one dispensary's JavaScript corrupts the page state, sets problematic cookies, or triggers a Weedmaps-wide rate limit, every subsequent dispensary in the run is affected.

**Recommendation:** Create a fresh browser context (not just page) per dispensary, or at minimum per batch of 10. This isolates cookie state and prevents cross-contamination.

---

#### HIGH-02: Hardcoded Age Gate Date of Birth

**File:** `scraper/scrape_weedmaps.py` (line 59)

```python
AGE_GATE_DOB = {"month": "05", "day": "27", "year": "1997"}
```

This is a minor issue but reflects a pattern of hardcoding values that should be configuration. More importantly, the age gate handler has three strategies but no logging of which strategy succeeded, making debugging difficult when age gates change their DOM structure.

**Recommendation:** Move to configuration. Add structured logging for age gate dismissal success/failure with the strategy used.

---

#### HIGH-03: DOM Fallback Parser is Fragile and Untested

**File:** `scraper/scrape_weedmaps.py` (lines 303–376)

The DOM fallback parser relies on CSS class name substring matching (`[class*="ProductCard"]`, `[class*="product-card"]`). These selectors are extremely brittle — a single Weedmaps frontend deployment that renames CSS classes will silently break extraction, returning zero products without any error.

**Recommendation:** Add a validation check: if DOM extraction returns 0 products but the page HTML is non-trivial (>50KB), flag it as a "likely broken selector" rather than "empty dispensary." Consider maintaining a snapshot of known-good HTML for regression testing.

---

#### MEDIUM-01: No Data Freshness Validation

**Files:** `pipeline/parse_raw.py`, `pipeline/build_catalog.py`

The pipeline processes whatever JSON files exist in `data/raw/` without checking their age. If a scraper run fails for a dispensary, the pipeline will silently use data from the previous run (which could be days or weeks old) without any staleness indicator.

**Recommendation:** Add a `scraped_at` timestamp check in `parse_raw.py`. Flag or exclude records older than a configurable threshold (e.g., 7 days). Include a `data_age_days` field in the catalog metadata.

---

#### MEDIUM-02: Price Reconciliation Uses Minimum Price Without Context

**File:** `pipeline/reconcile.py` (line 98)

```python
best["price_eighth"] = min_p
```

When multiple sources report different prices for the same strain at the same dispensary, the system always picks the lowest price. While consumer-friendly, this can be misleading if the lower price is from a stale or erroneous scrape. There is no weighting by recency.

**Recommendation:** Weight by both source priority AND recency. If the lowest price is from a scrape >3 days older than the highest price, prefer the more recent price.

---

#### MEDIUM-03: THC Reconciliation Takes Maximum Value

**File:** `pipeline/reconcile.py` (line 103)

```python
best["thc_pct"] = max(thc_values)
```

When merging THC values from multiple sources, the system takes the maximum. This introduces an upward bias — if one source reports 28% and another reports 22%, the catalog will show 28% without any indication of the discrepancy.

**Recommendation:** Use the value from the highest-priority source (Dutchie > Weedmaps), not the maximum. Or report a range.

---

### 1.2 Pipeline Data Integrity

#### CRITICAL-02: No Schema Validation at Pipeline Boundaries

**Files:** All pipeline steps (`parse_raw.py`, `enrich_leafly.py`, `deduplicate.py`, `build_catalog.py`)

Each pipeline step reads a JSON file, processes it, and writes a new JSON file. There is **zero schema validation** at any boundary. If `parse_raw.py` outputs a record missing the `strain_name` field (due to a scraper bug), `enrich_leafly.py` will crash with a `KeyError` at runtime with no helpful error message.

**Recommendation:** Define JSON schemas (using `pydantic` or `jsonschema`) for each pipeline stage's input and output. Validate at the start of each step. This is the single highest-impact improvement for pipeline reliability.

---

#### CRITICAL-03: Deduplication Uses Naive String Similarity

**File:** `pipeline/deduplicate.py`

The deduplication logic relies on exact lowercase string matching after stripping common suffixes. This means "Blue Dream" and "Blue Dream OG" are treated as different strains, while "Blue Dream (Smalls)" and "Blue Dream" are correctly merged. However, there is no fuzzy matching for common misspellings or slight naming variations across dispensaries (e.g., "GMO Cookies" vs "GMO" vs "Garlic Cookies").

**Impact:** The catalog likely contains duplicate strains under slightly different names, inflating the strain count and confusing price comparisons.

**Recommendation:** Implement a two-pass deduplication: (1) exact match after normalization (current approach), then (2) fuzzy match using `rapidfuzz` or similar with a configurable similarity threshold (e.g., 85%). Flag fuzzy matches for manual review rather than auto-merging.

---

#### HIGH-04: `build_catalog.py` Has Version Mismatch

**File:** `pipeline/build_catalog.py`

The file header says `Output: data/output/strainscout_catalog_v9.json` (line 9), but the actual output path is `strainscout_catalog_v10.json` (line 29), and `CATALOG_VERSION = "v10"` (line 32). The print statement on line 336 still says "Catalog v9 written." This indicates the version was bumped without updating all references.

**Recommendation:** Use a single `CATALOG_VERSION` constant for all file names, paths, and log messages. Better yet, derive the output filename from the constant: `f"strainscout_catalog_{CATALOG_VERSION}.json"`.

---

#### HIGH-05: Ordering Links Are Hardcoded in `build_catalog.py`

**File:** `pipeline/build_catalog.py` (lines 59–128)

Over 40 dispensary ordering URLs are hardcoded directly in the Python source code. When a dispensary changes its website URL, updates its Dutchie slug, or a new dispensary opens, a code change and redeployment is required.

**Recommendation:** Move all ordering links to a JSON configuration file (e.g., `data/config/ordering_links.json`). This separates data from logic and allows non-developer updates.

---

#### MEDIUM-04: `run_all.py` Has No Error Recovery

**File:** `run_all.py`

The orchestrator runs pipeline steps sequentially. If step 2 (enrich) fails, step 3 (deduplicate) still runs on stale data from a previous run. There is no dependency checking, no lock file to prevent concurrent runs, and no rollback mechanism.

**Recommendation:** Implement a simple state machine: each step writes a `.done` marker file with a timestamp. The next step checks that its dependency's marker is fresh. If not, abort with a clear error.

---

#### MEDIUM-05: Leafly Enrichment Has Inconsistent "Found" Check

**File:** `pipeline/enrich_leafly.py` (lines 47, 61)

```python
if output.get("found") in (True, "true", "yes", "Yes"):
```

The `found` field is checked against four different representations of truthiness. This suggests the upstream Leafly data has inconsistent typing — sometimes boolean, sometimes string. This is a data quality smell that should be normalized at ingestion time, not handled with multi-value checks scattered through the code.

**Recommendation:** Add a normalization step when loading Leafly cache files that converts all `found` fields to boolean `True`/`False`.

---

#### LOW-01: Name Pattern Type Inference Has No Validation

**File:** `pipeline/enrich_leafly.py` (lines 158–199)

The fallback type inference uses regex patterns to guess strain type from name (e.g., "kush" → Indica). While clever, the pattern lists are static and there is no mechanism to validate their accuracy against known Leafly data. The default fallback is "Hybrid" with 0.33 confidence, which means any unrecognized strain is labeled Hybrid.

**Recommendation:** Run a one-time validation: for all strains that matched Leafly, compare the Leafly type against what the pattern matcher would have predicted. Report accuracy. Use this to tune the patterns.

---

### 1.3 Scraper-Specific Issues

#### MEDIUM-06: Dutchie Scraper Has Commented-Out Pagination

**File:** `scraper/scrape_dutchie.py`

The Dutchie API scraper fetches menu items but the pagination handling is inconsistent across the different Dutchie endpoint variants (standard API, white-label, Ascend). Some endpoints paginate with `offset`, others with `page`, and the scraper handles each differently with no shared abstraction.

**Recommendation:** Create a `DutchiePaginator` class that encapsulates the pagination logic for each endpoint variant, with a common interface.

---

#### MEDIUM-07: SweedPOS Scraper Has No Rate Limiting

**File:** `scraper/scrape_sweedpos.py`

The SweedPOS scraper makes API calls without any rate limiting or delay between requests. While the number of SweedPOS dispensaries is small, this is a reliability risk if the list grows.

**Recommendation:** Add a configurable delay between API calls (even 0.5s) and respect any `Retry-After` headers.

---

## Phase 2: Frontend Architecture and UX Evaluation

### 2.1 Performance

#### CRITICAL-04: Entire Catalog Loaded as Single JSON Blob

**File:** `web_2/src/hooks/useCatalog.ts`

The `useCatalog` hook fetches `strainscout_catalog_v10.min.json` — the **entire catalog** (~2,200+ strains with all metadata) — as a single HTTP request on every page load. This is cached in a module-level variable (`catalogCache`), but:

1. The initial load blocks all page interactivity until the full JSON is parsed.
2. There is no streaming, pagination, or lazy loading.
3. The `Math.min(...validPrices)` and `Math.max(...validPrices)` spread operations (lines 109–110) will throw a `RangeError` if a strain has thousands of price entries, as `Math.min/max` has a call stack limit.

**Impact:** As the catalog grows (more dispensaries, more products, historical prices), page load time will degrade linearly. At ~2,200 strains, the JSON is likely 1–3 MB minified. At 10,000 strains, this becomes untenable.

**Recommendation:** Short-term: implement code splitting — load only strain IDs and summary data initially, fetch full details on demand. Long-term: move to a backend API (even a simple serverless function) that supports pagination and filtering server-side.

---

#### HIGH-06: Client-Side Filtering and Sorting on Full Dataset

**Files:** `web_2/src/app/compare/page.tsx`, `web_2/src/app/cheapest/page.tsx`, `web_2/src/app/deals/page.tsx`

Every page that displays strains performs filtering, sorting, and pagination entirely in the browser using `useMemo`. The `compare` page, for example, runs 7 filter conditions and a sort on every keystroke in the search box. While `useMemo` prevents unnecessary re-renders, the underlying computation is O(n) on every filter change for the full catalog.

**Recommendation:** Add debouncing to search inputs (300ms). Consider using a Web Worker for filtering/sorting if the catalog exceeds 5,000 entries. Alternatively, pre-compute common filter results (e.g., "all Indica under $40") at build time.

---

#### HIGH-07: No Loading Skeleton or Progressive Rendering

**Files:** All page components

Every page shows a single `<Loader2>` spinner while the catalog loads. There are no skeleton screens, no progressive content rendering, and no above-the-fold optimization. The user sees a blank page with a spinner for the entire catalog fetch duration.

**Recommendation:** Implement skeleton screens that match the final layout. For the homepage, render the hero section and static content immediately (it's already available), and only show a skeleton for the dynamic strain cards.

---

#### MEDIUM-08: Hardcoded Fallback Stats on Homepage

**File:** `web_2/src/app/page.tsx` (lines 117–125)

```typescript
const FALLBACK_STATS = {
  totalStrains: 2220,
  totalDispensaries: 97,
  totalBrands: 180,
  avgPrice: 42,
  lowestPrice: 18,
  highestPrice: 75,
  lastUpdated: "March 2026",
  validationScore: 99.8,
};
```

These hardcoded fallback values are displayed while the catalog loads. They will become stale as the catalog evolves, showing incorrect numbers to users during the loading phase. The `validationScore: 99.8` is also hardcoded in `useCatalog.ts` (line 179), creating a misleading metric that never changes regardless of actual data quality.

**Recommendation:** Either remove fallback stats entirely (show skeletons instead) or generate them at build time from the actual catalog.

---

#### MEDIUM-09: Deals Page Misrepresents Price Spread as "Deals"

**File:** `web_2/src/app/deals/page.tsx` (lines 1144–1165)

The "deals" are calculated as the spread between `price_min` and `price_max` across different dispensaries. This is presented as "X% OFF" and "Save $Y," implying a price drop. In reality, it's just the difference between the cheapest and most expensive dispensary — not a temporal price reduction. This is misleading to users.

**Recommendation:** Rename the page to "Price Spread" or "Shop Around" and reword the copy. Reserve "Deals" for actual temporal price drops (which would require historical price tracking).

---

### 2.2 Accessibility

#### HIGH-08: Missing ARIA Labels and Keyboard Navigation

**Files:** Multiple components

Several interactive elements lack proper ARIA attributes:
- The mobile menu overlay (`Navbar.tsx` line 1641) is a `<div>` with an `onClick` handler but no `role="button"` or keyboard handler.
- The compare panel modal (`compare/page.tsx` lines 1003–1034) has no `role="dialog"`, no `aria-modal`, and no focus trap.
- Filter buttons throughout use color alone to indicate active state without `aria-pressed` or `aria-selected`.

**Recommendation:** Audit all interactive elements against WCAG 2.1 AA. Add `role`, `aria-label`, `aria-pressed`, and keyboard event handlers. Implement focus trapping for modals.

---

#### MEDIUM-10: Color Contrast Issues in Type Badges

**Files:** Multiple components using `TYPE_COLORS`

The type badge colors (e.g., `text-purple-400` on `bg-purple-500/15`, `text-amber-400` on `bg-amber-500/15`) may not meet WCAG AA contrast ratios (4.5:1 for normal text) against the dark background. The `text-[10px]` font size used for badges makes this worse, as smaller text requires higher contrast.

**Recommendation:** Test all badge color combinations with a contrast checker. Consider using `text-purple-300` or adding a subtle border for additional visual distinction.

---

### 2.3 Code Quality

#### MEDIUM-11: Duplicated Type Color Maps

**Files:** `DealCard.tsx`, `compare/page.tsx`, `deals/page.tsx`, `cheapest/page.tsx`

The `TYPE_COLORS` mapping (`indica: "bg-purple-500/15 text-purple-400"`, etc.) is defined independently in at least 4 files. Each has slightly different values (e.g., `compare/page.tsx` uses `bg-purple-500/15` while `deals/page.tsx` uses `bg-indigo-500/20`). This means Indica strains appear in different colors on different pages.

**Recommendation:** Centralize all color mappings in `lib/utils.ts` (which already has `CATEGORY_COLORS`) and import everywhere.

---

#### MEDIUM-12: Search Logic Duplicated Across 4 Pages

**Files:** `page.tsx` (home), `compare/page.tsx`, `cheapest/page.tsx`, `deals/page.tsx`

Each page implements its own search/filter logic with slightly different field sets. The homepage searches `name, brand, type, terpenes, effects, flavors, genetics`. The compare page searches `name, brand, terpenes, effects, genetics` (missing `type` and `flavors`). The deals page searches `name, brand, dispensary, terpenes` (different set entirely).

**Recommendation:** Create a shared `filterStrains(strains, query, options)` utility function in `lib/utils.ts` that all pages use with configurable field sets.

---

#### LOW-02: `useCatalog` Computes Derived Data on Every Load

**File:** `web_2/src/hooks/useCatalog.ts` (lines 103–119)

Every time the catalog is fetched, the hook iterates through all strains to compute `price_min`, `price_max`, `price_avg`, and `dispensary_count`. These values are already computed by `build_catalog.py` and included in the catalog JSON. The frontend is redundantly recalculating them.

**Recommendation:** Trust the pipeline-computed values. Only fall back to client-side computation if the fields are missing (for backward compatibility with older catalog versions).

---

#### LOW-03: No Error Boundary Wrapping Route Pages

**File:** `web_2/src/components/ErrorBoundary.tsx` exists but is not used in `layout.tsx` or any page component.

If the catalog JSON is malformed or a component throws during rendering, the entire app crashes with a white screen. The `ErrorBoundary` component was written but never integrated.

**Recommendation:** Wrap `{children}` in `layout.tsx` with `<ErrorBoundary>`.

---

## Phase 3: Code Quality and Security Audit

### 3.1 Security

#### CRITICAL-05: SFTP Credentials Hardcoded in Source Code

**File:** `publish/upload_ionos.py` (lines 124–126)

```python
DEFAULT_HOST = "access-5019966776.webspace-host.com"
DEFAULT_PORT = 22
DEFAULT_USER = "a3051710"
```

The IONOS SFTP hostname, port, and username are hardcoded as defaults in the source code, which is committed to the repository. While the password is loaded from `.env`, the hostname and username are sufficient for an attacker to attempt brute-force attacks against the hosting account.

**Recommendation:** Remove all credential defaults from source code. Load all SFTP parameters exclusively from `.env`. Add `.env` to `.gitignore` (verify it's there). Consider using SSH key authentication instead of password.

---

#### CRITICAL-06: CSP Allows `unsafe-inline` and `unsafe-eval`

**File:** `publish/upload_ionos.py` (line 60)

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

The Content Security Policy allows both `unsafe-inline` and `unsafe-eval` for scripts. This effectively negates the XSS protection that CSP is designed to provide. The comment says this is "required for Next.js hydration," but Next.js static export does not require `unsafe-eval`.

**Recommendation:** Remove `unsafe-eval` immediately. For `unsafe-inline`, migrate to nonce-based CSP (`script-src 'self' 'nonce-{random}'`) or use Next.js's built-in CSP support with `next.config.ts` headers.

---

#### HIGH-09: No Input Sanitization on Search Queries

**Files:** All pages with search functionality

User search input is used directly in `.includes()` string matching without sanitization. While this is not a direct XSS vector (React escapes output), the search query is passed to PostHog analytics (`trackStrainSearched(query, ...)`) and to URL parameters (`/compare?q=${encodeURIComponent(searchQuery)}`). If PostHog's dashboard renders these values without escaping, it creates a stored XSS vector in the analytics platform.

**Recommendation:** Sanitize search input: strip HTML tags, limit length (e.g., 200 chars), and validate against a character allowlist.

---

#### HIGH-10: PostHog API Key Exposed in Client Bundle

**File:** `web_2/src/components/PostHogProvider.tsx` (referenced in layout)

The PostHog API key is exposed via `NEXT_PUBLIC_POSTHOG_KEY` environment variable, which is embedded in the client-side JavaScript bundle. While PostHog API keys are designed to be public (they're write-only), the key combined with the project ID allows anyone to send fake analytics events, polluting your data.

**Recommendation:** This is acceptable for PostHog's design, but add server-side event validation or PostHog's "Authorized Domains" feature to restrict which domains can send events.

---

#### MEDIUM-13: No Rate Limiting on Catalog Fetch

**File:** `web_2/src/hooks/useCatalog.ts`

The catalog JSON is fetched via a simple `fetch()` with no caching headers, no `If-Modified-Since`, and no ETag support. While the module-level cache prevents re-fetching within a session, every new tab or page refresh triggers a full download.

**Recommendation:** Add `Cache-Control` headers to the `.htaccess` for JSON files (already partially done with `ExpiresByType application/json "access plus 1 day"`). Implement `If-None-Match` / ETag support on the client side.

---

### 3.2 Testing

#### CRITICAL-07: Zero Automated Tests

**Files:** Entire repository

There are **no test files** anywhere in the repository. No unit tests, no integration tests, no end-to-end tests, no snapshot tests. The `package.json` has no test script. There is no CI/CD pipeline (no `.github/workflows/` directory).

**Impact:** Every code change is a manual QA effort. Regressions are discovered only when users report them. The pipeline could silently produce corrupt data with no automated detection.

**Recommendation (Priority Order):**

1. **Pipeline unit tests** (highest ROI): Test `parse_raw.py`, `deduplicate.py`, `reconcile.py`, and `build_catalog.py` with known input/output fixtures. This catches data corruption before it reaches production.
2. **Scraper integration tests**: Record Playwright HAR files from real scraping sessions. Replay them in tests to verify parsing logic without hitting live sites.
3. **Frontend component tests**: Use `@testing-library/react` for `DealCard`, `Navbar`, and the filter/sort logic.
4. **E2E smoke tests**: Use Playwright to verify the deployed site loads, search works, and strain detail pages render.

---

### 3.3 Maintainability

#### HIGH-11: No Dependency Management or Lock Files for Python

**Files:** Repository root

There is no `requirements.txt`, `pyproject.toml`, `Pipfile`, or `poetry.lock` for the Python backend. Dependencies (`playwright`, `paramiko`, `python-dotenv`) are mentioned in comments but not formally declared. This makes it impossible to reproduce the exact environment.

**Recommendation:** Create a `requirements.txt` or `pyproject.toml` with pinned versions. Add a `Makefile` or shell script for environment setup.

---

#### HIGH-12: No Git Branching Strategy or PR Process

**File:** Repository structure

The repository has a single `main` branch with direct commits. There are no feature branches, no pull requests, no code review process, and no branch protection rules. This means any commit goes directly to production.

**Recommendation:** Implement a minimal branching strategy: `main` (production) + feature branches with PRs. Add branch protection to require at least one review before merging.

---

#### MEDIUM-14: Magic Numbers Throughout Pipeline

**Files:** Multiple pipeline files

The codebase contains numerous magic numbers without explanation:
- `len(desc) > 10` (enrich_leafly.py:256) — why 10?
- `len(genetics) > 3` (enrich_leafly.py:261) — why 3?
- `conf + 0.2` (enrich_leafly.py:198) — why 0.2?
- `0.20` price discrepancy threshold (reconcile.py:89) — why 20%?

**Recommendation:** Extract all magic numbers into named constants with docstrings explaining the rationale.

---

#### LOW-04: Inconsistent Logging Across Pipeline Steps

**Files:** All pipeline files

`scrape_weedmaps.py` uses Python's `logging` module with file and console handlers. All other pipeline files use `print()` statements. This means pipeline output cannot be filtered by severity, redirected to files, or integrated with monitoring tools.

**Recommendation:** Standardize on Python `logging` throughout the pipeline. Create a shared `pipeline/logger.py` module.

---

#### LOW-05: Dead Code in `build_catalog.py`

**File:** `pipeline/build_catalog.py`

The `load_grower_benchmark()` function (lines 131–147) loads grower data but it's only used to build `grower_lookup`, which is printed as a stat but never actually used to enrich catalog entries. The grower data is loaded and discarded.

**Recommendation:** Either integrate grower data into the catalog (e.g., add `grower` field to strains) or remove the dead code.

---

#### LOW-06: `next.config.ts` Not Reviewed

The Next.js configuration was not available for review in the files fetched. This should be audited for proper `output: 'export'` configuration, image optimization settings, and security headers.

---

#### LOW-07: No Changelog or Version History

**Files:** Repository root

There is no `CHANGELOG.md` or version tagging. The catalog version is tracked (`v10`), but there is no record of what changed between versions, when scraper logic was updated, or when new dispensaries were added.

**Recommendation:** Maintain a `CHANGELOG.md` following Keep a Changelog format. Tag releases in Git.

---

#### LOW-08: `.gitignore` May Not Cover All Sensitive Files

The `.gitignore` should be audited to ensure it covers:
- `.env` and all variants (`.env.local`, `.env.production`)
- `data/raw/` (contains scraped data that may have legal implications)
- `logs/` directory
- `deploy_manifest_next.json` (contains deployment state)
- `deploy_log.jsonl` (contains deployment history)

---

### 3.4 Architectural Observations

#### INFO-01: Static Export Limits Future Features

The Next.js app uses `output: 'export'` for static HTML generation, deployed to IONOS shared hosting. This architecture cannot support:
- Server-side search or filtering
- User accounts or saved preferences
- Real-time price alerts
- API endpoints for mobile apps

This is not a bug — it's a deliberate architectural choice that works well for the current feature set. However, it should be documented as a known limitation for future planning.

---

#### INFO-02: Catalog JSON Serves as Both Database and API

The `strainscout_catalog_v10.min.json` file serves as the entire backend — there is no database, no API, no server. This is elegant for simplicity but creates a coupling where every frontend feature must work with the data shape defined by `build_catalog.py`. Adding a new field requires a pipeline change, a rebuild, and a redeploy.

---

#### INFO-03: Manus JSONs Directory Contains AI-Generated Reference Data

The `Manus JSONs/` directory contains Leafly lookup data, dispensary benchmarks, and grower benchmarks that appear to have been generated by an AI assistant. These files are committed to the repository and serve as the enrichment source for the pipeline. There is no documentation of how these files were generated, their accuracy, or when they should be refreshed.

---

## Summary of Recommendations (Priority Order)

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1 | CRITICAL-07: Add pipeline unit tests | Medium | Prevents data corruption |
| 2 | CRITICAL-05: Remove hardcoded SFTP credentials | Low | Eliminates security risk |
| 3 | CRITICAL-06: Fix CSP policy | Low | Restores XSS protection |
| 4 | CRITICAL-02: Add schema validation to pipeline | Medium | Prevents silent failures |
| 5 | CRITICAL-04: Implement catalog pagination/splitting | High | Enables scaling |
| 6 | CRITICAL-01: Add retry logic to scrapers | Medium | Improves data completeness |
| 7 | HIGH-11: Create requirements.txt | Low | Enables reproducibility |
| 8 | HIGH-05: Externalize ordering links to config | Low | Separates data from code |
| 9 | HIGH-04: Fix version mismatch | Low | Reduces confusion |
| 10 | HIGH-01: Isolate browser contexts | Medium | Prevents scraper cascading failures |

---

## Appendix A: Files Reviewed

| File | Lines | Category |
|------|-------|----------|
| `scraper/scrape_weedmaps.py` | 707 | Scraper |
| `scraper/scrape_dutchie.py` | ~600 | Scraper |
| `scraper/scrape_sweedpos.py` | ~200 | Scraper |
| `scraper/targets.py` | ~150 | Configuration |
| `pipeline/parse_raw.py` | ~300 | Pipeline |
| `pipeline/enrich_leafly.py` | 337 | Pipeline |
| `pipeline/deduplicate.py` | ~400 | Pipeline |
| `pipeline/reconcile.py` | 175 | Pipeline |
| `pipeline/build_catalog.py` | 344 | Pipeline |
| `publish/upload_ionos.py` | 448 | Deployment |
| `publish/generate_sitemap.py` | ~100 | Deployment |
| `run_all.py` | ~150 | Orchestration |
| `web_2/src/hooks/useCatalog.ts` | 313 | Frontend Core |
| `web_2/src/app/layout.tsx` | 103 | Frontend Layout |
| `web_2/src/app/page.tsx` | ~400 | Frontend Page |
| `web_2/src/app/compare/page.tsx` | ~1050 | Frontend Page |
| `web_2/src/app/cheapest/page.tsx` | ~620 | Frontend Page |
| `web_2/src/app/deals/page.tsx` | ~400 | Frontend Page |
| `web_2/src/components/Navbar.tsx` | ~130 | Frontend Component |
| `web_2/src/components/DealCard.tsx` | ~180 | Frontend Component |
| `web_2/src/lib/utils.ts` | ~120 | Frontend Utility |
| `web_2/src/lib/analytics.ts` | 112 | Frontend Analytics |
| `web_2/package.json` | ~40 | Configuration |
| `.gitignore` | ~30 | Configuration |

---

## Appendix B: Standards Referenced

| Standard | Application |
|----------|-------------|
| ISO/IEC 25010:2023 | Software quality model — Functional Suitability, Reliability, Security, Maintainability, Performance Efficiency |
| OWASP Top 10 (2021) | Security audit — A01 Broken Access Control, A03 Injection, A05 Security Misconfiguration |
| WCAG 2.1 AA | Accessibility evaluation — Perceivable, Operable, Understandable, Robust |
| IEEE 829 | Test documentation standard — referenced for test plan recommendations |
| Web Scraping Data Quality Framework | 15-dimension model — Accuracy, Completeness, Timeliness, Consistency, Validity |

---

*End of Report*
