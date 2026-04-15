#!/usr/bin/env python3
"""
pipeline/clean_catalog.py

Remove junk entries (shop pages, promos, t-shirts, bare pack counts)
from the production catalog.

Run:
    python -m pipeline.clean_catalog            # Remove junk and save
    python -m pipeline.clean_catalog --dry-run  # Preview without saving
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ── Input / output paths ────────────────────────────────────────────
WEB_CATALOG = ROOT / "web_2" / "public" / "data" / "strainscout_catalog_v10.min.json"
OUT_DIR = ROOT / "data" / "output"
OUT_MIN = OUT_DIR / "strainscout_catalog_v10.min.json"
OUT_PRETTY = OUT_DIR / "strainscout_catalog_v10.json"

# ── Junk-detection patterns ─────────────────────────────────────────

# Names that are bare pack/count strings like "5 Pack", "10ct", "20 Pack"
RE_BARE_PACK = re.compile(r"^[\d\s]*(pack|ct)[\d\s]*$", re.IGNORECASE)

# Shop / browse landing pages, promo discounts, apparel
RE_JUNK_NAME = re.compile(
    r"^shop\s|^browse\s|% off|% back|t-shirt|shirt\b|tee\b",
    re.IGNORECASE,
)

# Exact category-label names that snuck in as products
CATEGORY_LABELS = frozenset({
    "Edibles",
    "Beverages",
    "Vapes",
    "Flower and Infused",
    "Encore Edibles",
})


def is_junk(product: dict) -> str | None:
    """Return a human-readable reason if *product* is junk, else None."""
    cat = product.get("product_category", "")
    name = product.get("name", "")

    if cat == "Other":
        return 'product_category == "Other"'
    if RE_JUNK_NAME.search(name):
        return f"name matches junk pattern: {name!r}"
    if RE_BARE_PACK.match(name):
        return f"bare pack/count name: {name!r}"
    if name in CATEGORY_LABELS:
        return f"category-label name: {name!r}"

    return None


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Remove junk entries from the StrainScout catalog.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be removed without saving any files.",
    )
    args = parser.parse_args(argv)

    # ── Load ────────────────────────────────────────────────────────
    if not WEB_CATALOG.exists():
        print(f"ERROR: catalog not found at {WEB_CATALOG}", file=sys.stderr)
        sys.exit(1)

    with open(WEB_CATALOG, "r", encoding="utf-8") as fh:
        catalog: list[dict] = json.load(fh)

    total_before = len(catalog)
    print(f"Loaded {total_before} products from {WEB_CATALOG.relative_to(ROOT)}")

    # ── Classify ────────────────────────────────────────────────────
    keep: list[dict] = []
    removed: list[tuple[str, str]] = []  # (name, reason)

    for product in catalog:
        reason = is_junk(product)
        if reason:
            removed.append((product.get("name", "<no name>"), reason))
        else:
            keep.append(product)

    # ── Report ──────────────────────────────────────────────────────
    print(f"\n{'DRY RUN — ' if args.dry_run else ''}Removed {len(removed)} junk entries:\n")
    for name, reason in sorted(removed, key=lambda t: t[0].lower()):
        print(f"  ✕ {name:55s}  ({reason})")

    print(f"\nBefore: {total_before}  →  After: {len(keep)}  (removed {len(removed)})")

    if args.dry_run:
        print("\n--dry-run flag set; no files written.")
        return

    # ── Save ────────────────────────────────────────────────────────
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Web catalog (minified)
    with open(WEB_CATALOG, "w", encoding="utf-8") as fh:
        json.dump(keep, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"\nSaved minified → {WEB_CATALOG.relative_to(ROOT)}")

    # data/output minified
    with open(OUT_MIN, "w", encoding="utf-8") as fh:
        json.dump(keep, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"Saved minified → {OUT_MIN.relative_to(ROOT)}")

    # data/output pretty-printed
    with open(OUT_PRETTY, "w", encoding="utf-8") as fh:
        json.dump(keep, fh, indent=2, ensure_ascii=False)
    print(f"Saved pretty   → {OUT_PRETTY.relative_to(ROOT)}")

    print(f"\nFinal catalog: {len(keep)} products.")


if __name__ == "__main__":
    main()
