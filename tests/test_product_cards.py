"""
tests/test_product_cards.py

Category-specific product card field validation.
All tests are ADVISORY -- they always pass but print findings for review.

Run:
    python -m unittest tests.test_product_cards -v
    python -m tests.test_product_cards                # standalone
"""

import sys
import os
import unittest
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import (
    load_catalog,
    products_by_category,
    PRODUCT_CARD_SPECS,
    parse_weight,
    parse_quantity,
    parse_edible_type,
    parse_concentrate_type,
    parse_preroll_type,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pct(num: int, denom: int) -> float:
    return num / denom * 100 if denom else 0.0


def _has_price(product: dict) -> bool:
    return len(product.get("prices", [])) > 0


def _has_brand(product: dict) -> bool:
    return bool(product.get("brand", "").strip()) if isinstance(product.get("brand"), str) else bool(product.get("brand"))


def _has_thc(product: dict) -> bool:
    return (product.get("thc") or 0) > 0


# ---------------------------------------------------------------------------
# Flower
# ---------------------------------------------------------------------------

class TestFlowerCards(unittest.TestCase):
    """Product card field validation for Flower category."""

    @classmethod
    def setUpClass(cls):
        catalog = load_catalog()
        by_cat = products_by_category(catalog)
        cls.products = by_cat.get("Flower", [])

    def test_flower_has_price(self):
        """% of Flower products with at least one price entry."""
        total = len(self.products)
        with_price = sum(1 for p in self.products if _has_price(p))
        pct = _pct(with_price, total)
        print(f"\n  Flower price coverage: {with_price}/{total} ({pct:.1f}%)")
        if pct < 80:
            print(f"  [ADVISORY] Only {pct:.1f}% of Flower products have prices (target: 80%)")
        self.assertTrue(True)

    def test_flower_has_brand(self):
        """% of Flower products with non-empty brand."""
        total = len(self.products)
        with_brand = sum(1 for p in self.products if _has_brand(p))
        pct = _pct(with_brand, total)
        print(f"\n  Flower brand coverage: {with_brand}/{total} ({pct:.1f}%)")
        if pct < 85:
            print(f"  [ADVISORY] Only {pct:.1f}% of Flower products have brand (target: 85%)")
        self.assertTrue(True)

    def test_flower_has_thc(self):
        """% of Flower products with thc > 0."""
        total = len(self.products)
        with_thc = sum(1 for p in self.products if _has_thc(p))
        pct = _pct(with_thc, total)
        print(f"\n  Flower THC coverage: {with_thc}/{total} ({pct:.1f}%)")
        if pct < 75:
            print(f"  [ADVISORY] Only {pct:.1f}% of Flower products have THC > 0 (target: 75%)")
        self.assertTrue(True)

    def test_flower_weight_parseable(self):
        """Use parse_weight() on each Flower name; report extraction rate."""
        total = len(self.products)
        parsed = 0
        unparsed_examples: list[str] = []
        for p in self.products:
            name = p.get("name", "")
            if parse_weight(name):
                parsed += 1
            elif len(unparsed_examples) < 10:
                unparsed_examples.append(name)

        pct = _pct(parsed, total)
        print(f"\n  Flower weight parseable: {parsed}/{total} ({pct:.1f}%)")
        if unparsed_examples:
            print(f"  Examples without parseable weight:")
            for name in unparsed_examples[:5]:
                print(f"    - \"{name}\"")
        self.assertTrue(True)


# ---------------------------------------------------------------------------
# Edible
# ---------------------------------------------------------------------------

class TestEdibleCards(unittest.TestCase):
    """Product card field validation for Edible category."""

    @classmethod
    def setUpClass(cls):
        catalog = load_catalog()
        by_cat = products_by_category(catalog)
        cls.products = by_cat.get("Edible", [])

    def test_edible_has_price(self):
        """% of Edible products with at least one price entry."""
        total = len(self.products)
        with_price = sum(1 for p in self.products if _has_price(p))
        pct = _pct(with_price, total)
        print(f"\n  Edible price coverage: {with_price}/{total} ({pct:.1f}%)")
        if pct < 80:
            print(f"  [ADVISORY] Only {pct:.1f}% of Edible products have prices (target: 80%)")
        self.assertTrue(True)

    def test_edible_thc_format(self):
        """% of Edibles with thc > 0."""
        total = len(self.products)
        with_thc = sum(1 for p in self.products if _has_thc(p))
        pct = _pct(with_thc, total)
        print(f"\n  Edible THC coverage: {with_thc}/{total} ({pct:.1f}%)")
        if pct < 75:
            print(f"  [ADVISORY] Only {pct:.1f}% of Edible products have THC > 0 (target: 75%)")
        self.assertTrue(True)

    def test_edible_type_parseable(self):
        """Use parse_edible_type() on each Edible name; report extraction rate and breakdown."""
        total = len(self.products)
        type_counts: Counter = Counter()
        unparsed = 0
        for p in self.products:
            name = p.get("name", "")
            etype = parse_edible_type(name)
            if etype:
                type_counts[etype] += 1
            else:
                unparsed += 1

        parsed = total - unparsed
        pct = _pct(parsed, total)
        print(f"\n  Edible type parseable: {parsed}/{total} ({pct:.1f}%)")
        if type_counts:
            print(f"  Breakdown:")
            for etype, count in type_counts.most_common():
                print(f"    {etype}: {count}")
        if unparsed:
            print(f"  [ADVISORY] {unparsed} Edible products have no parseable type")
        self.assertTrue(True)


# ---------------------------------------------------------------------------
# Concentrate
# ---------------------------------------------------------------------------

class TestConcentrateCards(unittest.TestCase):
    """Product card field validation for Concentrate category."""

    @classmethod
    def setUpClass(cls):
        catalog = load_catalog()
        by_cat = products_by_category(catalog)
        cls.products = by_cat.get("Concentrate", [])

    def test_concentrate_has_price(self):
        """% of Concentrate products with at least one price entry."""
        total = len(self.products)
        with_price = sum(1 for p in self.products if _has_price(p))
        pct = _pct(with_price, total)
        print(f"\n  Concentrate price coverage: {with_price}/{total} ({pct:.1f}%)")
        if pct < 80:
            print(f"  [ADVISORY] Only {pct:.1f}% of Concentrate products have prices (target: 80%)")
        self.assertTrue(True)

    def test_concentrate_type_parseable(self):
        """Use parse_concentrate_type() on each Concentrate name; report extraction rate and breakdown."""
        total = len(self.products)
        type_counts: Counter = Counter()
        unparsed = 0
        unparsed_examples: list[str] = []
        for p in self.products:
            name = p.get("name", "")
            ctype = parse_concentrate_type(name)
            if ctype:
                type_counts[ctype] += 1
            else:
                unparsed += 1
                if len(unparsed_examples) < 5:
                    unparsed_examples.append(name)

        parsed = total - unparsed
        pct = _pct(parsed, total)
        print(f"\n  Concentrate type parseable: {parsed}/{total} ({pct:.1f}%)")
        if type_counts:
            print(f"  Breakdown:")
            for ctype, count in type_counts.most_common():
                print(f"    {ctype}: {count}")
        if unparsed_examples:
            print(f"  Examples without parseable type:")
            for name in unparsed_examples:
                print(f"    - \"{name}\"")
        self.assertTrue(True)


# ---------------------------------------------------------------------------
# Vape
# ---------------------------------------------------------------------------

class TestVapeCards(unittest.TestCase):
    """Product card field validation for Vape category."""

    @classmethod
    def setUpClass(cls):
        catalog = load_catalog()
        by_cat = products_by_category(catalog)
        cls.products = by_cat.get("Vape", [])

    def test_vape_has_price(self):
        """% of Vape products with at least one price entry."""
        total = len(self.products)
        with_price = sum(1 for p in self.products if _has_price(p))
        pct = _pct(with_price, total)
        print(f"\n  Vape price coverage: {with_price}/{total} ({pct:.1f}%)")
        if pct < 80:
            print(f"  [ADVISORY] Only {pct:.1f}% of Vape products have prices (target: 80%)")
        self.assertTrue(True)

    def test_vape_weight_parseable(self):
        """Use parse_weight() on each Vape name; report extraction rate."""
        total = len(self.products)
        parsed = 0
        unparsed_examples: list[str] = []
        for p in self.products:
            name = p.get("name", "")
            if parse_weight(name):
                parsed += 1
            elif len(unparsed_examples) < 5:
                unparsed_examples.append(name)

        pct = _pct(parsed, total)
        print(f"\n  Vape weight parseable: {parsed}/{total} ({pct:.1f}%)")
        if unparsed_examples:
            print(f"  Examples without parseable weight (0.5g, 1g, etc.):")
            for name in unparsed_examples:
                print(f"    - \"{name}\"")
        self.assertTrue(True)


# ---------------------------------------------------------------------------
# Pre-Roll
# ---------------------------------------------------------------------------

class TestPreRollCards(unittest.TestCase):
    """Product card field validation for Pre-Roll category."""

    @classmethod
    def setUpClass(cls):
        catalog = load_catalog()
        by_cat = products_by_category(catalog)
        cls.products = by_cat.get("Pre-Roll", [])

    def test_preroll_has_price(self):
        """% of Pre-Roll products with at least one price entry."""
        total = len(self.products)
        with_price = sum(1 for p in self.products if _has_price(p))
        pct = _pct(with_price, total)
        print(f"\n  Pre-Roll price coverage: {with_price}/{total} ({pct:.1f}%)")
        if pct < 80:
            print(f"  [ADVISORY] Only {pct:.1f}% of Pre-Roll products have prices (target: 80%)")
        self.assertTrue(True)

    def test_preroll_quantity_parseable(self):
        """Use parse_quantity() on each Pre-Roll name; report extraction rate."""
        total = len(self.products)
        parsed = 0
        unparsed_examples: list[str] = []
        for p in self.products:
            name = p.get("name", "")
            if parse_quantity(name):
                parsed += 1
            elif len(unparsed_examples) < 5:
                unparsed_examples.append(name)

        pct = _pct(parsed, total)
        print(f"\n  Pre-Roll quantity parseable: {parsed}/{total} ({pct:.1f}%)")
        if unparsed_examples:
            print(f"  Examples without parseable quantity (2pk, 5ct, etc.):")
            for name in unparsed_examples:
                print(f"    - \"{name}\"")
        self.assertTrue(True)

    def test_preroll_type_parseable(self):
        """Use parse_preroll_type() on each Pre-Roll name; report extraction rate and breakdown."""
        total = len(self.products)
        type_counts: Counter = Counter()
        unparsed = 0
        unparsed_examples: list[str] = []
        for p in self.products:
            name = p.get("name", "")
            ptype = parse_preroll_type(name)
            if ptype:
                type_counts[ptype] += 1
            else:
                unparsed += 1
                if len(unparsed_examples) < 5:
                    unparsed_examples.append(name)

        parsed = total - unparsed
        pct = _pct(parsed, total)
        print(f"\n  Pre-Roll type parseable: {parsed}/{total} ({pct:.1f}%)")
        if type_counts:
            print(f"  Breakdown:")
            for ptype, count in type_counts.most_common():
                print(f"    {ptype}: {count}")
        if unparsed_examples:
            print(f"  Examples without parseable type:")
            for name in unparsed_examples:
                print(f"    - \"{name}\"")
        self.assertTrue(True)


# ---------------------------------------------------------------------------
# Summary across all categories
# ---------------------------------------------------------------------------

class TestProductCardSummary(unittest.TestCase):
    """Cross-category product card completeness summary."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()
        cls.by_cat = products_by_category(cls.catalog)

    def _field_populated(self, product: dict, field: str) -> bool:
        """Check whether a display field is populated for the given product."""
        if field == "price":
            return _has_price(product)
        if field == "dispensaries":
            return len(product.get("dispensaries", [])) > 0
        if field == "thc":
            return _has_thc(product)
        if field == "cbd":
            return (product.get("cbd") or 0) > 0
        if field == "terpenes":
            terps = product.get("terpenes", [])
            return any(t and t != "Not_Found" for t in terps)
        if field == "date_scraped":
            return bool(product.get("last_verified") or product.get("date_scraped"))
        # Generic string fields: name, brand, type, strain, etc.
        val = product.get(field, "")
        if isinstance(val, str):
            return bool(val.strip())
        return bool(val)

    def test_card_completeness_summary(self):
        """For each category, calculate % of required_display fields populated."""
        print(f"\n  {'Category':<16} {'Required Fields':<18} {'Avg Coverage'}")
        print(f"  {'-' * 16} {'-' * 18} {'-' * 12}")

        for category, spec in PRODUCT_CARD_SPECS.items():
            products = self.by_cat.get(category, [])
            required = spec.get("required_display", [])
            total_fields = len(required)

            if not products or not required:
                print(f"  {category:<16} {'0/' + str(total_fields):<18} {'N/A':>12}")
                continue

            # For each product, count how many required fields are populated
            product_coverages = []
            field_counts: Counter = Counter()
            for p in products:
                populated = 0
                for field in required:
                    if self._field_populated(p, field):
                        populated += 1
                        field_counts[field] += 1
                product_coverages.append(populated / total_fields * 100)

            avg_coverage = sum(product_coverages) / len(product_coverages)
            fields_label = f"{total_fields}/{total_fields}"
            print(f"  {category:<16} {fields_label:<18} {avg_coverage:>10.1f}%")

            # Per-field detail
            for field in required:
                count = field_counts[field]
                field_pct = _pct(count, len(products))
                print(f"    {field:<14} {count:>5}/{len(products):<5} ({field_pct:.1f}%)")

        self.assertTrue(True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
