#!/usr/bin/env python3
"""
pipeline/enrich_catalog_leafly.py

Enrich the production catalog directly with Leafly terpene/effects/type data.

This is a standalone enrichment step that works on the final catalog JSON
(unlike enrich_leafly.py which works on intermediate parsed_strains.json).

Usage:
    python -m pipeline.enrich_catalog_leafly            # Enrich and save
    python -m pipeline.enrich_catalog_leafly --dry-run  # Preview without saving
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from collections import Counter

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from pipeline.enrich_leafly import (
    build_leafly_index,
    find_leafly_match as _base_find_match,
    parse_csv_field,
    extract_pure_name,
    make_leafly_slug,
)

# Known brand prefixes to strip when matching strain names
BRAND_PREFIXES = [
    "airo", "avexia", "bits", "chesacanna", "culta", "curio", "district",
    "encore", "evermore", "fernway", "garcia", "grassroots", "gron",
    "harvest", "hms", "kiva", "matter", "mfused", "nature's heritage",
    "natures heritage", "ozone", "pts", "rythm", "savvy", "strane",
    "sunmed", "the essence", "verano", "wana",
]

# Format words to strip for better strain extraction
FORMAT_WORDS = re.compile(
    r"\b(cart(?:ridge)?|disposable|pod|aio|vape|pen|all.?in.?one|"
    r"badder|budder|batter|sugar|sauce|wax|shatter|diamonds?|live.?resin|"
    r"lr|rso|rosin|crumble|distillate|feco|capsule[s]?|"
    r"gumm(?:y|ies)|chocolate|mint|lozenge|chew|tablet|"
    r"infused|legacy|edition|briq|single|multi|"
    r"\d+\s*(?:pk|pack|ct)\b)\b",
    re.IGNORECASE,
)


def enhanced_find_match(name: str, index: dict, brand: str = "") -> dict | None:
    """Enhanced matching with brand-stripping and format-word removal."""
    # Try the base matcher first
    match = _base_find_match(name, index)
    if match:
        return match

    pure = extract_pure_name(name)

    # Normalize & to and
    normalized = pure.replace("&", "and").lower()
    if normalized in index:
        return index[normalized]
    normalized_clean = re.sub(r"[^a-z0-9\s]", "", normalized).strip()
    if normalized_clean in index:
        return index[normalized_clean]

    # Strip format words
    stripped = FORMAT_WORDS.sub("", pure).strip()
    stripped = re.sub(r"\s+", " ", stripped).strip(" -–—|/:")
    if stripped.lower() in index:
        return index[stripped.lower()]
    stripped_clean = re.sub(r"[^a-z0-9\s]", "", stripped.lower()).strip()
    if stripped_clean in index:
        return index[stripped_clean]

    # Strip brand prefix from name
    nl = name.lower().strip()
    for prefix in BRAND_PREFIXES:
        if nl.startswith(prefix + " ") or nl.startswith(prefix + "-"):
            after = nl[len(prefix):].strip(" -–—|/:")
            after = FORMAT_WORDS.sub("", after).strip()
            after = re.sub(r"\s+", " ", after).strip(" -–—|/:")
            if after in index:
                return index[after]
            after_clean = re.sub(r"[^a-z0-9\s]", "", after).strip()
            if after_clean in index:
                return index[after_clean]
            break

    # Strip brand field from product name
    if brand:
        bl = brand.lower().strip()
        if nl.startswith(bl + " ") or nl.startswith(bl + "-"):
            after = nl[len(bl):].strip(" -–—|/:")
            after = FORMAT_WORDS.sub("", after).strip()
            after = re.sub(r"\s+", " ", after).strip(" -–—|/:")
            if after in index:
                return index[after]
            after_clean = re.sub(r"[^a-z0-9\s]", "", after).strip()
            if after_clean in index:
                return index[after_clean]

    # Try first word only (for single-word strain names)
    words = stripped.split()
    if len(words) >= 1 and len(words[0]) >= 4:
        single = words[0].lower()
        if single in index:
            return index[single]

    return None

# Catalog paths
WEB_CATALOG = BASE / "web_2" / "public" / "data" / "strainscout_catalog_v10.min.json"
OUT_DIR = BASE / "data" / "output"
OUT_MIN = OUT_DIR / "strainscout_catalog_v10.min.json"
OUT_PRETTY = OUT_DIR / "strainscout_catalog_v10.json"


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Enrich production catalog with Leafly terpene/effects data.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview enrichment counts without saving.",
    )
    args = parser.parse_args(argv)

    # ── Load catalog ───────────────────────────────────────────────
    if not WEB_CATALOG.exists():
        print(f"ERROR: catalog not found at {WEB_CATALOG}", file=sys.stderr)
        sys.exit(1)

    with open(WEB_CATALOG, "r", encoding="utf-8") as fh:
        catalog: list[dict] = json.load(fh)

    print(f"Loaded {len(catalog)} products from {WEB_CATALOG.relative_to(BASE)}")

    # ── Build Leafly index ─────────────────────────────────────────
    leafly_index = build_leafly_index()
    print(f"Leafly index: {len(leafly_index)} strain entries")

    # ── Before stats ───────────────────────────────────────────────
    before_terpenes = sum(1 for p in catalog if p.get("terpenes") and len(p["terpenes"]) > 0)
    before_effects = sum(1 for p in catalog if p.get("effects") and len(p["effects"]) > 0)
    before_type = sum(1 for p in catalog if p.get("leafly_type"))
    before_desc = sum(1 for p in catalog if p.get("description"))

    print(f"\nBefore enrichment:")
    print(f"  Terpenes:    {before_terpenes}/{len(catalog)} ({100*before_terpenes/len(catalog):.1f}%)")
    print(f"  Effects:     {before_effects}/{len(catalog)} ({100*before_effects/len(catalog):.1f}%)")
    print(f"  Leafly type: {before_type}/{len(catalog)} ({100*before_type/len(catalog):.1f}%)")
    print(f"  Description: {before_desc}/{len(catalog)} ({100*before_desc/len(catalog):.1f}%)")

    # ── Enrich ─────────────────────────────────────────────────────
    stats = Counter()

    for product in catalog:
        name = product.get("name", "")
        if not name:
            continue

        brand = product.get("brand", "")
        match = enhanced_find_match(name, leafly_index, brand)
        if not match:
            stats["no_match"] += 1
            continue

        stats["matched"] += 1

        # Terpenes — only add if product doesn't already have them
        if not product.get("terpenes") or len(product.get("terpenes", [])) == 0:
            terps = parse_csv_field(match.get("terpenes", ""))
            if terps:
                product["terpenes"] = terps
                stats["terpenes_added"] += 1

        # Effects — only add if product doesn't already have them
        if not product.get("effects") or len(product.get("effects", [])) == 0:
            effects = parse_csv_field(match.get("effects", ""))
            if effects:
                product["effects"] = effects
                stats["effects_added"] += 1

        # Leafly type (Indica/Sativa/Hybrid)
        if not product.get("leafly_type"):
            ltype = (match.get("strain_type") or "").strip()
            if ltype.lower() in ("indica", "sativa", "hybrid"):
                product["leafly_type"] = ltype.capitalize()
                stats["type_added"] += 1

        # Description
        if not product.get("description"):
            desc = match.get("description", "")
            if desc and len(desc) > 10:
                product["description"] = desc
                stats["description_added"] += 1

        # Genetics
        if not product.get("genetics"):
            genetics = match.get("genetics", "")
            if genetics and len(genetics) > 3:
                product["genetics"] = genetics
                stats["genetics_added"] += 1

        # Flavors
        if not product.get("flavors") or len(product.get("flavors", [])) == 0:
            flavors = parse_csv_field(match.get("flavors", ""))
            if flavors:
                product["flavors"] = flavors
                stats["flavors_added"] += 1

        # Leafly URL
        if not product.get("leafly_url"):
            leafly_url = match.get("leafly_url", "")
            if leafly_url and leafly_url.startswith("http"):
                product["leafly_url"] = leafly_url
                stats["url_added"] += 1

    # ── After stats ────────────────────────────────────────────────
    after_terpenes = sum(1 for p in catalog if p.get("terpenes") and len(p["terpenes"]) > 0)
    after_effects = sum(1 for p in catalog if p.get("effects") and len(p["effects"]) > 0)
    after_type = sum(1 for p in catalog if p.get("leafly_type"))
    after_desc = sum(1 for p in catalog if p.get("description"))

    print(f"\nEnrichment results:")
    print(f"  Matched: {stats['matched']}/{len(catalog)} ({100*stats['matched']/len(catalog):.1f}%)")
    print(f"  No match: {stats['no_match']}/{len(catalog)} ({100*stats['no_match']/len(catalog):.1f}%)")

    print(f"\n  Terpenes:    {before_terpenes} → {after_terpenes} (+{stats.get('terpenes_added', 0)})")
    print(f"  Effects:     {before_effects} → {after_effects} (+{stats.get('effects_added', 0)})")
    print(f"  Leafly type: {before_type} → {after_type} (+{stats.get('type_added', 0)})")
    print(f"  Description: {before_desc} → {after_desc} (+{stats.get('description_added', 0)})")
    print(f"  Genetics:    +{stats.get('genetics_added', 0)}")
    print(f"  Flavors:     +{stats.get('flavors_added', 0)}")
    print(f"  Leafly URLs: +{stats.get('url_added', 0)}")

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

    print(f"\nFinal catalog: {len(catalog)} products.")
    print(f"Terpene coverage: {after_terpenes}/{len(catalog)} ({100*after_terpenes/len(catalog):.1f}%)")


if __name__ == "__main__":
    main()
