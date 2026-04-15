"""
tests/verify_data.py

Orchestrator-friendly data accuracy verification runner.
Produces a graded JSON report or human-readable summary.

Usage:
    python -m tests.verify_data                              # Human-readable
    python -m tests.verify_data --json                       # JSON to stdout
    python -m tests.verify_data --json --out report.json     # JSON to file
    python -m tests.verify_data --catalog path/to/file.json  # Custom catalog
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import (
    load_catalog,
    products_by_category,
    VALID_CATEGORIES,
    PRODUCT_CARD_SPECS,
    parse_weight,
    parse_quantity,
    parse_edible_type,
    parse_concentrate_type,
    parse_preroll_type,
)


# ── Grading ───────────────────────────────────────────────────────────────────

def grade_from_score(score: float) -> str:
    if score >= 90:
        return "A"
    if score >= 70:
        return "B"
    if score >= 50:
        return "C"
    return "F"


# ── Classifier (same regex logic as test_data_accuracy.py) ────────────────────

def _classify_by_name(name: str) -> str | None:
    """Quick keyword-based category detection for cross-checking."""
    n = name.lower().strip()

    if re.search(r't-shirt|shirt\b|tee\b|^shop\s|^browse\s|% off|% back', n):
        return "Other"
    if re.fullmatch(r'[\d\s]*(pack|ct)[\d\s]*', n):
        return "Other"

    if re.search(
        r'\bprj\b|pre[-\s]?roll|preroll|\bjoints?\b|\bblunt\b|mini\s+dogs?\b'
        r'|show\s+dog\b|\bdogwalkers?\b|swift\s+lifts?\b'
        r'|infused\s+\d+\s*[-]?\s*(?:pack|pk)\b'
        r'|\bhappy(?:-er)?\s+j[\u2019\']?s?\b|\bshorties?\b', n
    ):
        return "Pre-Roll"
    if re.search(r'\binfused\b', n) and re.search(r'(?:pack|pk)\b|\d+\s*(?:pack|pk)\b', n):
        return "Pre-Roll"

    if re.search(
        r'\bcart\b|cartridge|vaporizer|510|disposable'
        r'|\blr\s+pod\b|live\s+resin\s+cart|\bvape\b|\bpod\b|airopod|cloud\s+bar\b', n
    ):
        return "Vape"
    if re.search(r'\bairo\b', n):
        return "Vape"

    if re.search(r'gummy|gummies', n):
        return "Edible"

    if re.search(
        r'\bwax\b|\bdab\b|shatter|budder|badder|batter|\brosin\b|live\s+resin\b'
        r'|distillate|concentrate|extract|\bhash\b|kief\b|crumble|diamonds?\b'
        r'|\bsauce\b|\brso\b|\bfeco\b|\boil\b|tincture|live\s+sugar|cured\s+sugar'
        r'|full[-\s]spec|full\s+extract|\bfso\b|\bisolate\b|\bthca\b|\bbho\b|\bpho\b', n
    ):
        return "Concentrate"

    if re.search(r'chocolate|lozenge|\bcaramel\b|\bmochi\b|macaroon', n):
        return "Edible"
    if re.search(
        r'chews?\b|jellies?\b|\bdiscos\b|\belixir\b|quick\s*kicks?\b'
        r'|sparkling\s+water|\bsoda\b|\bbeverage\b|\bdrink\b|\bcapsule|\btablet\b'
        r'|syrup|baked\s+bites', n
    ):
        return "Edible"
    if re.search(r'\d+mg\b', n):
        return "Edible"
    if re.search(r'\bwana\b|\bsmokiez\b|\bdixie\b|\bkeef\b', n):
        return "Edible"

    if re.search(r'topical|lotion|balm|\bpatch\b|salve|moisturizer', n):
        return "Topical"

    return None


# ── Section checkers ──────────────────────────────────────────────────────────

def check_category_accuracy(catalog: list[dict]) -> dict:
    """Check category accuracy by detecting keyword mismatches."""
    by_cat: dict[str, int] = {}
    for p in catalog:
        cat = p.get("product_category", "Flower")
        by_cat[cat] = by_cat.get(cat, 0) + 1

    flower = [p for p in catalog if p.get("product_category", "Flower") == "Flower"]
    details = []
    for p in flower:
        suggested = _classify_by_name(p["name"])
        if suggested and suggested != "Flower":
            details.append({
                "name": p["name"],
                "current": "Flower",
                "suggested": suggested,
            })

    total = len(catalog)
    miscategorized = len(details)
    score = (total - miscategorized) / total * 100 if total else 100

    return {
        "grade": grade_from_score(score),
        "score": round(score, 1),
        "miscategorized_count": miscategorized,
        "by_category": by_cat,
        "details": details[:50],
    }


def check_field_completeness(catalog: list[dict]) -> dict:
    """Check field coverage across the catalog."""
    total = len(catalog)
    if total == 0:
        return {"grade": "F", "score": 0}

    brand_count = sum(1 for p in catalog if p.get("brand"))
    thc_count = sum(1 for p in catalog if p.get("thc", 0) > 0)
    price_count = sum(1 for p in catalog if len(p.get("prices", [])) > 0)
    terpene_count = sum(
        1 for p in catalog
        if any(t and t != "Not_Found" for t in p.get("terpenes", []))
    )
    disp_count = sum(1 for p in catalog if len(p.get("dispensaries", [])) > 0)

    brand_pct = brand_count / total * 100
    thc_pct = thc_count / total * 100
    price_pct = price_count / total * 100
    terpene_pct = terpene_count / total * 100
    disp_pct = disp_count / total * 100

    # Weighted average
    score = (brand_pct * 0.25 + thc_pct * 0.25 + price_pct * 0.30
             + terpene_pct * 0.10 + disp_pct * 0.10)

    return {
        "grade": grade_from_score(score),
        "score": round(score, 1),
        "brand_coverage": round(brand_pct, 1),
        "thc_coverage": round(thc_pct, 1),
        "price_coverage": round(price_pct, 1),
        "terpene_coverage": round(terpene_pct, 1),
        "dispensary_coverage": round(disp_pct, 1),
        "missing_brand": total - brand_count,
        "missing_thc": total - thc_count,
        "missing_prices": total - price_count,
        "missing_terpenes": total - terpene_count,
    }


def check_data_freshness(catalog: list[dict]) -> dict:
    """Check data timestamps and recency."""
    now = datetime.now(timezone.utc)
    dates = []
    for p in catalog:
        lv = p.get("last_verified")
        if lv:
            try:
                dt = datetime.fromisoformat(lv.replace("Z", "+00:00"))
                dates.append(dt)
            except (ValueError, TypeError):
                pass

    total = len(catalog)
    with_dates = len(dates)
    if not dates:
        return {
            "grade": "F",
            "score": 0,
            "products_with_dates": 0,
            "total_products": total,
            "newest_date": None,
            "oldest_date": None,
            "stale_count": total,
            "age_days": None,
        }

    newest = max(dates)
    oldest = min(dates)
    age_days = (now - newest).days

    cutoff_7d = now - timedelta(days=7)
    cutoff_14d = now - timedelta(days=14)
    within_7d = sum(1 for d in dates if d >= cutoff_7d)
    stale = sum(1 for d in dates if d < cutoff_14d)

    score = within_7d / total * 100 if total else 0

    return {
        "grade": grade_from_score(score),
        "score": round(score, 1),
        "products_with_dates": with_dates,
        "total_products": total,
        "newest_date": newest.strftime("%Y-%m-%d"),
        "oldest_date": oldest.strftime("%Y-%m-%d"),
        "age_days": age_days,
        "stale_count": stale,
        "within_7_days": within_7d,
    }


def check_name_quality(catalog: list[dict]) -> dict:
    """Check product name quality."""
    total = len(catalog)
    junk_re = re.compile(r'^shop\s|^browse\s|% off|% back|t-shirt|shirt\b|tee\b', re.IGNORECASE)
    html_re = re.compile(r'<[^>]+>')

    junk = sum(1 for p in catalog if junk_re.search(p.get("name", "")))
    empty = sum(1 for p in catalog if not p.get("name", "").strip())
    html = sum(1 for p in catalog if html_re.search(p.get("name", "")))

    # Duplicate IDs
    ids = [p.get("id", "") for p in catalog]
    dupes = len(ids) - len(set(ids))

    issues = junk + empty + html + dupes
    score = (total - issues) / total * 100 if total else 100

    return {
        "grade": grade_from_score(score),
        "score": round(score, 1),
        "junk_names": junk,
        "empty_names": empty,
        "html_in_names": html,
        "duplicate_ids": dupes,
        "total_issues": issues,
    }


def check_dispensary_links(catalog: list[dict]) -> dict:
    """Check dispensary link quality."""
    total_links = 0
    valid_links = 0
    broken_format = 0
    products_with_links = 0
    products_with_dispensaries = 0

    for p in catalog:
        disps = p.get("dispensaries", [])
        if disps:
            products_with_dispensaries += 1
        links = p.get("dispensary_links", {})
        if links:
            products_with_links += 1
        for url in links.values():
            total_links += 1
            if isinstance(url, str) and url.startswith(("http://", "https://")):
                valid_links += 1
            else:
                broken_format += 1

    score = valid_links / total_links * 100 if total_links else 100

    return {
        "grade": grade_from_score(score),
        "score": round(score, 1),
        "total_links": total_links,
        "valid_links": valid_links,
        "broken_format": broken_format,
        "products_with_links": products_with_links,
        "products_with_dispensaries": products_with_dispensaries,
    }


def check_product_cards(catalog: list[dict]) -> dict:
    """Check category-specific product card field completeness."""
    groups = products_by_category(catalog)
    by_category: dict[str, dict] = {}

    for cat, spec in PRODUCT_CARD_SPECS.items():
        products = groups.get(cat, [])
        if not products:
            by_category[cat] = {"count": 0, "completeness": 0, "missing_fields": []}
            continue

        n = len(products)
        field_checks = {
            "name": lambda p: bool(p.get("name", "").strip()),
            "brand": lambda p: bool(p.get("brand")),
            "price": lambda p: len(p.get("prices", [])) > 0,
            "dispensaries": lambda p: len(p.get("dispensaries", [])) > 0,
            "thc": lambda p: p.get("thc", 0) > 0,
            "cbd": lambda p: True,  # CBD is often 0 legitimately
            "terpenes": lambda p: any(t and t != "Not_Found" for t in p.get("terpenes", [])),
            "date_scraped": lambda p: bool(p.get("last_verified")),
        }

        # Check required fields
        field_coverage: dict[str, float] = {}
        for field in spec["required_display"]:
            check = field_checks.get(field, lambda p: True)
            count = sum(1 for p in products if check(p))
            field_coverage[field] = count / n * 100

        # Check desired fields (parsed from name)
        desired_parsers = {
            "weight": parse_weight,
            "strain": lambda name: name,  # Always has name
            "quantity": parse_quantity,
            "edible_type": parse_edible_type,
            "concentrate_type": parse_concentrate_type,
            "amount": parse_weight,  # Reuse weight parser
            "weight_or_quantity": lambda name: parse_weight(name) or parse_quantity(name),
            "preroll_type": parse_preroll_type,
        }
        desired_coverage: dict[str, float] = {}
        for field in spec.get("desired_display", []):
            parser = desired_parsers.get(field)
            if parser:
                count = sum(1 for p in products if parser(p["name"]))
                desired_coverage[field] = count / n * 100

        avg_required = sum(field_coverage.values()) / len(field_coverage) if field_coverage else 0
        missing = [f for f, pct in field_coverage.items() if pct < 50]

        by_category[cat] = {
            "count": n,
            "completeness": round(avg_required, 1),
            "field_coverage": {k: round(v, 1) for k, v in field_coverage.items()},
            "desired_coverage": {k: round(v, 1) for k, v in desired_coverage.items()},
            "missing_fields": missing,
        }

    # Average completeness
    scores = [v["completeness"] for v in by_category.values() if v["count"] > 0]
    avg_score = sum(scores) / len(scores) if scores else 0

    return {
        "grade": grade_from_score(avg_score),
        "score": round(avg_score, 1),
        "by_category": by_category,
    }


# ── Report generator ──────────────────────────────────────────────────────────

def generate_report(catalog: list[dict], catalog_path: str) -> dict:
    """Generate the full accuracy report."""
    sections = {
        "category_accuracy": check_category_accuracy(catalog),
        "field_completeness": check_field_completeness(catalog),
        "data_freshness": check_data_freshness(catalog),
        "name_quality": check_name_quality(catalog),
        "dispensary_links": check_dispensary_links(catalog),
        "product_cards": check_product_cards(catalog),
    }

    # Weighted overall score
    weights = {
        "category_accuracy": 0.30,
        "field_completeness": 0.25,
        "data_freshness": 0.20,
        "name_quality": 0.10,
        "dispensary_links": 0.10,
        "product_cards": 0.05,
    }
    overall = sum(sections[k]["score"] * w for k, w in weights.items())

    # Action items
    actions = []
    ca = sections["category_accuracy"]
    if ca["miscategorized_count"] > 0:
        actions.append(f"FIX: {ca['miscategorized_count']} products miscategorized as Flower (run category reclassification)")

    fc = sections["field_completeness"]
    if fc["terpene_coverage"] < 30:
        actions.append(f"IMPROVE: {100 - fc['terpene_coverage']:.1f}% of products missing terpene data")
    if fc["brand_coverage"] < 90:
        actions.append(f"FIX: {fc['missing_brand']} products missing brand information")
    if fc["price_coverage"] < 75:
        actions.append(f"FIX: {fc['missing_prices']} products have no price data")

    df = sections["data_freshness"]
    if df.get("age_days") and df["age_days"] > 7:
        actions.append(f"REFRESH: Data is {df['age_days']} days old — run scraping pipeline")
    if df["stale_count"] > 0:
        actions.append(f"REFRESH: {df['stale_count']} products have data older than 14 days")

    nq = sections["name_quality"]
    if nq["junk_names"] > 0:
        actions.append(f"FIX: {nq['junk_names']} junk product names (t-shirts, shop pages)")
    if nq["duplicate_ids"] > 0:
        actions.append(f"FIX: {nq['duplicate_ids']} duplicate product IDs")

    # Catalog version
    version = "unknown"
    if catalog:
        version = catalog[0].get("catalog_version", "unknown")

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "catalog_path": str(catalog_path),
        "catalog_version": version,
        "total_products": len(catalog),
        "overall_score": round(overall, 1),
        "overall_grade": grade_from_score(overall),
        "sections": sections,
        "action_items": actions,
    }


# ── Human-readable output ────────────────────────────────────────────────────

def print_report(report: dict) -> None:
    """Print a formatted human-readable report."""
    W = 65

    print(f"\n{'═' * W}")
    print(f"  STRAINSCOUT DATA ACCURACY REPORT")
    print(f"  Catalog: {Path(report['catalog_path']).name} ({report['total_products']} products)")
    print(f"  Generated: {report['timestamp'][:10]}")
    print(f"{'═' * W}")

    sections = report["sections"]

    # Category accuracy
    ca = sections["category_accuracy"]
    print(f"\n  CATEGORY ACCURACY {'.' * 22} {ca['grade']} ({ca['score']}%)")
    cats = ca["by_category"]
    cat_line = " | ".join(f"{k}: {v}" for k, v in sorted(cats.items(), key=lambda x: -x[1]))
    print(f"    {cat_line}")
    if ca["miscategorized_count"]:
        print(f"    ⚠ {ca['miscategorized_count']} suspected miscategorizations in Flower")

    # Field completeness
    fc = sections["field_completeness"]
    print(f"\n  FIELD COMPLETENESS {'.' * 21} {fc['grade']} ({fc['score']}%)")
    for field in ["brand_coverage", "thc_coverage", "price_coverage", "terpene_coverage", "dispensary_coverage"]:
        pct = fc[field]
        bar_filled = int(pct / 5)
        bar = "█" * bar_filled + "░" * (20 - bar_filled)
        label = field.replace("_coverage", "").capitalize()
        print(f"    {label:<12} {bar} {pct:5.1f}%")

    # Data freshness
    df = sections["data_freshness"]
    print(f"\n  DATA FRESHNESS {'.' * 25} {df['grade']} ({df['score']}%)")
    if df.get("newest_date"):
        print(f"    Newest: {df['newest_date']} ({df.get('age_days', '?')} days ago)")
        print(f"    Products with dates: {df['products_with_dates']}/{df['total_products']}")
    else:
        print(f"    No timestamps found")

    # Name quality
    nq = sections["name_quality"]
    print(f"\n  NAME QUALITY {'.' * 27} {nq['grade']} ({nq['score']}%)")
    if nq["total_issues"] == 0:
        print(f"    No junk names, no duplicates, no HTML")
    else:
        if nq["junk_names"]:
            print(f"    ⚠ {nq['junk_names']} junk names")
        if nq["duplicate_ids"]:
            print(f"    ⚠ {nq['duplicate_ids']} duplicate IDs")

    # Dispensary links
    dl = sections["dispensary_links"]
    print(f"\n  DISPENSARY LINKS {'.' * 23} {dl['grade']} ({dl['score']}%)")
    print(f"    {dl['valid_links']} valid links, {dl['broken_format']} broken format")

    # Product cards
    pc = sections["product_cards"]
    print(f"\n  PRODUCT CARDS {'.' * 26} {pc['grade']} ({pc['score']}%)")
    for cat, data in pc["by_category"].items():
        if data["count"] > 0:
            print(f"    {cat:<14} {data['completeness']:5.1f}% complete ({data['count']} products)")
            if data.get("desired_coverage"):
                for field, pct in data["desired_coverage"].items():
                    print(f"      {field}: {pct:.0f}% parseable from name")

    # Overall
    print(f"\n{'═' * W}")
    print(f"  OVERALL GRADE: {report['overall_grade']} ({report['overall_score']}%)")
    print(f"{'═' * W}")

    # Action items
    if report["action_items"]:
        print(f"\n  ACTION ITEMS:")
        for i, item in enumerate(report["action_items"], 1):
            print(f"  {i}. {item}")
    print()


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="StrainScout data accuracy verification")
    parser.add_argument("--catalog", type=str, default=None, help="Path to catalog JSON")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of human-readable")
    parser.add_argument("--out", type=str, default=None, help="Write JSON to file (implies --json)")
    args = parser.parse_args()

    if args.out:
        args.json = True

    catalog = load_catalog(args.catalog)

    # Determine which path was actually used
    catalog_path = args.catalog or "auto-discovered"
    for candidate in [
        Path("data/output/strainscout_catalog_v10.min.json"),
        Path("web_2/public/data/strainscout_catalog_v10.min.json"),
    ]:
        if candidate.exists():
            catalog_path = str(candidate)
            break

    report = generate_report(catalog, catalog_path)

    if args.json:
        output = json.dumps(report, indent=2, ensure_ascii=False)
        if args.out:
            out_path = Path(args.out)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(output, encoding="utf-8")
            print(f"Report written to {args.out}", file=sys.stderr)
        else:
            print(output)
    else:
        print_report(report)


if __name__ == "__main__":
    main()
