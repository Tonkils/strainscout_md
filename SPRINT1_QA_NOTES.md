# Sprint 1 QA Notes — Manual Spot Check

**Sprint:** April 1–5, 2026  
**Reviewer:** Jaret Wyatt  
**Catalog version:** strainscout_catalog_v10  
**Scope:** Manual verification of catalog entries against 5 live dispensary menus

---

## Spot Check Findings

### Finding 1 — Price Misread: Rainbow Sundae Pre-Packaged @ Far & Dotter

**Severity:** High  
**Entry:** `rainbow-sundae-pre-packaged`  
**Dispensary:** Far & Dotter - Elkton  

| | Catalog | Live Menu |
|--|---------|-----------|
| Price | $222.00 | $100.00 |

**Root cause:** The scraper looks for 1/8 oz pricing tiers. $222 passes the `5 ≤ price ≤ 500` validation range, but it's almost certainly an **ounce price that was misread as an eighth** — or a bundle/multi-pack price that got picked up instead of the per-unit eighth price. The correct eighth price is $100.

**Action items:**
- [x] Audit `scraper/scrape_weedmaps.py` price-tier selection logic to ensure the 1/8 oz tier is being selected and not the 1 oz tier
- [x] Add a soft warning in `pipeline/parse_raw.py` for eighth prices above $100 (flag for manual review, don't discard)
- [ ] Re-scrape Far & Dotter and verify corrected price appears in next catalog build

---

### Finding 2 — Bad Leafly URL Slug: Rainbow Sundae Pre-Packaged

**Severity:** Medium  
**Entry:** `rainbow-sundae-pre-packaged`  
**Generated URL:** `https://www.leafly.com/strains/rainbow-sundae-pre-packaged`  

The Leafly URL is algorithmically generated from the product name, which includes "Pre-Packaged" — a format descriptor, not part of the strain name. The correct Leafly slug (if the strain exists) would be `/strains/rainbow-sundae`. This URL is almost certainly a 404.

**Root cause:** `pipeline/enrich_leafly.py` runs `extract_pure_name()` before generating the slug, but "Pre-Packaged" is not in the format-word strip list, so it survives into the slug.

**Action items:**
- [x] Add `Pre-?Packaged?` to the format-word strip list in `extract_pure_name()` in `enrich_leafly.py`
- [x] Add `Pre-?Packaged?` to the strip patterns in `clean_product_name()` in `parse_raw.py` as well
- [ ] Consider a one-time HEAD-request sweep to validate all generated Leafly URLs and null out 404s (QA audit CRITICAL-07 recommendation)

---

### Finding 3 — Missing Ordering Link: Far & Dotter - Elkton

**Severity:** Low  
**Dispensary:** Far & Dotter - Elkton  
**Current state:** `ordering_links: {}` in catalog entry — no menu URL available

Far & Dotter - Elkton is not present in `data/config/ordering_links.json` or `Manus JSONs/scraping_targets.json`, so the catalog has no "Order Here" link for this dispensary.

**Action items:**
- [x] Look up Far & Dotter - Elkton's ordering platform (Weedmaps, Dutchie, or direct site) and add to `data/config/ordering_links.json` — **already present** (`fardotter.com/dispensaries/elkton-md/`); will appear in catalog on next rebuild
- [ ] Verify whether Far & Dotter has other locations (e.g., Silver Spring) that are also missing links

---

## Summary Table

| # | Finding | Severity | File / Config | Status |
|---|---------|----------|---------------|--------|
| 1 | $222 ounce price misread as eighth (Rainbow Sundae @ Far & Dotter) | High | `scraper/scrape_weedmaps.py`, `pipeline/parse_raw.py` | **Fixed** |
| 2 | Leafly URL includes "Pre-Packaged" — likely 404 | Medium | `pipeline/enrich_leafly.py`, `pipeline/parse_raw.py` | **Fixed** |
| 3 | Far & Dotter - Elkton missing from ordering_links config | Low | `data/config/ordering_links.json` | **Already in config** |

---

## General Observations from Sprint 1 Automated Audit

These were identified during the Sprint 1 code audit (not live menu checks) and are documented here for traceability:

- **56.4% of strains (731/1,297) default to `type: "Hybrid"** with 0.33 confidence — no Leafly match and no keyword pattern match. Improving Leafly coverage is the highest-impact type accuracy improvement possible.
- **`type_source` field** was absent from the catalog before Sprint 1. Now present after pipeline rebuild: values are `"leafly"` / `"weedmaps"` / `"name_pattern"` / `"default"`.
- **85 type conflicts** existed where Weedmaps listing type disagreed with Leafly ground truth. Fixed in Sprint 1 by making Leafly always override platform-sourced types.
- **Price data is from March 9, 2026** (original Manus scrape). All prices should be considered stale until a fresh scrape is run.

---

## Next Steps for Spot Check (remaining 4 of 5 menus)

- [ ] Check Culta (Baltimore) — high-volume dispensary, good test for Weedmaps API scraper
- [ ] Check Curaleaf (Reisterstown) — Curaleaf scraper was recently updated, verify product names parse cleanly
- [ ] Check Zen Leaf (Germantown) — Sweed platform, verify price tiers
- [ ] Check Nature's Heritage (Frederick) — Dutchie white-label, verify category assignments

---

*Last updated: 2026-04-03*
