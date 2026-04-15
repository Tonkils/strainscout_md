"""
tests/test_data_accuracy.py

Core data accuracy verification for the StrainScout catalog.
All tests are ADVISORY — they always pass but print warnings for issues found.

Run with:
    python -m unittest tests.test_data_accuracy -v
    python -m tests.test_data_accuracy                # standalone
"""

import re
import sys
import os
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import (
    load_catalog,
    VALID_CATEGORIES,
    VALID_CONFIDENCE,
    GROUND_TRUTH,
)


def _classify_by_name(name: str) -> str | None:
    """Quick keyword-based category detection for cross-checking.
    Returns the expected category if keywords strongly indicate one, else None.
    """
    n = name.lower().strip()

    # Other / junk
    if re.search(r't-shirt|shirt\b|tee\b|^shop\s|^browse\s|% off|% back', n):
        return "Other"
    if re.fullmatch(r'[\d\s]*(pack|ct)[\d\s]*', n):
        return "Other"

    # Pre-Roll
    if re.search(
        r'\bprj\b|pre[-\s]?roll|preroll|\bjoints?\b|\bblunt\b|mini\s+dogs?\b'
        r'|show\s+dog\b|\bdogwalkers?\b|swift\s+lifts?\b'
        r'|infused\s+\d+\s*[-]?\s*(?:pack|pk)\b'
        r'|\bhappy(?:-er)?\s+j[\u2019\']?s?\b|\bshorties?\b', n
    ):
        return "Pre-Roll"
    if re.search(r'\binfused\b', n) and re.search(r'(?:pack|pk)\b|\d+\s*(?:pack|pk)\b', n):
        return "Pre-Roll"

    # Vape
    if re.search(
        r'\bcart\b|cartridge|vaporizer|510|disposable'
        r'|\blr\s+pod\b|live\s+resin\s+cart|\bvape\b|\bpod\b|airopod|cloud\s+bar\b', n
    ):
        return "Vape"
    if re.search(r'\bairo\b', n):
        return "Vape"

    # Early edible check (gummies beat live resin)
    if re.search(r'gummy|gummies', n):
        return "Edible"

    # Concentrate
    if re.search(
        r'\bwax\b|\bdab\b|shatter|budder|badder|batter|\brosin\b|live\s+resin\b'
        r'|distillate|concentrate|extract|\bhash\b|kief\b|crumble|diamonds?\b'
        r'|\bsauce\b|\brso\b|\bfeco\b|\boil\b|tincture|live\s+sugar|cured\s+sugar'
        r'|full[-\s]spec|full\s+extract|\bfso\b|\bisolate\b|\bthca\b|\bbho\b|\bpho\b', n
    ):
        return "Concentrate"

    # Edible
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

    # Topical
    if re.search(r'topical|lotion|balm|\bpatch\b|salve|moisturizer', n):
        return "Topical"

    return None  # No strong signal


