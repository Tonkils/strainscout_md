# StrainScout MD — Data Pipeline Handoff for Claude

**Purpose:** This document gives Claude (or any AI agent) everything needed to understand, reproduce, and improve the StrainScout MD data pipeline. It covers the complete data lineage from raw scraping to the production catalog, with every script, every intermediate file, and every known limitation documented.

---

## Executive Summary

StrainScout MD is a Maryland cannabis price comparison platform. The data pipeline scraped dispensary menus across Weedmaps, Dutchie, iHeartJane, and direct dispensary websites, then enriched the data with Leafly strain profiles, reconciled it across sources, and produced a production catalog of **2,220 unique strains** across **100 verified dispensaries**.

The pipeline ran as a one-time batch process on **March 9-14, 2026**. All scripts still exist on the Manus server at `/home/ubuntu/`. The core ones needed to rebuild or automate the pipeline are documented below.

---

## Pipeline Architecture (Execution Order)

The pipeline has 8 stages. Each stage reads from the previous stage's output and produces a new file. Here is the exact execution order:

| Stage | Script | Input | Output | Records |
|-------|--------|-------|--------|---------|
| 1 | `build_scraping_targets.py` | `md_cannabis_data/md_registry.json` | `md_cannabis_data/scraping_targets.json` | 66 targets |
| 2 | *Parallel subtasks (Manus `map` tool)* | `scraping_targets.json` | `md_cannabis_data/md_flower_products_full.json` | 11,115 products |
| 3 | `build_strain_catalog_v2.py` | `md_flower_products_full.json` | `md_cannabis_data/strain_catalog_v2.json` | ~1,800 unique strains |
| 4a | `parse_weedmaps_data.py` | `scrape_weedmaps_menus.json` | `weedmaps_strain_data.json` | 898 records |
| 4b | `parse_dispensary_data.py` | `scrape_dispensary_websites.json` | `dispensary_website_strain_data.json` | 532 records |
| 5 | `accuracy_assurance_method.py` | `strain_catalog.json` + `weedmaps_strain_data.json` + `dispensary_website_strain_data.json` | `reconciled_strains.json` | 2,045 strains |
| 6 | `build_final_catalog.py` | `reconciled_strains.json` + benchmarks | `strainscout_catalog.json` | First production catalog |
| 7 | `comprehensive_reconcile.py` | `strainscout_catalog_final.json` + Leafly data + new scrape data | `strainscout_catalog_v3.json` | Enriched catalog |
| 8 | `dedup_catalog.py` | `strainscout_catalog_v3.json` | `strainscout_catalog_v4.json` | Deduplicated catalog |
| 9 | *Manual v5-v7 iterations* | Various fixes, ordering links | `strainscout_catalog_v7_ordering.json` | 2,220 strains |
| 10 | `build_catalog_v8.py` | `strainscout_catalog_v7_ordering.json` | `strainscout_catalog_v8.json` | 2,220 strains (final) |

---

## The Four Core Scripts

These are the foundation of the owned pipeline. Each is fully self-contained Python 3 with no external dependencies beyond the standard library.

---

### 1. `build_scraping_targets.py`

**What it does:** Maps the 102 MCA-licensed dispensaries to their online menu platform URLs (Weedmaps, Dutchie, iHeartJane). Produces a JSON file of 66 dispensaries with confirmed menu URLs that the scraping subtasks can visit.

**Input:** `md_cannabis_data/md_registry.json` (MCA registry of all licensed dispensaries)

**Output:** `md_cannabis_data/scraping_targets.json` (66 dispensary targets with platform slugs and full URLs)

**How it works:**
1. Loads the MCA registry (102 dispensaries, 20 growers, 26 processors)
2. Contains a manually curated mapping of dispensary names to their Weedmaps/Dutchie/iHeartJane slugs (this was built by searching each dispensary on each platform)
3. Generates full URLs from the slugs (e.g., `weedmaps` slug `"culta"` becomes `https://weedmaps.com/dispensaries/culta`)
4. Saves the target list for downstream scraping

