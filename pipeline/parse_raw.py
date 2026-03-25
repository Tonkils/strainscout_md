#!/usr/bin/env python3
"""
Pipeline Step 1: Parse raw Weedmaps scrape JSON files into a normalized
strain-per-dispensary list.

Input:  data/raw/weedmaps_*.json  (per-dispensary scrape files)
Output: data/processed/parsed_strains.json
"""

import json
import re
import glob
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
RAW_DIR = BASE / "data" / "raw"
PROCESSED_DIR = BASE / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT = PROCESSED_DIR / "parsed_strains.json"

# ── Brand list for stripping from product names ──────────────────────
BRANDS = [
    "nature's heritage", "natures heritage", "evermore", "verano", "rythm",
    "rhythm", "culta", "strane", "grassroots", "garcia", "garcia hand picked",
    "garcia hand-picked", "kind tree", "sunmed", "sun med", "district cannabis",
    "good green", "harvest", "cookies", "fade co.", "fade co",
    "liberty cannabis", "in-house", "curaleaf", "triple seven", "verilife",
    "purple city genetics", "select co-op", "mpx", "curio wellness", "curio",
    "holistic industries", "cresco", "columbia care", "trulieve", "gold leaf",
    "gleaf", "g leaf", "hms", "remedy", "fernway", "camp",
    "blvck mrkt", "revelry", "hana", "vireo", "zen leaf", "allegany",
    "harvest house", "redemption", "just flower", "foreign", "bmore", "local",
    "&shine", "the essence", "(the) essence", "essence", "1937", "aeriz",
    "modern flower", "savvy", "roll one", "find.", "find", "legend",
    "everyday", "exclusive", "wellness", "happy eddie", "seed & strain",
    "wildflower", "market", "house of kush", "dark heart",
    "mother exotic", "edie parker", "flower pot", "standard wellness",
    "main st. flower club", "triple 7's", "phase 3", "phas3",
    "shore natural", "growers", "grow west",
]
BRANDS.sort(key=len, reverse=True)


def clean_product_name(raw_name: str) -> str:
    """Extract the pure strain name from a Weedmaps product listing name.

    Strips brand prefixes, weight/size info, format words, and delimiters.
    Examples:
        "Alien Mints | Flower 3.5g"  →  "Alien Mints"
        "Redemption | 3.5g Prepacked Flower - Stanky Leg"  →  "Stanky Leg"
        "Gelato Cake Flower"  →  "Gelato Cake"
    """
    n = raw_name.strip()

    # ── Strip brand prefixes ──
    nl = n.lower()
    for brand in BRANDS:
        if nl.startswith(brand):
            rest = nl[len(brand):]
            if rest and rest[0] in " |-:":
                n = n[len(brand):].lstrip(" |-:")
                nl = n.lower()
                break
            elif rest == "":
                break  # entire name IS the brand

    # ── Handle pipe-separated parts: keep the part that looks like a strain name ──
    if "|" in n or " - " in n:
        parts = re.split(r'\s*[\|]\s*|\s+[-–]\s+', n)
        format_words = {
            "flower", "buds", "smalls", "shake", "pre-roll", "preroll",
            "whole", "premium", "select", "ground", "popcorn", "prepack",
            "pre-pack", "prepacked", "indica", "sativa", "hybrid", "reserve",
        }
        # Filter out parts that are just sizes/format words
        meaningful = []
        for p in parts:
            p_stripped = p.strip()
            # Skip parts that are just sizes like "3.5g" or "[3.5g]"
            if re.match(r'^[\[\(]?\d+(\.\d+)?\s*(g|oz|mg|ml)[\]\)]?$', p_stripped, re.I):
                continue
            # Skip pure format words
            if p_stripped.lower() in format_words:
                continue
            # Skip very short parts
            if len(p_stripped) < 2:
                continue
            meaningful.append(p_stripped)
        if meaningful:
            # Prefer the last meaningful part (often the strain name after brand/format)
            # But if the first part looks like a strain name (not a brand), use it
            n = meaningful[-1] if len(meaningful) > 1 else meaningful[0]

    # ── Strip size/weight suffixes ──
    n = re.sub(r'\s*[\[\(]?\d+(\.\d+)?\s*(g|oz|mg|ml|gram)s?[\]\)]?\s*$', '', n, flags=re.I)
    n = re.sub(r'\s*\d+/\d+\s*oz\s*$', '', n, flags=re.I)
    n = re.sub(r'\s*\d+\s*pk\s*$', '', n, flags=re.I)

    # ── Strip format suffixes ──
    for pat in [
        r'\s*(Smalls?|Shake|Ground|Popcorn|Mini|Minis|Whole|Full|Littles?)\s*$',
        r'\s*(Pre-?Roll|Pre-?Pack|PrePack|Prepacked?|Pre-?Ground)\s*$',
        r'\s*(Premium|Select|Reserve|Exclusive|Limited)\s*$',
        r'\s*(Flower|Buds?|Nug|Nugs|Mixed\s*Buds?)\s*$',
        r'\s*(Mixed|Trim|Kief|PRJs?)\s*$',
    ]:
        n = re.sub(pat, '', n, flags=re.I).strip()

    # ── Clean delimiters ──
    n = re.sub(r'^[\s\-|:./]+', '', n)
    n = re.sub(r'[\s\-|:./\[\]]+$', '', n)
    n = n.strip()

    return n if len(n) >= 2 else raw_name.strip()


