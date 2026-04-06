#!/usr/bin/env python3
"""
Pipeline Step 4: Build the final production catalog JSON.

Assembles deduped strains + dispensary benchmark + grower benchmark into
the format expected by the StrainScout MD web app (CatalogStrain interface).

Input:  data/processed/deduped_strains.json
Output: data/output/strainscout_catalog_v10.json
        data/output/strainscout_catalog_v10.min.json
"""

import json
import re
import os
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter

BASE = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE / "data" / "processed"
OUTPUT_DIR = BASE / "data" / "output"
MANUS_DIR = BASE / "Manus JSONs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

INPUT = PROCESSED_DIR / "deduped_strains.json"
OUTPUT_FULL = OUTPUT_DIR / "strainscout_catalog_v10.json"
OUTPUT_MIN = OUTPUT_DIR / "strainscout_catalog_v10.min.json"

CATALOG_VERSION = "v10"


def load_dispensary_benchmark() -> dict:
    """Load geocoded dispensary benchmark → lowercase name lookup."""
    path = MANUS_DIR / "dispensary_benchmark_geocoded.json"
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    lookup = {}
    for d in data:
        name = d.get("canonical_name", "").strip()
        if name:
            lookup[name.lower()] = {
                "name": name,
                "address": d.get("full_address", ""),
                "city": d.get("city", ""),
                "lat": d.get("lat", 0),
                "lng": d.get("lng", 0),
                "brand": d.get("brand_parent", ""),
                "phone": d.get("phone", ""),
                "website": d.get("website", ""),
                "rating": d.get("google_rating", ""),
            }
    return lookup


def load_ordering_links() -> dict:
    """Build dispensary name → ordering URL mapping from all available sources."""
    ordering = {}

    # 1. Scraping targets (confirmed Weedmaps/Dutchie slugs)
    targets_path = MANUS_DIR / "scraping_targets.json"
    if targets_path.exists():
        with open(targets_path, encoding="utf-8") as f:
            targets = json.load(f)
        for t in targets:
            name = t.get("name", "").lower().strip()
            wm = t.get("weedmaps", "")
            du = t.get("dutchie", "")
            if wm:
                ordering[name] = f"https://weedmaps.com/dispensaries/{wm}/menu"
            if du:
                ordering[name] = f"https://dutchie.com/dispensary/{du}"

    # 2. Static ordering links from config file (white-label + chain-specific URLs)
    config_path = BASE / "data" / "config" / "ordering_links.json"
    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            static_links = json.load(f)
        for name, url in static_links.items():
            if not name.startswith("_"):  # skip comment keys
                ordering[name] = url

    return ordering


def load_grower_benchmark() -> dict:
    """Load grower benchmark for brand resolution."""
    path = MANUS_DIR / "grower_benchmark.json"
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    lookup = {}
    for g in data:
        primary = g.get("primary_brand", "").strip()
        if primary:
            lookup[primary.lower()] = {
                "legal_name": g.get("legal_name", ""),
                "primary_brand": primary,
                "sub_brands": g.get("sub_brands", ""),
            }
    return lookup