**Key limitation:** The slug mappings are hardcoded. When dispensaries change their platform presence (new Weedmaps listing, switch to Dutchie, etc.), this file must be manually updated. An improved version would auto-discover platform presence.

**What to improve:**
- Auto-discover Weedmaps/Dutchie/iHeartJane presence by searching each dispensary name on each platform
- Add the remaining 36 dispensaries that were not mapped (they may have added online menus since March 2026)
- Add support for new platforms (e.g., Jane Technologies acquired iHeartJane)

---

### 2. `parse_weedmaps_data.py`

**What it does:** Takes the raw Weedmaps scraping output (semicolon-delimited text blobs from parallel subtasks) and parses it into structured JSON records with strain name, brand, price, weight, THC%, and dispensary.

**Input:** `scrape_weedmaps_menus.json` (raw parallel subtask output — each result contains a `strains_data` field with semicolon-separated records)

**Output:** `weedmaps_strain_data.json` (898 structured records) + `weedmaps_strain_data.csv`

**How it works:**
1. Iterates through each dispensary's scraping result
2. Splits the `strains_data` string by semicolons to get individual product entries
3. Splits each entry by commas to extract fields: `strain_name, brand, price, weight, thc_pct, category`
4. Cleans strain names (removes weight suffixes like "3.5g", format words like "Flower", brand prefixes like "RYTHM -")
5. Deduplicates by (dispensary, strain_name) pair
6. Saves structured JSON and CSV

**Key limitation:** The parsing relies on the semicolon/comma format that the Manus parallel subtasks used to return data. This format is lossy — commas in strain names or brand names can cause field misalignment. A better approach would use JSON output from the scraping subtasks.

**What to improve:**
- Have scraping subtasks return JSON instead of semicolon-delimited text
- Add validation for price ranges (currently accepts any number 1-500)
- Add strain name normalization to catch more duplicates (e.g., "Blue Dream" vs "BLUE DREAM" vs "Blue Dream Flower")

**Companion script:** `parse_dispensary_data.py` does the same thing for direct dispensary website scraping results. Same format, same parsing logic.

---

### 3. `accuracy_assurance_method.py`

**What it does:** The core reconciliation engine. Takes three data sources (original catalog, Weedmaps data, dispensary website data) and reconciles them into a single verified record per strain using a 5-layer accuracy assurance method.

**Input:**
- `strain_catalog.json` (original catalog from Stage 3)
- `weedmaps_strain_data.json` (from Stage 4a)
- `dispensary_website_strain_data.json` (from Stage 4b)
- `grower_benchmark.json` (MCA grower-to-brand mappings)
- `dispensary_benchmark.json` (verified dispensary data)

**Output:**
- `reconciled_strains.json` (strains that passed with A/B confidence)
- `flagged_strains.json` (strains with C/F confidence needing review)

**The 5 Layers:**

**Layer 1 — Strain Name Normalization:** Normalizes strain names by removing parenthetical content, weight suffixes, format words, special characters, and extra whitespace. Uses `SequenceMatcher` with a 0.85 threshold for fuzzy matching.

**Layer 2 — Brand/Grower Resolution:** Maps consumer brand names (e.g., "Curio", "RYTHM") to their MCA-licensed legal entities using the grower benchmark. Includes a manually curated alias table (e.g., "curio wellness™" → "curio wellness"). Falls back to fuzzy matching at 0.8 threshold. Assigns confidence: A (exact match), B (fuzzy match), C (no match found).

**Layer 3 — Price Triangulation:** Reconciles prices from up to 3 sources with freshness weighting (dispensary website > Weedmaps > catalog). If 2+ sources agree within $3, confidence is A. If sources disagree, uses the freshest source with confidence C. Sanity checks: $1 < price < $500.

**Layer 4 — Profile Verification:** Reconciles THC% across sources. If 2+ sources agree within 5% absolute, uses the average with confidence A. Large disagreements use the median with confidence C. Sanity check: 0% < THC < 50%.

