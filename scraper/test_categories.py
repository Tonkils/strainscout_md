"""
scraper/test_categories.py

Category accuracy evaluation tool.

Tests two things:
  1. PLATFORM COVERAGE  — how many products in existing raw scraped data
     already carry a category field from the platform API, vs. needing inference.
  2. NORMALIZATION CHECK — applies normalize_category() to all platform-provided
     labels and reports unknown/unmapped values that need to be added to category_map.py

Run:
    python -m scraper.test_categories
    python -m scraper.test_categories --raw-dir data/raw          # custom path
    python -m scraper.test_categories --show-unknowns             # only show gaps
    python -m scraper.test_categories --sample 10                 # show N samples per category
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
RAW_DIR = BASE / "data" / "raw"

from scraper.category_map import normalize_category, _MAP


def load_raw_files(raw_dir: Path) -> list[dict]:
    """Load all per-dispensary raw JSON files. Returns flat list of (dispensary, product) tuples."""
    records = []
    files = list(raw_dir.glob("*.json"))
    # Skip run summary files
    files = [f for f in files if "_run_" not in f.name]

    for fpath in sorted(files):
        try:
            data = json.loads(fpath.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  SKIP {fpath.name}: {e}", file=sys.stderr)
            continue

        platform = data.get("platform", fpath.name.split("_")[0])
        disp_name = data.get("name", fpath.stem)
        products = data.get("products", [])

        for p in products:
            records.append({
                "file": fpath.name,
                "platform": platform,
                "dispensary": disp_name,
                "product": p,
            })

    return records


def extract_platform_category(product: dict, platform: str) -> str:
    """
    Extract the raw category label from a product dict using platform-specific field names.
    Returns empty string if no category field is present.
    """
    p = product

    if platform in ("weedmaps",):
        # discovery/v1: edge_category.slug
        ec = p.get("edge_category")
        if isinstance(ec, dict):
            return ec.get("slug", "")
        # wm/v1 jsonapi: already extracted as product_type or parent_category
        return p.get("product_type", "")

    if platform in ("dutchie", "dutchie_whitelabel", "ascend"):
        # Dutchie: "type" field at product level
        return p.get("type", "") or p.get("category", "") or p.get("product_type", "")

    if platform in ("jane", "verilife"):
        # iHeartJane: "kind" field
        return p.get("kind", "") or p.get("product_type", "") or p.get("category", "")

    if platform in ("trulieve",):
        # Trulieve: was hard-navigated to /category/flower, so product_type should be "flower"
        # but newer versions may include category in product data
        return p.get("category", "") or p.get("product_category", "") or p.get("product_type", "")

    if platform in ("curaleaf",):
        # Curaleaf: was hard-navigated to /menu/flower-542, so product_type = "flower"
        return p.get("category", "") or p.get("product_category", "") or p.get("product_type", "")

    if platform in ("zenleaf", "sweedpos"):
        return p.get("category", "") or p.get("product_type", "") or p.get("type", "")

    # Fallback: check common field names
    for field in ("category", "product_category", "product_type", "type", "kind"):
        val = p.get(field, "")
        if val:
            return str(val)

    return ""


def run_evaluation(raw_dir: Path, sample_n: int = 5, show_unknowns_only: bool = False):
    print(f"\n{'='*70}")
    print("  STRAINSCOUT CATEGORY ACCURACY EVALUATION")
    print(f"{'='*70}")
    print(f"  Raw data directory: {raw_dir}")

    records = load_raw_files(raw_dir)
    if not records:
        print("  ERROR: No raw files found.")
        return

    print(f"  Loaded {len(records):,} products from {len(set(r['file'] for r in records))} files\n")

    # -- 1. Platform coverage -------------------------------------------------
    print("-- 1. PLATFORM CATEGORY FIELD COVERAGE -------------------------------------")
    platform_stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "has_category": 0, "raw_labels": defaultdict(int)})

    for rec in records:
        platform = rec["platform"]
        raw_cat = extract_platform_category(rec["product"], platform)
        platform_stats[platform]["total"] += 1
        if raw_cat:
            platform_stats[platform]["has_category"] += 1
            platform_stats[platform]["raw_labels"][raw_cat.lower()] += 1

    for platform, stats in sorted(platform_stats.items()):
        total = stats["total"]
        has_cat = stats["has_category"]
        pct = has_cat / total * 100 if total else 0
        print(f"\n  {platform:<25} {has_cat:>5}/{total:<5} ({pct:.0f}%) have category field")
        labels = sorted(stats["raw_labels"].items(), key=lambda x: -x[1])
        for label, count in labels[:10]:
            normalized = normalize_category(label, platform)
            marker = "[ok]" if normalized != "Other" else "?"
            print(f"    {marker}  '{label}'  ({count}x)  ->  {normalized}")

    # -- 2. Normalization gaps ------------------------------------------------
    print("\n\n-- 2. UNMAPPED CATEGORY LABELS (need to add to category_map.py) ---")
    unknown_labels: dict[str, list[str]] = defaultdict(list)  # label -> [dispensary names]

    for rec in records:
        raw_cat = extract_platform_category(rec["product"], rec["platform"])
        if not raw_cat:
            continue
        normalized = normalize_category(raw_cat, rec["platform"])
        if normalized == "Other" and raw_cat.lower() not in ("other", "accessories", "accessory", "merchandise"):
            unknown_labels[raw_cat].append(rec["dispensary"])

    if unknown_labels:
        print(f"  Found {len(unknown_labels)} unmapped labels:\n")
        for label, disps in sorted(unknown_labels.items(), key=lambda x: -len(x[1])):
            unique_disps = sorted(set(disps))
            print(f"  [!!]  '{label}'  ({len(disps)} products, {len(unique_disps)} dispensaries)")
            if len(unique_disps) <= 3:
                print(f"     Dispensaries: {', '.join(unique_disps)}")
    else:
        print("  All labels are mapped correctly.")

    if show_unknowns_only:
        return

    # -- 3. Category distribution ----------------------------------------------
    print("\n\n-- 3. CATEGORY DISTRIBUTION (after normalization) ------------------")
    cat_counts: dict[str, int] = defaultdict(int)
    cat_samples: dict[str, list[str]] = defaultdict(list)
    no_category_count = 0

    for rec in records:
        raw_cat = extract_platform_category(rec["product"], rec["platform"])
        if not raw_cat:
            no_category_count += 1
            continue
        normalized = normalize_category(raw_cat, rec["platform"])
        cat_counts[normalized] += 1
        if len(cat_samples[normalized]) < sample_n:
            name = rec["product"].get("name", "?")
            cat_samples[normalized].append(f"{name}  [{rec['platform']}]")

    total_with_cat = sum(cat_counts.values())
    total_all = total_with_cat + no_category_count
    print(f"  {'Category':<15}  {'Count':>6}  {'%':>6}")
    print(f"  {'-'*35}")
    for cat in ["Flower", "Pre-Roll", "Vape", "Concentrate", "Edible", "Topical", "Other"]:
        count = cat_counts.get(cat, 0)
        pct = count / total_all * 100 if total_all else 0
        print(f"  {cat:<15}  {count:>6}  {pct:>5.1f}%")
    print(f"  {'(no category)':<15}  {no_category_count:>6}  {no_category_count/total_all*100:>5.1f}%")
    print(f"  {'-'*35}")
    print(f"  {'TOTAL':<15}  {total_all:>6}")

    if sample_n > 0:
        print(f"\n\n-- 4. SAMPLE PRODUCTS PER CATEGORY (up to {sample_n} each) -------------")
        for cat in ["Flower", "Pre-Roll", "Vape", "Concentrate", "Edible", "Topical", "Other"]:
            samples = cat_samples.get(cat, [])
            if samples:
                print(f"\n  {cat}:")
                for s in samples:
                    print(f"    • {s}")
            else:
                print(f"\n  {cat}: (none in current raw data)")

    # -- 5. Scrapers that need updating ---------------------------------------
    print("\n\n-- 5. SCRAPER UPDATE STATUS ----------------------------------------")
    notes = {
        "weedmaps":        "[ok] edge_category.slug available in API — remove flower-only filter, capture slug",
        "dutchie":         "[ok] type field available in GraphQL — remove flower-only filter, capture type",
        "jane":            "[ok] kind field available in API — remove flower-only filter, capture kind",
        "verilife":        "[ok] same as jane — kind field available",
        "ascend":          "[ok] same as dutchie — type field available",
        "trulieve":        "⚡ navigates to /category/flower URL — must iterate all TRULIEVE_CATEGORY_URLS",
        "curaleaf":        "⚡ navigates to /menu/flower-542 URL — must iterate all CURALEAF_CATEGORY_IDS",
        "zenleaf":         "? check category field in API response",
        "sweedpos":        "? check category field in API response",
        "dutchie_whitelabel": "[ok] same as dutchie — type field available",
    }
    for platform, note in notes.items():
        print(f"  {platform:<22}  {note}")

    print(f"\n{'='*70}\n")


def main():
    parser = argparse.ArgumentParser(description="Category accuracy evaluation for StrainScout scrapers")
    parser.add_argument("--raw-dir", type=Path, default=RAW_DIR, help="Path to data/raw directory")
    parser.add_argument("--show-unknowns", action="store_true", help="Only show unmapped labels")
    parser.add_argument("--sample", type=int, default=5, help="Sample products to show per category")
    args = parser.parse_args()

    run_evaluation(args.raw_dir, sample_n=args.sample, show_unknowns_only=args.show_unknowns)


if __name__ == "__main__":
    main()