class TestCategoryAccuracy(unittest.TestCase):
    """Verify products are in the correct category."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()
        cls.flower = [p for p in cls.catalog if p.get("product_category", "Flower") == "Flower"]

    def test_all_products_have_category(self):
        """Every product has a non-empty product_category."""
        missing = [p["name"] for p in self.catalog if not p.get("product_category")]
        if missing:
            print(f"\n  [ADVISORY] {len(missing)} products missing product_category")
            for name in missing[:5]:
                print(f"    - {name}")

    def test_categories_are_valid(self):
        """All product_category values are one of the 7 standard categories."""
        invalid = []
        for p in self.catalog:
            cat = p.get("product_category", "")
            if cat and cat not in VALID_CATEGORIES:
                invalid.append((p["name"], cat))
        if invalid:
            print(f"\n  [ADVISORY] {len(invalid)} products with invalid category:")
            for name, cat in invalid[:5]:
                print(f"    - \"{name}\" → {cat}")

    def test_category_confidence_present(self):
        """Every product with a category has category_confidence."""
        missing = [
            p["name"] for p in self.catalog
            if p.get("product_category") and not p.get("category_confidence")
        ]
        if missing:
            print(f"\n  [ADVISORY] {len(missing)} products missing category_confidence")

    def test_category_confidence_valid(self):
        """All category_confidence values are valid."""
        invalid = []
        for p in self.catalog:
            conf = p.get("category_confidence", "")
            if conf and conf not in VALID_CONFIDENCE:
                invalid.append((p["name"], conf))
        if invalid:
            print(f"\n  [ADVISORY] {len(invalid)} products with invalid confidence: {invalid[:3]}")

    def test_no_vapes_in_flower(self):
        """Products with vape keywords should NOT be in Flower category."""
        vape_kw = re.compile(
            r'\bcart\b|cartridge|vaporizer|510|disposable|\bvape\b|\bpod\b'
            r'|airopod|cloud\s+bar\b|\bairo\b', re.IGNORECASE
        )
        miscategorized = [p["name"] for p in self.flower if vape_kw.search(p["name"])]
        if miscategorized:
            print(f"\n  [ADVISORY] {len(miscategorized)} vape products miscategorized as Flower:")
            for name in miscategorized[:10]:
                print(f"    - {name}")

    def test_no_edibles_in_flower(self):
        """Products with edible keywords should NOT be in Flower category."""
        edible_kw = re.compile(
            r'gummy|gummies|\d+mg\b|capsule|tablet|sparkling\s+water'
            r'|\bsoda\b|\bbeverage\b|\bdrink\b', re.IGNORECASE
        )
        miscategorized = [p["name"] for p in self.flower if edible_kw.search(p["name"])]
        if miscategorized:
            print(f"\n  [ADVISORY] {len(miscategorized)} edible products miscategorized as Flower:")
            for name in miscategorized[:10]:
                print(f"    - {name}")

    def test_no_concentrates_in_flower(self):
        """Products with concentrate keywords should NOT be in Flower category."""
        conc_kw = re.compile(
            r'\bwax\b|shatter|badder|batter|\brosin\b|\brso\b|\bisolate\b'
            r'|\bthca\b|kief\b|crumble|live\s+resin\b', re.IGNORECASE
        )
        # Exclude "Live Resin Cart" (that's a vape) and "Live Resin Gummies" (edible)
        miscategorized = []
        for p in self.flower:
            name = p["name"]
            if conc_kw.search(name):
                nl = name.lower()
                if "cart" in nl or "gummy" in nl or "gummies" in nl:
                    continue  # Not a concentrate
                miscategorized.append(name)
        if miscategorized:
            print(f"\n  [ADVISORY] {len(miscategorized)} concentrate products miscategorized as Flower:")
            for name in miscategorized[:10]:
                print(f"    - {name}")

    def test_no_prerolls_in_flower(self):
        """Products with pre-roll keywords should NOT be in Flower category."""
        preroll_kw = re.compile(
            r'pre[-\s]?roll|preroll|\bjoints?\b|\bblunt\b'
            r'|\bdogwalkers?\b|\bshorties?\b|\bhappy(?:-er)?\s+j', re.IGNORECASE
        )
        miscategorized = [p["name"] for p in self.flower if preroll_kw.search(p["name"])]
        if miscategorized:
            print(f"\n  [ADVISORY] {len(miscategorized)} pre-roll products miscategorized as Flower:")
            for name in miscategorized[:10]:
                print(f"    - {name}")

    def test_ground_truth_accuracy(self):
        """Check classifier accuracy against curated ground truth items."""
        # Build lookup by name
        catalog_by_name = {}
        for p in self.catalog:
            catalog_by_name[p["name"].lower().strip()] = p.get("product_category", "Flower")

        matched = 0
        mismatched = []
        not_found = 0
        for name, expected in GROUND_TRUTH:
            actual = catalog_by_name.get(name.lower().strip())
            if actual is None:
                not_found += 1
                continue
            if actual == expected:
                matched += 1
            else:
                mismatched.append((name, expected, actual))

        total_found = matched + len(mismatched)
        accuracy = matched / total_found * 100 if total_found else 0
        print(f"\n  Ground truth: {matched}/{total_found} correct ({accuracy:.1f}%), {not_found} not in catalog")
        if mismatched:
            print(f"  Mismatches:")
            for name, expected, actual in mismatched:
                print(f"    - \"{name}\": expected {expected}, got {actual}")

    def test_miscategorization_report(self):
        """Generate a full report of suspected miscategorizations."""
        issues: dict[str, list[str]] = {"Vape": [], "Edible": [], "Concentrate": [], "Pre-Roll": [], "Topical": [], "Other": []}
        for p in self.flower:
            suggested = _classify_by_name(p["name"])
            if suggested and suggested != "Flower":
                issues[suggested].append(p["name"])

        total = sum(len(v) for v in issues.values())
        if total:
            print(f"\n  [ADVISORY] {total} suspected miscategorizations in Flower:")
            for cat, names in sorted(issues.items(), key=lambda x: -len(x[1])):
                if names:
                    print(f"    {cat}: {len(names)} products")


class TestDataFreshness(unittest.TestCase):
    """Verify data timestamps and recency."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()

    def test_data_has_timestamps(self):
        """At least 60% of products have last_verified timestamps."""
        with_ts = sum(1 for p in self.catalog if p.get("last_verified"))
        pct = with_ts / len(self.catalog) * 100 if self.catalog else 0
        print(f"\n  Timestamp coverage: {with_ts}/{len(self.catalog)} ({pct:.1f}%)")
        if pct < 60:
            print(f"  [ADVISORY] Below 60% threshold — {100 - pct:.1f}% of products lack timestamps")

    def test_data_is_recent(self):
        """Newest last_verified is within 7 days of today."""
        dates = []
        for p in self.catalog:
            lv = p.get("last_verified")
            if lv:
                try:
                    dt = datetime.fromisoformat(lv.replace("Z", "+00:00"))
                    dates.append(dt)
                except (ValueError, TypeError):
                    pass

        if not dates:
            print("\n  [ADVISORY] No valid timestamps found — cannot check freshness")
            return

        newest = max(dates)
        now = datetime.now(timezone.utc)
        age_days = (now - newest).days
        print(f"\n  Newest data: {newest.strftime('%Y-%m-%d')} ({age_days} days ago)")
        if age_days > 7:
            print(f"  [ADVISORY] Data is {age_days} days old — should be refreshed weekly")

    def test_price_entries_have_dates(self):
        """Price entries have last_verified fields."""
        total_prices = 0
        prices_with_date = 0
        for p in self.catalog:
            for price in p.get("prices", []):
                total_prices += 1
                if price.get("last_verified"):
                    prices_with_date += 1

        pct = prices_with_date / total_prices * 100 if total_prices else 0
        print(f"\n  Price timestamp coverage: {prices_with_date}/{total_prices} ({pct:.1f}%)")

    def test_stale_data_report(self):
        """Report products with data older than 14 days."""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=14)
        stale = []
        for p in self.catalog:
            lv = p.get("last_verified")
            if lv:
                try:
                    dt = datetime.fromisoformat(lv.replace("Z", "+00:00"))
                    if dt < cutoff:
                        stale.append((p["name"], dt.strftime("%Y-%m-%d")))
                except (ValueError, TypeError):
                    pass

        if stale:
            print(f"\n  [ADVISORY] {len(stale)} products with data >14 days old")
            for name, date in stale[:5]:
                print(f"    - {name} (last verified: {date})")
        else:
            print(f"\n  All timestamped products are within 14-day window")


