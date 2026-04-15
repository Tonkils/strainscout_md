#!/usr/bin/env python3
"""
pipeline/normalize_prices.py

Post-process the production catalog to improve pricing consistency:

1. Extract weight from product names where possible
2. Flag products with suspicious price variance (likely mixed weights)
3. Infer weight from price + dispensary patterns (Trulieve = per-gram, etc.)
4. Add per-gram normalized price for comparison

Usage:
    python -m pipeline.normalize_prices            # Normalize and save
    python -m pipeline.normalize_prices --dry-run  # Preview without saving
"""

import argparse
import json
import re
import sys
from pathlib import Path
from collections import Counter, defaultdict

BASE = Path(__file__).resolve().parent.parent

WEB_CATALOG = BASE / "web_2" / "public" / "data" / "strainscout_catalog_v10.min.json"
OUT_DIR = BASE / "data" / "output"
OUT_MIN = OUT_DIR / "strainscout_catalog_v10.min.json"
OUT_PRETTY = OUT_DIR / "strainscout_catalog_v10.json"

# ── Weight extraction ──────────────────────────────────────────────

# Standard cannabis weight tiers and their gram equivalents
WEIGHT_TO_GRAMS = {
    "1g": 1.0,
    "2g": 2.0,
    "3.5g": 3.5,
    "4g": 4.0,
    "5g": 5.0,
    "7g": 7.0,
    "14g": 14.0,
    "28g": 28.0,
    "0.5g": 0.5,
    "1oz": 28.0,
    "0.5oz": 14.0,
    "0.25oz": 7.0,
}

# Known dispensary pricing models
PER_GRAM_DISPENSARIES = {
    "trulieve - halethorpe",
    "trulieve - lutherville",
    "trulieve - rockville",
}

# Price bands for Flower (used to infer weight when not in name)
# These are typical Maryland dispensary price ranges
FLOWER_PRICE_BANDS = [
    # (min_price, max_price, likely_weight, grams)
    (5, 15, "1g", 1.0),
    (16, 35, "3.5g", 3.5),
    (36, 70, "7g", 7.0),
    (71, 140, "14g", 14.0),
    (141, 280, "28g", 28.0),
]

VAPE_PRICE_BANDS = [
    (15, 40, "0.5g", 0.5),
    (41, 80, "1g", 1.0),
]

CONCENTRATE_PRICE_BANDS = [
    (20, 50, "0.5g", 0.5),
    (51, 90, "1g", 1.0),
    (91, 180, "3.5g", 3.5),
]


def extract_weight(name: str) -> str | None:
    """Extract weight/size from a product name."""
    # Weight: 3.5g, 1oz, 0.5g, 7g, 14g, 28g
    m = re.search(r'(\d+(?:\.\d+)?)\s*(g|oz)\b', name, re.I)
    if m:
        val = m.group(1)
        unit = m.group(2).lower()
        # Check it's not an mg match (e.g., "100mg" shouldn't extract as "100g")
        start = m.start()
        if start > 0 and name[start - 1:start].lower() == 'm':
            pass  # This is mg, not g
        else:
            return f"{val}{unit}"

    # Pack count: 5pk, 10 pack, 2ct
    m = re.search(r'(\d+)\s*(pk|pack|ct)\b', name, re.I)
    if m:
        return f"{m.group(1)}pk"

    return None


