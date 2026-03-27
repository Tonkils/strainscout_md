#!/usr/bin/env python3
"""
Phase 3: Apply manual category overrides and inferred categories to the catalog.

For each strain:
  - If strain ID is in manual_overrides.json -> use that category, confidence = "verified"
  - Otherwise -> classify via classify_product_name(), confidence = "inferred"

Outputs:
  - web_2/public/data/strainscout_catalog_v10.min.json  (minified, production)
  - data/output/strainscout_catalog_v10.json             (pretty-printed, reference)
"""

import json
import os
import sys
from collections import Counter
from pathlib import Path

from pipeline.classify_and_report import classify_product_name

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "web_2" / "public" / "data" / "strainscout_catalog_v10.min.json"
OVERRIDES_PATH = ROOT / "data" / "manual_overrides.json"
OUTPUT_PRETTY = ROOT / "data" / "output" / "strainscout_catalog_v10.json"


def main():
    # ── Load catalog ──────────────────────────────────────────
    print(f"Loading catalog from {CATALOG_PATH} ...")
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)
    print(f"  Loaded {len(catalog)} strains.")

    # ── Load manual overrides ─────────────────────────────────
    print(f"Loading manual overrides from {OVERRIDES_PATH} ...")
    with open(OVERRIDES_PATH, "r", encoding="utf-8") as f:
        overrides = json.load(f)
    print(f"  Loaded {len(overrides)} overrides.")

    # ── Apply categories ──────────────────────────────────────
    verified_count = 0
    inferred_count = 0
    category_counts = Counter()

    for strain in catalog:
        strain_id = strain["id"]

        if strain_id in overrides:
            category = overrides[strain_id]
            confidence = "verified"
            verified_count += 1
        else:
            category, _conf = classify_product_name(strain.get("name", ""))
            confidence = "inferred"
            inferred_count += 1

        strain["product_category"] = category
        strain["category_confidence"] = confidence
        category_counts[category] += 1

    # ── Save minified catalog ─────────────────────────────────
    print(f"\nSaving minified catalog to {CATALOG_PATH} ...")
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  Written ({os.path.getsize(CATALOG_PATH):,} bytes).")

    # ── Save pretty-printed catalog ───────────────────────────
    OUTPUT_PRETTY.parent.mkdir(parents=True, exist_ok=True)
    print(f"Saving pretty-printed catalog to {OUTPUT_PRETTY} ...")
    with open(OUTPUT_PRETTY, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print(f"  Written ({os.path.getsize(OUTPUT_PRETTY):,} bytes).")

    # ── Summary ───────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("CATEGORY DISTRIBUTION")
    print("=" * 50)
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        pct = count / len(catalog) * 100
        print(f"  {cat:<20s} {count:>5d}  ({pct:5.1f}%)")
    print(f"  {'TOTAL':<20s} {len(catalog):>5d}")

    print(f"\nConfidence breakdown:")
    print(f"  Verified (manual):  {verified_count:>5d}")
    print(f"  Inferred (auto):    {inferred_count:>5d}")
    print(f"  Total:              {len(catalog):>5d}")
    print("\nDone.")


if __name__ == "__main__":
    main()