class TestNameAccuracy(unittest.TestCase):
    """Verify product name quality."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()

    def test_no_empty_names(self):
        """All products have non-empty, non-whitespace names."""
        empty = [i for i, p in enumerate(self.catalog) if not p.get("name", "").strip()]
        if empty:
            print(f"\n  [ADVISORY] {len(empty)} products with empty/blank names at indices: {empty[:10]}")

    def test_no_duplicate_ids(self):
        """No duplicate product IDs."""
        seen: dict[str, int] = {}
        dupes = []
        for p in self.catalog:
            pid = p.get("id", "")
            if pid in seen:
                dupes.append(pid)
            seen[pid] = seen.get(pid, 0) + 1

        if dupes:
            print(f"\n  [ADVISORY] {len(dupes)} duplicate IDs found:")
            for pid in dupes[:5]:
                print(f"    - {pid} (appears {seen[pid]}x)")

    def test_no_junk_names(self):
        """Names don't contain junk patterns (shop pages, discounts, t-shirts)."""
        junk_re = re.compile(r'^shop\s|^browse\s|% off|% back|t-shirt|shirt\b|tee\b', re.IGNORECASE)
        junk = [p["name"] for p in self.catalog if junk_re.search(p["name"])]
        if junk:
            print(f"\n  [ADVISORY] {len(junk)} junk product names:")
            for name in junk[:5]:
                print(f"    - \"{name}\"")

    def test_name_length_reasonable(self):
        """Names are between 2 and 200 characters."""
        too_short = [p["name"] for p in self.catalog if len(p.get("name", "")) < 2]
        too_long = [p["name"] for p in self.catalog if len(p.get("name", "")) > 200]
        if too_short:
            print(f"\n  [ADVISORY] {len(too_short)} names shorter than 2 chars: {too_short[:5]}")
        if too_long:
            print(f"\n  [ADVISORY] {len(too_long)} names longer than 200 chars")

    def test_no_html_in_names(self):
        """No HTML tags in product names."""
        html_re = re.compile(r'<[^>]+>')
        with_html = [p["name"] for p in self.catalog if html_re.search(p.get("name", ""))]
        if with_html:
            print(f"\n  [ADVISORY] {len(with_html)} names contain HTML tags:")
            for name in with_html[:5]:
                print(f"    - \"{name}\"")


