#!/usr/bin/env python3
"""
Pipeline Step 1.5: Cross-source Price Reconciliation

When the same product appears from multiple scrapers (e.g., Weedmaps + Dutchie
for the same dispensary), this step reconciles the prices.

Strategy:
  1. Group raw products by (cleaned_name, dispensary)
  2. For duplicates: keep the most recent price, note all sources
  3. Flag large price discrepancies (>20%) for review
  4. Prefer verified/partner prices over scraped prices

Input:  data/processed/parsed_strains.json
Output: data/processed/reconciled_strains.json (replaces parsed_strains.json in pipeline)

Run:
    python -m pipeline.reconcile
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE / "data" / "processed"

INPUT = PROCESSED_DIR / "parsed_strains.json"
OUTPUT = PROCESSED_DIR / "reconciled_strains.json"


def reconcile_prices(records: list[dict]) -> list[dict]:
    """
    Reconcile duplicate strain-dispensary records from different sources.
    Returns deduplicated list with best prices and multi-source attribution.
    """
    # Group by (strain_name_lower, dispensary_lower)
    groups = defaultdict(list)
    for r in records:
        key = (r["strain_name"].lower().strip(), r["dispensary"].lower().strip())
        groups[key].append(r)

    reconciled = []
    conflicts = []
    multi_source = 0

    for (strain, disp), group in groups.items():
        if len(group) == 1:
            # No conflict — single source
            reconciled.append(group[0])
            continue

        multi_source += 1

        # Multiple sources for same strain + dispensary
        # Sort by: has_price > most_recent > platform_priority
        platform_priority = {
            "weedmaps": 3,
            "dutchie": 4,       # Dutchie tends to be most accurate
            "dutchie-whitelabel": 4,
            "dutchie-ascend": 4,
            "jane": 3,
            "trulieve": 3,
            "curaleaf": 2,
            "sweed": 2,
            "zenleaf-sweed": 2,
            "sweedpos": 2,
        }

        def score(r):
            has_price = 1 if r.get("price_eighth") else 0
            priority = platform_priority.get(r.get("platform", ""), 1)
            return (has_price, priority)

        group.sort(key=score, reverse=True)
        best = group[0].copy()

        # Collect all sources
        sources = list(set(r.get("platform", "unknown") for r in group))
        best["sources"] = sources
        best["source_count"] = len(group)

        # Check for price discrepancies
        prices = [r["price_eighth"] for r in group if r.get("price_eighth")]
        if len(prices) >= 2:
            min_p = min(prices)
            max_p = max(prices)
            if min_p > 0 and (max_p - min_p) / min_p > 0.20:
                conflicts.append({
                    "strain": strain,
                    "dispensary": disp,
                    "prices": prices,
                    "sources": sources,
                    "spread_pct": round((max_p - min_p) / min_p * 100, 1),
                })
            # Use the lowest price (best deal for consumers)
            best["price_eighth"] = min_p

        # Merge THC — keep highest (most specific)
        thc_values = [r["thc_pct"] for r in group if r.get("thc_pct")]
        if thc_values:
            best["thc_pct"] = max(thc_values)

        # Merge brand — prefer non-empty
        brands = [r["brand"] for r in group if r.get("brand")]
        if brands:
            best["brand"] = brands[0]

        # Merge strain_type — prefer non-default
        types = [r["strain_type"] for r in group if r.get("strain_type") and r["strain_type"] != "Hybrid"]
        if types:
            best["strain_type"] = types[0]

        reconciled.append(best)

    return reconciled, conflicts, multi_source


def main():
    print("=" * 70)
    print("PIPELINE STEP 1.5: CROSS-SOURCE PRICE RECONCILIATION")
    print("=" * 70)

    if not INPUT.exists():
        print(f"ERROR: Input not found: {INPUT}")
        print("Run parse_raw.py first.")
        sys.exit(1)

    with open(INPUT, encoding="utf-8") as f:
        data = json.load(f)

    # Handle both formats: list or dict with 'records' key
    if isinstance(data, dict):
        records = data.get("records", [])
        metadata = data.get("metadata", {})
    else:
        records = data
        metadata = {}

    print(f"Input: {len(records)} parsed records")

    reconciled, conflicts, multi_source = reconcile_prices(records)

    print(f"Output: {len(reconciled)} reconciled records")
    print(f"  Multi-source records merged: {multi_source}")
    print(f"  Records reduced by: {len(records) - len(reconciled)}")
    print(f"  Price conflicts (>20% spread): {len(conflicts)}")

    if conflicts:
        print(f"\n  Top price conflicts:")
        for c in sorted(conflicts, key=lambda x: -x["spread_pct"])[:10]:
            print(f"    {c['strain']:40s} @ {c['dispensary']:30s} | "
                  f"prices: {c['prices']} | spread: {c['spread_pct']}% | "
                  f"sources: {c['sources']}")

    # Save reconciled records
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(reconciled, f, indent=2, ensure_ascii=False)

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\nSaved to {OUTPUT}")
    print(f"File size: {size_kb:.1f} KB")

    # Also save conflicts report
    if conflicts:
        conflicts_path = PROCESSED_DIR / "price_conflicts.json"
        with open(conflicts_path, "w", encoding="utf-8") as f:
            json.dump(conflicts, f, indent=2, ensure_ascii=False)
        print(f"Conflicts report: {conflicts_path}")


if __name__ == "__main__":
    main()
