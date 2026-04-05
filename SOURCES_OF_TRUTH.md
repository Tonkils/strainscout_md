# StrainScout MD — Sources of Truth

**Last updated:** 2026-04-05 | **Sprint:** 14+

## Authoritative Data Sources (ranked by authority)

### 1. Strain List — `data/output/strainscout_strains_v1.json`
- **What:** 1,161 unique cannabis strain records with genetics, terpenes, effects, flavors, descriptions
- **Authority for:** Strain identity, strain type (Indica/Sativa/Hybrid), genetics lineage, terpene profiles, effects, flavors
- **Primary enrichment source:** Leafly (see below)
- **NOT a source for:** Prices, availability, dispensary data

### 2. Product List — `data/output/strainscout_products_v1.json`
- **What:** 1,297 dispensary menu products with prices, availability, and `strain_id` linking to strain list
- **Authority for:** Product names, prices, dispensary availability, product categories (Flower/Vape/Concentrate/Pre-Roll/Edible/Topical)
- **Built from:** Dispensary menu scrapes (Dutchie, Jane, Trulieve, Curaleaf, SweedPOS platforms)
- **NOT a source for:** Strain properties (genetics, terpenes, effects) — those come from the Strain List

### 3. Dispensary List — `Manus JSONs/dispensary_benchmark_geocoded.json`
- **What:** ~100 verified Maryland dispensaries with addresses, geocoding, phone, website, ratings
- **Authority for:** Dispensary identity, locations, contact info, operational status
- **Verification:** MCA (Maryland Cannabis Administration) registry + Google Maps cross-verification

### 4. Leafly — Strain enrichment source
- **What:** External reference database for cannabis strain properties
- **Authority for:** Strain type classification, genetics, terpenes, effects, flavors, descriptions
- **Local cache:** `Manus JSONs/leafly_comprehensive_scrape.json` (1,142 lookups, 611 found)
- **Supplemented by:** Web research for strains not in Leafly cache

## NOT a Source of Truth

### Weedmaps
- **Role:** Weedmaps is a **scraping target** for dispensary menu data (product names, prices, availability), NOT an authoritative source for strain properties
- **What we use from Weedmaps:** Product listings, prices, dispensary menu structure, product categories
- **What we do NOT trust from Weedmaps:** Strain type, genetics, terpene profiles, effects — these are user-submitted on Weedmaps and frequently inaccurate
- **Weedmaps URLs:** Retained in catalog as convenience links for users, not as data authority

## Data Flow

```
Dispensary Menus (Dutchie, Jane, Trulieve, Curaleaf, SweedPOS)
        │
        ▼
   parse_raw.py ──→ Product records (name, price, dispensary, category)
        │
        ▼
   deduplicate.py ──→ Merged product records
        │
        ▼
   enrich_leafly.py ──→ Strain properties from Leafly
        │
        ▼
   build_catalog.py ──→ Final catalog
        │
        ▼
   ┌─────────────────────────────┐
   │  Strain List (strains_v1)   │◄── Leafly + web research
   │  Product List (products_v1) │◄── Dispensary scrapes
   │  Dispensary List (benchmark) │◄── MCA + Google Maps
   └─────────────────────────────┘
```

## Source Priority for Strain Type Classification

| Priority | Source | Confidence |
|----------|--------|------------|
| 1 (highest) | Leafly verified page | High |
| 2 | Strain list (strains_v1.json) | High |
| 3 | Dispensary menu data (Dutchie/Jane) | Medium |
| 4 | Name pattern inference | Low |
| 5 | Default "Hybrid" | Fallback |

## Source Priority for Product Category

| Priority | Source | Confidence |
|----------|--------|------------|
| 1 (highest) | Dutchie `type` field | High (platform-authoritative) |
| 2 | Jane `kind` field | High |
| 3 | Trulieve/Curaleaf URL path | High |
| 4 | Product name inference (`_infer_category_from_name`) | Medium |
| 5 | Default "Flower" | Fallback |

## Source Priority for Prices

| Priority | Source | Confidence |
|----------|--------|------------|
| 1 (highest) | Partner-verified prices (dispensary partners) | Verified |
| 2 | Dispensary platform scrapes (freshest) | Scraped |
| 3 | Historical catalog values | Stale |