class TestFieldCompleteness(unittest.TestCase):
    """Verify field coverage across the catalog."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()
        cls.total = len(cls.catalog)

    def _coverage(self, field: str, check_fn=None) -> tuple[int, float]:
        """Count products where field is present and non-empty."""
        if check_fn is None:
            check_fn = lambda p: bool(p.get(field))
        count = sum(1 for p in self.catalog if check_fn(p))
        pct = count / self.total * 100 if self.total else 0
        return count, pct

    def test_brand_coverage(self):
        """Report % of products with brand."""
        count, pct = self._coverage("brand")
        print(f"\n  Brand coverage: {count}/{self.total} ({pct:.1f}%)")
        if pct < 90:
            print(f"  [ADVISORY] Below 90% target — {self.total - count} products missing brand")

    def test_thc_coverage(self):
        """Report % of products with THC > 0."""
        count, pct = self._coverage("thc", lambda p: p.get("thc", 0) > 0)
        print(f"\n  THC coverage: {count}/{self.total} ({pct:.1f}%)")
        if pct < 70:
            print(f"  [ADVISORY] Below 70% target — {self.total - count} products missing THC")

    def test_price_coverage(self):
        """Report % of products with at least 1 price."""
        count, pct = self._coverage("prices", lambda p: len(p.get("prices", [])) > 0)
        print(f"\n  Price coverage: {count}/{self.total} ({pct:.1f}%)")
        if pct < 75:
            print(f"  [ADVISORY] Below 75% target — {self.total - count} products missing prices")

    def test_terpene_coverage(self):
        """Report % of products with terpenes."""
        count, pct = self._coverage(
            "terpenes",
            lambda p: any(t and t != "Not_Found" for t in p.get("terpenes", []))
        )
        print(f"\n  Terpene coverage: {count}/{self.total} ({pct:.1f}%)")
        if pct < 30:
            print(f"  [ADVISORY] Only {pct:.1f}% have terpene data — enrichment needed")

    def test_dispensary_coverage(self):
        """Products with prices should have matching dispensary entries."""
        mismatches = []
        for p in self.catalog:
            price_disps = {pr["dispensary"] for pr in p.get("prices", [])}
            listed_disps = set(p.get("dispensaries", []))
            missing = price_disps - listed_disps
            if missing:
                mismatches.append((p["name"], missing))

        if mismatches:
            print(f"\n  [ADVISORY] {len(mismatches)} products have dispensaries in prices but not in dispensaries list")

    def test_completeness_summary(self):
        """Print overall field completeness summary."""
        fields = {
            "name": lambda p: bool(p.get("name", "").strip()),
            "brand": lambda p: bool(p.get("brand")),
            "type": lambda p: bool(p.get("type")),
            "product_category": lambda p: bool(p.get("product_category")),
            "thc": lambda p: p.get("thc", 0) > 0,
            "cbd": lambda p: p.get("cbd", 0) > 0,
            "terpenes": lambda p: any(t and t != "Not_Found" for t in p.get("terpenes", [])),
            "prices": lambda p: len(p.get("prices", [])) > 0,
            "dispensaries": lambda p: len(p.get("dispensaries", [])) > 0,
            "last_verified": lambda p: bool(p.get("last_verified")),
            "description": lambda p: bool(p.get("description")),
            "genetics": lambda p: bool(p.get("genetics")),
        }
        print(f"\n  Field completeness ({self.total} products):")
        for field_name, check in fields.items():
            count = sum(1 for p in self.catalog if check(p))
            pct = count / self.total * 100 if self.total else 0
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            print(f"    {field_name:<18} {bar} {pct:5.1f}% ({count})")


if __name__ == "__main__":
    unittest.main(verbosity=2)