**Layer 5 — Confidence Scoring:** Calculates an overall grade from individual field grades using a weighted average. A (≥85%), B (≥65%), C (≥45%), F (<45%). Only A/B strains go to `reconciled_strains.json`; C/F go to `flagged_strains.json`.

**Key limitation:** The fuzzy matching threshold (0.85) is a magic number. Too low and you get false matches; too high and you miss real matches. The brand alias table is manually curated and incomplete. Price triangulation assumes all prices are for the same weight (3.5g eighth), but some sources report different weights.

**What to improve:**
- Use a proper string similarity library (e.g., `rapidfuzz`) instead of `SequenceMatcher`
- Normalize prices to a standard weight before comparison
- Add a "human review queue" for C-confidence strains instead of just flagging them
- Add temporal decay to price confidence (prices from 2 weeks ago should be less trusted than yesterday's)

---

### 4. `comprehensive_reconcile.py`

**What it does:** The enrichment and merge engine. Takes the reconciled catalog and enriches it with Leafly data (effects, flavors, terpenes, genetics, descriptions), integrates new strains from a second scraping round, generates Leafly/Weedmaps URLs, and re-grades everything.

**Input:**
- `strainscout_catalog_final.json` (post-reconciliation catalog)
- `leafly_comprehensive_scrape.json` (1,142 Leafly lookups, 611 found)
- `leafly_untyped_lookup.json` (533 Leafly lookups, 121 found)
- `untyped_already_matched.json` (42 previously matched strains)
- `new_strains_from_scrape.json` (642 new strains from second scraping round)
- `dispensary_benchmark.json` (for dispensary website URLs)

**Output:** `strainscout_catalog_v3.json` (enriched catalog with all data merged)

**The 6 Steps:**

**Step 1 — Apply Leafly Data:** Matches catalog strains to Leafly entries using multiple name variations (exact match, cleaned name, first two words, cross parent extraction). Fills in: type (Indica/Sativa/Hybrid), terpenes, effects, flavors, description, genetics, Leafly URL.

**Step 2 — Name-Pattern Type Inference:** For strains still missing a type after Leafly matching, uses regex patterns to infer type from the strain name. Contains curated pattern lists for Indica keywords (kush, OG, purple, bubba...), Sativa keywords (haze, jack, durban, tangie...), and Hybrid keywords (gelato, runtz, cookies, zkittlez...). Falls back to "Hybrid" with 0.33 confidence when no patterns match.

**Step 3 — Generate Links:** Generates Leafly URLs by converting strain names to URL slugs (`Blue Dream` → `https://www.leafly.com/strains/blue-dream`). Generates Weedmaps search URLs. Maps dispensary names to their website URLs from the benchmark.

**Step 4 — Integrate New Strains:** Adds 642 new strains from the second scraping round, deduplicating against existing catalog entries by both raw name and cleaned name. Attempts Leafly enrichment for each new strain.

**Step 5 — Re-Grade All Strains:** Assigns A/B/C grades based on a 10-point scoring system: type (+2), THC (+1), terpenes (+2), effects (+1), description (+1), genetics (+1), prices (+1), brand (+1). Grade A ≥ 7 points, B ≥ 4, C < 4.

**Step 6 — Save:** Writes full and minified JSON catalogs.

**Key limitation:** The Leafly URL generation is algorithmic — it converts strain names to slugs without verifying the URLs actually exist. This means ~59% of Leafly URLs and ~65% of Weedmaps URLs may lead to 404 pages. The name-pattern type inference defaults 76.6% of unmatched strains to "Hybrid" — this is effectively fabricated data.

**What to improve:**
- Verify generated URLs actually resolve (HEAD request check)
- Use Leafly's search API instead of slug generation for better matching
- Replace the regex-based type inference with a Leafly/Weedmaps lookup (the strain type should come from an authoritative source, not a keyword heuristic)
- Add a `type_verified: boolean` field so the UI can distinguish between verified and inferred types

---

## Supporting Scripts

These scripts handle intermediate transformations:

| Script | Purpose |
|--------|---------|
| `build_strain_catalog_v2.py` | Deduplicates the 11,115 raw products into ~1,800 unique strains by grouping on cleaned strain name and aggregating prices/THC/dispensaries |
| `build_final_catalog.py` | Transforms reconciled data into the first production catalog format with slugs, IDs, dispensary lookups, and price statistics |
| `dedup_catalog.py` | Fuzzy-match deduplication of the v3 catalog — groups by canonical name (stripped of brands/sizes/formats), picks the highest-quality entry per group, merges all prices/dispensaries/enrichment data |
| `build_catalog_v8.py` | Adds `last_verified` timestamps to every price entry (all set to 2026-03-09 since that's when scraping ran) and `catalog_version` metadata |

---

## Data Files on Disk

All files are at `/home/ubuntu/` unless otherwise noted.

### Reference Data (Ground Truth)

| File | Records | Description |
|------|---------|-------------|
| `md_cannabis_data/md_registry.json` | 102 dispensaries, 20 growers, 26 processors | MCA official registry |
| `dispensary_benchmark.json` | 100 dispensaries | Verified with MCA + Google Maps |
| `dispensary_benchmark_geocoded.json` | 100 dispensaries | Same + lat/lng coordinates |
| `grower_benchmark.json` | 20 growers | Legal entity → brand mappings |

### Raw Scraping Results

| File | Records | Description |
|------|---------|-------------|
| `md_cannabis_data/md_flower_products_full.json` | 11,115 | Primary parallel scrape of 61 dispensary menus |
| `scrape_weedmaps_menus.json` | 100 results | Raw Weedmaps parallel subtask output |
| `scrape_dispensary_websites.json` | 40 results | Raw dispensary website parallel subtask output |
| `scrape_dispensary_menus.json` | 100 results | Combined menu scraping results |

### Parsed Scraping Data

| File | Records | Description |
|------|---------|-------------|
| `weedmaps_strain_data.json` | 898 | Parsed from `scrape_weedmaps_menus.json` |
| `dispensary_website_strain_data.json` | 532 | Parsed from `scrape_dispensary_websites.json` |

### Enrichment Data

| File | Records | Description |
|------|---------|-------------|
| `leafly_comprehensive_scrape.json` | 1,142 lookups (611 found) | First Leafly enrichment round |
| `leafly_untyped_lookup.json` | 533 lookups (121 found) | Second Leafly round for untyped strains |

### Intermediate Catalogs

| File | Records | Description |
|------|---------|-------------|
| `md_cannabis_data/strain_catalog_v2.json` | ~1,800 | Deduplicated from 11K products |
| `reconciled_strains.json` | 2,045 | After 5-layer reconciliation |
| `new_strains_from_scrape.json` | 642 | New strains from second scraping round |
| `strainscout_catalog_v3.json` | ~2,400 | After Leafly enrichment + new strains |
| `strainscout_catalog_v4.json` | ~2,220 | After deduplication |

### Production Catalog

| File | Records | Description |
|------|---------|-------------|
| `strainscout_catalog_v8.json` | 2,220 | Final production catalog with timestamps |
| `strainscout_catalog_v8.min.json` | 2,220 | Minified version for CDN delivery |

---

## Honest Data Quality Assessment

### What is genuinely scraped (not fabricated)

All 2,220 strain names came from real dispensary menus — they were observed on Weedmaps, Dutchie, iHeartJane, or direct dispensary websites during the March 9, 2026 scraping run. No strain names were invented.

All 100 dispensaries are real Maryland businesses verified against the MCA registry and confirmed via Google Maps (addresses, phone numbers, ratings).

All prices were scraped from live menus. THC percentages (82% coverage) came from lab-tested values displayed on menus.

Effects, flavors, terpenes, and descriptions for 732 strains came from Leafly's public strain pages — these are Leafly's curated data, not fabricated.

### What is synthetic, defaulted, or algorithmically generated

**Strain type classification (76.6% defaulted):** Only 519 of 2,220 strains have a Leafly-verified type. The remaining 1,701 were classified using regex keyword matching on strain names (e.g., "kush" → Indica, "haze" → Sativa). When no keywords matched, the strain was defaulted to "Hybrid." This means **76.6% of type classifications are not from an authoritative source.**

**Leafly URLs (58.8% unverified):** 914 strains have Leafly URLs that were generated by converting the strain name to a URL slug. These URLs were never verified — many likely return 404 pages.

**Weedmaps URLs (64.5% unverified):** Same approach — search URLs generated from strain names without verification.

**507 strains (22.8%) have zero external verification:** No prices, no Leafly match, no Weedmaps confirmation. They exist only because they appeared on a dispensary menu during scraping. Their brand, THC, and type data comes solely from the menu listing.

**All prices are a single-day snapshot:** Every price was scraped on March 9, 2026. Cannabis prices change frequently (daily specials, inventory changes). By the time you read this, most prices are stale.

### Data quality by grade

| Grade | Count | % | Meaning |
|-------|-------|---|---------|
| A | 345 | 15.5% | Multi-source verified, Leafly enriched, prices confirmed |
| B | 1,217 | 54.8% | Single-source verified with some enrichment |
| C | 658 | 29.6% | Minimal data, unverified type, no prices or enrichment |

---

## Recommendations for Next Iteration

### Priority 1: Automated Price Refresh

The single most valuable improvement. Prices go stale within days. Build a scheduled scraping pipeline that re-visits dispensary menus weekly and updates the catalog. The `build_scraping_targets.py` script already has the URL list — wrap it in a cron job with the parsing scripts.

### Priority 2: Fix Strain Type Classification

Re-run Leafly lookups with cleaned strain names (the `extract_pure_name()` function in `comprehensive_reconcile.py` is good at this). Many of the 1,701 untyped strains would match if searched with cleaner names. This would reduce the 76.6% default rate significantly.

### Priority 3: Verify Generated URLs

Run HEAD requests against all generated Leafly and Weedmaps URLs. Remove or flag the ones that return 404. This is a one-time cleanup that would improve trust in the external links.

### Priority 4: Surface Data Quality to Users

Add a `data_confidence` field to the UI. Show "Verified" badges for Grade A strains and "Limited Data" warnings for Grade C. Show "Last verified: March 9, 2026" next to prices so users know the data age.

### Priority 5: Add Dispensary-Level Scraping

Instead of scraping all dispensaries in one batch, build per-dispensary scrapers that can run independently. This allows incremental updates (re-scrape one dispensary at a time) and makes the pipeline more resilient to individual dispensary website changes.

---

## How to Re-Run the Pipeline

To rebuild the catalog from scratch:

```bash
cd /home/ubuntu

# Stage 1: Build scraping targets
python3 build_scraping_targets.py

# Stage 2: Run parallel scraping (requires Manus map tool — cannot run standalone)
# This produces md_cannabis_data/md_flower_products_full.json

# Stage 3: Build initial catalog from 11K products
python3 build_strain_catalog_v2.py

# Stage 4a: Parse Weedmaps data
python3 parse_weedmaps_data.py

# Stage 4b: Parse dispensary website data
python3 parse_dispensary_data.py

# Stage 5: Reconcile across sources
python3 accuracy_assurance_method.py

# Stage 6: Build first production catalog
python3 build_final_catalog.py

# Stage 7: Enrich with Leafly + integrate new strains
python3 comprehensive_reconcile.py

# Stage 8: Deduplicate
python3 dedup_catalog.py

# Stage 9: Add timestamps (after manual v5-v7 fixes)
python3 build_catalog_v8.py
```

**Important:** Stage 2 (parallel scraping) requires the Manus `map` tool to dispatch 66+ browser-based subtasks. This cannot be run as a standalone Python script. To automate this, you would need to replace it with a proper scraping framework (Playwright, Puppeteer, or Scrapy) that can visit each dispensary URL and extract the flower menu.

---

*Document generated: March 22, 2026*
*Author: Manus AI*
*All scripts and data files are at `/home/ubuntu/` on the Manus server*
