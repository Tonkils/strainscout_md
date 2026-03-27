#!/usr/bin/env python3
"""
Pipeline Tool: Generate a classification report for manual review.

Reads the existing catalog, auto-classifies each product by name,
and outputs a CSV file that can be reviewed in Excel/Google Sheets.

Usage:
    PYTHONIOENCODING=utf-8 python3 -m pipeline.classify_and_report

Output: data/processed/category_review.csv
"""

import json
import re
import csv
import sys
from pathlib import Path
from collections import Counter

BASE = Path(__file__).resolve().parent.parent
CATALOG_PATH = BASE / "web_2" / "public" / "data" / "strainscout_catalog_v10.min.json"
OUTPUT_CSV = BASE / "data" / "processed" / "category_review.csv"
OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)


def classify_product_name(name: str) -> tuple:
    """
    Classify a cannabis product by name using pattern matching.
    Mirrors the logic from web_2/src/lib/utils.ts classifyProduct().

    Returns: (category: str, confidence: str)
    """
    n = name.lower().strip()

    # ── 1. Other (junk data) ─────────────────────────────────────
    if re.search(r"t-shirt|shirt\b|tee\b|^shop\s|^browse\s|% off|% back", n):
        return ("Other", "HIGH")
    if re.match(r"^[\d\s]*(pack|ct)[\d\s]*$", n):
        return ("Other", "MEDIUM")

    # ── 2. Pre-Roll ──────────────────────────────────────────────
    if re.search(
        r"\bprj\b|pre[-\s]?roll|preroll|\bjoints?\b|\bblunt\b|mini\s+dogs?\b"
        r"|show\s+dog\b|\bdogwalkers?\b|swift\s+lifts?\b"
        r"|infused\s+\d+\s*[-]?\s*(?:pack|pk)\b"
        r"|\bhappy(?:-er)?\s+j[\u2019']?s?\b|\bshorties?\b",
        n,
    ):
        return ("Pre-Roll", "HIGH")
    if re.search(r"\binfused\b", n) and re.search(r"(?:pack|pk)\b|\d+\s*(?:pack|pk)\b", n):
        return ("Pre-Roll", "MEDIUM")

    # ── 3. Vape ──────────────────────────────────────────────────
    if re.search(
        r"\bcart\b|cartridge|vaporizer|510|disposable|\blr\s+pod\b"
        r"|live\s+resin\s+cart|\bvape\b|\bpod\b|airopod|cloud\s+bar\b",
        n,
    ):
        return ("Vape", "HIGH")
    if re.search(r"\bairo\b", n):
        return ("Vape", "MEDIUM")

    # ── 4a. Early Edible pre-check ───────────────────────────────
    if re.search(r"gummy|gummies", n):
        return ("Edible", "HIGH")

    # ── 4. Concentrate ───────────────────────────────────────────
    if re.search(
        r"\bwax\b|\bdab\b|shatter|budder|badder|batter|\brosin\b"
        r"|live\s+resin\b|distillate|concentrate|extract|\bhash\b"
        r"|kief\b|crumble|diamonds?\b|\bsauce\b|\brso\b|\bfeco\b"
        r"|\boil\b|tincture|live\s+sugar|cured\s+sugar"
        r"|full[-\s]spec|full\s+extract|\bfso\b|\bisolate\b"
        r"|\bthca\b|\bbho\b|\bpho\b",
        n,
    ):
        return ("Concentrate", "HIGH")

    # ── 5. Edible ────────────────────────────────────────────────
    if re.search(
        r"chocolate|lozenge|\bcaramel\b|\bmochi\b|macaroon"
        r"|chews?\b|jellies?\b|\bdiscos\b|\belixir\b|quick\s*kicks?\b"
        r"|sparkling\s+water|\bsoda\b|\bbeverage\b|\bdrink\b"
        r"|\bcapsule|\btablet\b|syrup|baked\s+bites",
        n,
    ):
        return ("Edible", "HIGH")
    if re.search(r"\d+mg\b", n):
        return ("Edible", "HIGH")
    if re.search(r"\bwana\b|\bsmokiez\b|\bdixie\b|\bkeef\b", n):
        return ("Edible", "HIGH")
    if re.search(r"infused\s+(honey|butter|oil)", n):
        return ("Edible", "HIGH")
    if re.search(r"\d+\s*:\s*\d+", n):
        return ("Edible", "HIGH")
    if re.search(r"\b(cbg|cbn|cbd)\b", n):
        return ("Edible", "MEDIUM")

    # ── 6. Topical ───────────────────────────────────────────────
    if re.search(r"topical|lotion|balm|\bpatch\b|salve|moisturizer", n):
        return ("Topical", "HIGH")
    if re.search(r"\bgel\b|\bspray\b", n):
        return ("Topical", "MEDIUM")

    # ── 7. Flower (default) ──────────────────────────────────────
    return ("Flower", "HIGH")