def main():
    now = datetime.now(timezone.utc).isoformat()
    scrape_date = now  # all prices from this scrape run

    print("=" * 70)
    print("PIPELINE STEP 4: BUILD PRODUCTION CATALOG")
    print("=" * 70)

    with open(INPUT, encoding="utf-8") as f:
        data = json.load(f)
    strains = data["strains"]
    print(f"Input: {len(strains)} deduped strains")

    disp_lookup = load_dispensary_benchmark()
    ordering_lookup = load_ordering_links()
    print(f"Dispensary benchmark: {len(disp_lookup)} entries")
    print(f"Ordering links: {len(ordering_lookup)} dispensary menu URLs")

    # Build the catalog array matching CatalogStrain interface
    catalog = []
    disp_set = set()
    brand_set = set()

    for s in strains:
        # Add verification timestamps to each price entry
        prices = []
        for p in s.get("prices", []):
            prices.append({
                "dispensary": p["dispensary"],
                "price": p["price"],
                "source": p.get("source", "weedmaps"),
                "last_verified": scrape_date,
                "verified_source": "automated_scrape",
            })

        # Resolve dispensary website links AND ordering links
        dispensary_links = dict(s.get("dispensary_links", {}))
        ordering_links = {}
        for disp_name in s.get("dispensaries", []):
            dl = disp_name.lower().strip()
            # Website links (for "Visit Store" buttons)
            if dl in disp_lookup and disp_name not in dispensary_links:
                website = disp_lookup[dl].get("website", "")
                if website:
                    dispensary_links[disp_name] = website
            # Ordering links (for "Order Here" buttons — direct menu URLs)
            # Try exact match first, then fuzzy prefix match
            if dl in ordering_lookup:
                ordering_links[disp_name] = ordering_lookup[dl]
            else:
                # Fuzzy match: "culta columbia" should match "culta" ordering link
                for okey, ourl in ordering_lookup.items():
                    if dl.startswith(okey) or okey.startswith(dl):
                        ordering_links[disp_name] = ourl
                        break
            disp_set.add(disp_name)

        brand = s.get("brand", "")
        if brand:
            brand_set.add(brand)

        # Build Weedmaps search URL if not set
        weedmaps_url = s.get("weedmaps_url", "")
        if not weedmaps_url:
            slug = re.sub(r"[^a-zA-Z0-9\s]", "", s["name"]).strip()
            slug = re.sub(r"\s+", "+", slug)
            if slug:
                weedmaps_url = f"https://weedmaps.com/strains?q={slug}"

        # Normalize type casing
        raw_type = (s.get("type") or "Hybrid").strip().capitalize()
        if raw_type not in ("Indica", "Sativa", "Hybrid"):
            raw_type = "Hybrid"

        entry = {
            # Core identity
            "id": s["id"],
            "name": s["name"],
            "brand": brand,
            "type": raw_type,
            "product_category": s.get("product_category", "Flower"),
            "category_confidence": s.get("category_confidence", "inferred"),

            # Lab data
            "thc": s.get("thc") or 0,
            "cbd": s.get("cbd") or 0,

            # Enrichment
            "terpenes": [t for t in s.get("terpenes", []) if t and t != "Not_Found"],
            "effects": s.get("effects", []),
            "flavors": s.get("flavors", []),
            "description": s.get("description", ""),
            "genetics": s.get("genetics", ""),

            # Quality
            "grade": s.get("grade", "C"),

            # Pricing
            "prices": prices,
            "price_min": s.get("price_min"),
            "price_max": s.get("price_max"),
            "price_avg": s.get("price_avg"),

            # Dispensary info
            "dispensaries": s.get("dispensaries", []),
            "dispensary_count": s.get("dispensary_count", 0),
            "dispensary_links": dispensary_links,
            "ordering_links": ordering_links,

            # External links
            "leafly_url": s.get("leafly_url", ""),
            "weedmaps_url": weedmaps_url,

            # Verification metadata
            "last_verified": scrape_date if prices else None,
            "verification_status": "scraped" if prices else "no_price_data",
            "catalog_version": CATALOG_VERSION,
            "catalog_updated": now,
        }

        catalog.append(entry)

    # Sort by name
    catalog.sort(key=lambda x: x["name"].lower())

    # ── Statistics ──
    print(f"\nCatalog: {len(catalog)} strains")

    grade_dist = Counter(s["grade"] for s in catalog)
    print(f"\nGrade distribution:")
    for g in ("A", "B", "C"):
        c = grade_dist.get(g, 0)
        print(f"  {g}: {c} ({100*c/len(catalog):.1f}%)")

    type_dist = Counter(s["type"] for s in catalog)
    print(f"\nType distribution:")
    for t, c in type_dist.most_common():
        print(f"  {t}: {c} ({100*c/len(catalog):.1f}%)")

    cat_dist = Counter(s.get("product_category", "Flower") for s in catalog)
    conf_dist = Counter(s.get("category_confidence", "inferred") for s in catalog)
    print(f"\nProduct category distribution:")
    for cat, c in cat_dist.most_common():
        print(f"  {cat}: {c} ({100*c/len(catalog):.1f}%)")
    print(f"Category confidence: verified={conf_dist['verified']}, inferred={conf_dist['inferred']}, conflict={conf_dist['conflict']}")

    fields = {
        "brand": lambda s: bool(s["brand"]),
        "thc": lambda s: s["thc"] and s["thc"] > 0,
        "prices": lambda s: len(s["prices"]) > 0,
        "terpenes": lambda s: len(s["terpenes"]) > 0,
        "effects": lambda s: len(s["effects"]) > 0,
        "flavors": lambda s: len(s["flavors"]) > 0,
        "description": lambda s: len(s["description"]) > 10,
        "genetics": lambda s: len(s["genetics"]) > 3,
        "leafly_url": lambda s: s["leafly_url"].startswith("http"),
        "weedmaps_url": lambda s: s["weedmaps_url"].startswith("http"),
    }
    print(f"\nField coverage:")
    for field, check in fields.items():
        c = sum(1 for s in catalog if check(s))
        print(f"  {field:20s}: {c:5d} ({100*c/len(catalog):.1f}%)")

    # Price stats
    priced = [s for s in catalog if s["price_avg"]]
    if priced:
        avgs = [s["price_avg"] for s in priced]
        print(f"\nPrice stats (eighth avg across {len(priced)} strains):")
        print(f"  Min: ${min(avgs):.2f}")
        print(f"  Max: ${max(avgs):.2f}")
        print(f"  Mean: ${sum(avgs)/len(avgs):.2f}")
        print(f"  Median: ${sorted(avgs)[len(avgs)//2]:.2f}")

    # Top brands
    brand_counts = Counter(s["brand"] for s in catalog if s["brand"])
    print(f"\nTop 15 brands:")
    for b, c in brand_counts.most_common(15):
        print(f"  {b}: {c}")

    print(f"\nUnique dispensaries: {len(disp_set)}")
    print(f"Unique brands: {len(brand_set)}")

    # ── Save ──
    # Full version (pretty-printed)
    with open(OUTPUT_FULL, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)

    # Minified version for production
    with open(OUTPUT_MIN, "w", encoding="utf-8") as f:
        json.dump(catalog, f, separators=(",", ":"), ensure_ascii=False)

    full_size = os.path.getsize(OUTPUT_FULL) / 1024
    min_size = os.path.getsize(OUTPUT_MIN) / 1024
    print(f"\nCatalog {CATALOG_VERSION} written:")
    print(f"  Full: {OUTPUT_FULL} ({full_size:.1f} KB)")
    print(f"  Min:  {OUTPUT_MIN} ({min_size:.1f} KB)")

    return catalog


if __name__ == "__main__":
    main()