def parse_thc(thc_raw) -> float | None:
    """Parse THC percentage string to float."""
    if not thc_raw:
        return None
    try:
        val = float(str(thc_raw).replace("%", "").strip())
        return val if 0 < val <= 100 else None
    except (ValueError, TypeError):
        return None


def parse_price(price_raw) -> float | None:
    """Parse price string to float."""
    if not price_raw:
        return None
    try:
        val = float(str(price_raw).replace("$", "").replace(",", "").strip())
        return val if 5 <= val <= 500 else None  # reasonable price range
    except (ValueError, TypeError):
        return None


def load_dispensary_names() -> dict:
    """Load the dispensary benchmark for mapping slugs → canonical names."""
    bench_path = BASE / "Manus JSONs" / "dispensary_benchmark_geocoded.json"
    if not bench_path.exists():
        return {}
    with open(bench_path, encoding="utf-8") as f:
        data = json.load(f)
    # Build slug → canonical name lookup
    lookup = {}
    for d in data:
        name = d.get("canonical_name", "")
        if name:
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            lookup[slug] = name
    return lookup


def main():
    print("=" * 70)
    print("PIPELINE STEP 1: PARSE RAW SCRAPE DATA")
    print("=" * 70)

    # Find all per-dispensary raw files across ALL platforms (exclude run summaries)
    platforms = ["weedmaps", "dutchie", "dutchie_wl", "dutchie_ascend",
                 "jane", "jane_verilife", "trulieve", "curaleaf",
                 "zenleaf", "sweedpos"]
    raw_files = []
    for platform in platforms:
        pfiles = sorted(glob.glob(str(RAW_DIR / f"{platform}_*.json")))
        pfiles = [f for f in pfiles if "run_" not in os.path.basename(f)]
        raw_files.extend(pfiles)
        if pfiles:
            print(f"  {platform}: {len(pfiles)} files")

    if not raw_files:
        print("ERROR: No raw scrape files found in", RAW_DIR)
        sys.exit(1)

    print(f"Found {len(raw_files)} total raw dispensary files")

    disp_name_lookup = load_dispensary_names()
    all_records = []
    parse_errors = []

    for fpath in raw_files:
        try:
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            parse_errors.append({"file": fpath, "error": str(e)})
            continue

        slug = data.get("slug", "")
        disp_display = data.get("name", slug)
        scraped_at = data.get("scraped_at", "")
        platform = data.get("platform", "weedmaps")
        source_url = data.get("url", "")
        products = data.get("products", [])

        if not products:
            continue

        for prod in products:
            raw_name = prod.get("name", "")
            if not raw_name:
                continue

            clean_name = clean_product_name(raw_name)
            if not clean_name or len(clean_name) < 2:
                continue

            # ── Determine product category (trust platform label over name guessing) ──
            from scraper.category_map import normalize_category
            raw_cat = prod.get("product_category") or prod.get("product_type") or ""
            product_category = normalize_category(raw_cat, platform) if raw_cat else "Flower"

            # ── Filter out price-as-name entries ──
            if clean_name.startswith("$") or clean_name.replace(".", "").replace(",", "").isdigit():
                continue

            # ── Strip remaining weight prefixes/suffixes ──
            clean_name = re.sub(r'^\d+(\.\d+)?\s*[gG]\s+', '', clean_name)  # "3.5g Melonade" → "Melonade"
            clean_name = re.sub(r'\s*\[\d+(\.\d+)?[gG]?\]?\s*$', '', clean_name)  # "Alien Breath [3.5g" → "Alien Breath"
            clean_name = re.sub(r'\s*\d+(\.\d+)?\s*[gG]\s*$', '', clean_name)  # trailing "3.5g"
            clean_name = clean_name.strip(" |[]()-")
            if not clean_name or len(clean_name) < 3:
                continue

            thc = parse_thc(prod.get("thc_pct"))
            price_eighth = parse_price(prod.get("price_eighth"))

            record = {
                "strain_name": clean_name,
                "raw_name": raw_name,
                "brand": (prod.get("brand") or "").strip(),
                "strain_type": (prod.get("strain_type") or "").strip() or None,
                "thc": thc,
                "price_eighth": price_eighth,
                "dispensary": disp_display,
                "dispensary_slug": slug,
                "source_platform": platform,
                "source_url": source_url,
                "product_id": prod.get("id", ""),
                "product_category": product_category,
                "product_type": product_category,  # backwards compat
                "scraped_at": scraped_at,
            }
            all_records.append(record)

    print(f"\nTotal product records parsed: {len(all_records)}")
    if parse_errors:
        print(f"Parse errors: {len(parse_errors)}")
        for e in parse_errors:
            print(f"  {e['file']}: {e['error']}")

    # Deduplicate by (dispensary_slug, strain_name_lower)
    seen = set()
    unique_records = []
    for r in all_records:
        key = (r["dispensary_slug"], r["strain_name"].lower())
        if key not in seen:
            seen.add(key)
            unique_records.append(r)

    print(f"Unique strain-dispensary records: {len(unique_records)}")

    # Stats
    unique_strains = set(r["strain_name"].lower() for r in unique_records)
    unique_disps = set(r["dispensary_slug"] for r in unique_records)
    with_price = sum(1 for r in unique_records if r["price_eighth"] is not None)
    with_thc = sum(1 for r in unique_records if r["thc"] is not None)
    with_brand = sum(1 for r in unique_records if r["brand"])
    with_type = sum(1 for r in unique_records if r["strain_type"])

    print(f"Unique strain names: {len(unique_strains)}")
    print(f"Dispensaries with data: {len(unique_disps)}")
    print(f"Records with price: {with_price}/{len(unique_records)} ({100*with_price/len(unique_records):.1f}%)")
    print(f"Records with THC: {with_thc}/{len(unique_records)} ({100*with_thc/len(unique_records):.1f}%)")
    print(f"Records with brand: {with_brand}/{len(unique_records)} ({100*with_brand/len(unique_records):.1f}%)")
    print(f"Records with type: {with_type}/{len(unique_records)} ({100*with_type/len(unique_records):.1f}%)")

    # Brand distribution
    from collections import Counter
    brands = Counter(r["brand"] for r in unique_records if r["brand"])
    print(f"\nTop 15 brands:")
    for brand, count in brands.most_common(15):
        print(f"  {brand}: {count}")

    # Save
    output_data = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "weedmaps",
            "total_records": len(unique_records),
            "unique_strains": len(unique_strains),
            "dispensaries_with_data": len(unique_disps),
        },
        "records": unique_records,
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nSaved to {OUTPUT}")
    print(f"File size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
    return output_data


if __name__ == "__main__":
    main()