def main():
    print("=" * 70)
    print("CATEGORY CLASSIFICATION REPORT")
    print("=" * 70)

    # Load catalog
    with open(CATALOG_PATH, encoding="utf-8") as f:
        catalog = json.load(f)

    if isinstance(catalog, list):
        strains = catalog
    else:
        strains = catalog.get("strains", [])

    print(f"Loaded {len(strains)} products from catalog")

    # Classify each product
    results = []
    for strain in strains:
        name = strain.get("name", "")
        strain_id = strain.get("id", "")
        brand = strain.get("brand", "")
        category, confidence = classify_product_name(name)

        results.append({
            "id": strain_id,
            "name": name,
            "brand": brand,
            "dispensary_count": strain.get("dispensary_count", 0),
            "price_min": strain.get("price_min", ""),
            "auto_category": category,
            "confidence": confidence,
            "manual_category": "",   # To be filled during review
            "notes": "",             # For reviewer comments
        })

    # Write CSV
    fieldnames = ["id", "name", "brand", "dispensary_count", "price_min",
                  "auto_category", "confidence", "manual_category", "notes"]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    # Print summary
    category_counts = Counter(r["auto_category"] for r in results)
    confidence_counts = Counter(r["confidence"] for r in results)

    print(f"\n{'='*40}")
    print("AUTO-CLASSIFICATION SUMMARY")
    print(f"{'='*40}")
    for cat, count in category_counts.most_common():
        pct = 100 * count / len(results)
        print(f"  {cat:15s} {count:5d}  ({pct:5.1f}%)")

    print(f"\n  {'TOTAL':15s} {len(results):5d}")

    print(f"\nConfidence breakdown:")
    for conf, count in confidence_counts.most_common():
        print(f"  {conf:15s} {count:5d}")

    # Print non-flower products for review
    non_flower = [r for r in results if r["auto_category"] != "Flower"]
    print(f"\n{'='*40}")
    print(f"NON-FLOWER PRODUCTS ({len(non_flower)} total)")
    print(f"{'='*40}")
    for cat in ["Pre-Roll", "Vape", "Concentrate", "Edible", "Topical", "Other"]:
        cat_items = [r for r in non_flower if r["auto_category"] == cat]
        if cat_items:
            print(f"\n  --- {cat} ({len(cat_items)}) ---")
            for r in cat_items:
                conf = "[!!]" if r["confidence"] == "MEDIUM" else "[ok]"
                print(f"  {conf} {r['name'][:60]}")

    # Print MEDIUM confidence items that need manual review
    medium = [r for r in results if r["confidence"] == "MEDIUM"]
    if medium:
        print(f"\n{'='*40}")
        print(f"NEEDS MANUAL REVIEW ({len(medium)} items)")
        print(f"{'='*40}")
        for r in medium:
            print(f"  [{r['auto_category']:12s}] {r['name'][:60]}")

    print(f"\nCSV written to: {OUTPUT_CSV}")
    return results


if __name__ == "__main__":
    main()