def infer_weight_from_price(price: float, category: str, dispensary: str) -> tuple[str | None, str]:
    """Infer weight from price based on category and dispensary patterns.

    Returns (weight, confidence) where confidence is 'known', 'likely', or None.
    """
    disp_lower = dispensary.lower()

    # Known per-gram dispensaries
    if disp_lower in PER_GRAM_DISPENSARIES:
        return "1g", "known"

    # Use price bands based on category
    if category == "Flower":
        bands = FLOWER_PRICE_BANDS
    elif category == "Vape":
        bands = VAPE_PRICE_BANDS
    elif category == "Concentrate":
        bands = CONCENTRATE_PRICE_BANDS
    else:
        return None, ""

    for min_p, max_p, weight, _ in bands:
        if min_p <= price <= max_p:
            return weight, "likely"

    return None, ""


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Normalize pricing in the StrainScout catalog.",
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without saving.")
    args = parser.parse_args(argv)

    # ── Load ───────────────────────────────────────────────────────
    if not WEB_CATALOG.exists():
        print(f"ERROR: catalog not found at {WEB_CATALOG}", file=sys.stderr)
        sys.exit(1)

    with open(WEB_CATALOG, "r", encoding="utf-8") as fh:
        catalog: list[dict] = json.load(fh)

    print(f"Loaded {len(catalog)} products")

    # ── Before stats ───────────────────────────────────────────────
    has_weight_before = sum(1 for p in catalog if p.get("weight"))
    has_prices = sum(1 for p in catalog if p.get("prices") and len(p["prices"]) > 0)
    print(f"Products with weight: {has_weight_before}/{len(catalog)}")
    print(f"Products with prices: {has_prices}/{len(catalog)}")

    stats = Counter()

    # ── Process each product ───────────────────────────────────────
    for product in catalog:
        name = product.get("name", "")
        cat = product.get("product_category", "")
        prices = product.get("prices", [])

        # 1. Extract weight from name if not already set
        if not product.get("weight"):
            w = extract_weight(name)
            if w:
                product["weight"] = w
                stats["weight_from_name"] += 1

        # 2. For each price entry, try to infer weight and add per-gram price
        for price_entry in prices:
            price = price_entry.get("price", 0)
            dispensary = price_entry.get("dispensary", "")

            if price <= 0:
                continue

            # Infer weight for this specific price entry
            entry_weight = product.get("weight")
            weight_confidence = "extracted" if entry_weight else ""

            if not entry_weight:
                entry_weight, weight_confidence = infer_weight_from_price(
                    price, cat, dispensary
                )

            if entry_weight:
                price_entry["inferred_weight"] = entry_weight
                price_entry["weight_confidence"] = weight_confidence

                # Calculate per-gram price
                grams = WEIGHT_TO_GRAMS.get(entry_weight)
                if grams and grams > 0:
                    price_entry["price_per_gram"] = round(price / grams, 2)
                    stats["per_gram_calculated"] += 1

        # 3. Flag suspicious price variance
        price_vals = [pr.get("price", 0) for pr in prices if pr.get("price", 0) > 0]
        if len(price_vals) >= 2:
            mn, mx = min(price_vals), max(price_vals)
            spread_pct = (mx - mn) / mn * 100 if mn > 0 else 0
            if spread_pct > 100:
                product["price_variance_flag"] = "high"
                product["price_spread_pct"] = round(spread_pct)
                stats["high_variance"] += 1
            elif spread_pct > 50:
                product["price_variance_flag"] = "moderate"
                product["price_spread_pct"] = round(spread_pct)
                stats["moderate_variance"] += 1

    # ── After stats ────────────────────────────────────────────────
    has_weight_after = sum(1 for p in catalog if p.get("weight"))
    has_per_gram = sum(
        1 for p in catalog
        for pr in p.get("prices", [])
        if pr.get("price_per_gram")
    )

    print(f"\n=== RESULTS ===")
    print(f"Weight field:     {has_weight_before} → {has_weight_after} (+{stats.get('weight_from_name', 0)} from names)")
    print(f"Per-gram prices:  {has_per_gram} price entries have price_per_gram")
    print(f"High variance:    {stats.get('high_variance', 0)} products (>100% spread)")
    print(f"Moderate variance:{stats.get('moderate_variance', 0)} products (50-100% spread)")

    # Show high-variance products
    flagged = [(p["name"], p.get("price_spread_pct", 0), p.get("product_category", ""))
               for p in catalog if p.get("price_variance_flag") == "high"]
    if flagged:
        print(f"\nHigh-variance products (likely mixed weights):")
        for name, spread, cat in sorted(flagged, key=lambda x: -x[1])[:20]:
            print(f"  {name:45s} {cat:12s} {spread}% spread")

    if args.dry_run:
        print("\n--dry-run flag set; no files written.")
        return

    # ── Save ───────────────────────────────────────────────────────
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(WEB_CATALOG, "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"\nSaved minified → {WEB_CATALOG.relative_to(BASE)}")

    with open(OUT_MIN, "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"Saved minified → {OUT_MIN.relative_to(BASE)}")

    with open(OUT_PRETTY, "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, indent=2, ensure_ascii=False)
    print(f"Saved pretty   → {OUT_PRETTY.relative_to(BASE)}")


if __name__ == "__main__":
    main()
