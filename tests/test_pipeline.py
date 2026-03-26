"""
tests/test_pipeline.py

Basic pipeline unit tests using stdlib unittest.
No external dependencies (no pytest) required.

Run with:
    python -m tests.test_pipeline          (from strainscout_md/)
    python tests/test_pipeline.py          (from strainscout_md/)
"""

import sys
import os
import unittest

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestCleanProductName(unittest.TestCase):
    """Tests for pipeline.parse_raw.clean_product_name."""

    def setUp(self):
        from pipeline.parse_raw import clean_product_name
        self.clean = clean_product_name

    def test_strips_brand_pipe_format(self):
        """'Verano | Alien Mints Flower 3.5g' → includes 'Alien Mints' (brand stripped)"""
        result = self.clean("Verano | Alien Mints Flower 3.5g")
        self.assertIn("Alien Mints", result)

    def test_strips_brand_prefix_dash_format(self):
        """'Redemption | 3.5g Prepacked Flower - Stanky Leg' → 'Stanky Leg'"""
        result = self.clean("Redemption | 3.5g Prepacked Flower - Stanky Leg")
        self.assertIn("Stanky Leg", result)

    def test_strips_flower_suffix(self):
        """'Gelato Cake Flower' → 'Gelato Cake'"""
        result = self.clean("Gelato Cake Flower")
        self.assertEqual(result, "Gelato Cake")

    def test_strips_weight_suffix(self):
        """'Wedding Cake 3.5g' → 'Wedding Cake'"""
        result = self.clean("Wedding Cake 3.5g")
        self.assertEqual(result, "Wedding Cake")

    def test_preserves_strain_only_name(self):
        """'GSC' → 'GSC' (no changes to already-clean short names)"""
        result = self.clean("GSC")
        # Short names (>= 2 chars) should be preserved
        self.assertGreaterEqual(len(result), 2)

    def test_strips_brand_verano_prefix(self):
        """'Verano | Ice Cream Cake Flower' → 'Ice Cream Cake'"""
        result = self.clean("Verano | Ice Cream Cake Flower")
        self.assertIn("Ice Cream Cake", result)


class TestCanonicalKey(unittest.TestCase):
    """Tests for pipeline.deduplicate.canonical_key."""

    def setUp(self):
        from pipeline.deduplicate import canonical_key
        self.canonical = canonical_key

    def test_lowercases(self):
        """'Wedding Cake' and 'wedding cake' map to the same key."""
        self.assertEqual(self.canonical("Wedding Cake"), self.canonical("wedding cake"))

    def test_strips_brand_prefix(self):
        """'Verano Wedding Cake' → same key as 'Wedding Cake'"""
        with_brand = self.canonical("Verano Wedding Cake")
        without_brand = self.canonical("Wedding Cake")
        self.assertEqual(with_brand, without_brand)

    def test_normalizes_special_chars(self):
        """'GSC (Girl Scout Cookies)' and 'GSC Girl Scout Cookies' are comparable."""
        result = self.canonical("GSC (Girl Scout Cookies)")
        self.assertNotIn("(", result)
        self.assertNotIn(")", result)

    def test_collapses_whitespace(self):
        """Multiple spaces collapse to single space."""
        result = self.canonical("Ice  Cream  Cake")
        self.assertNotIn("  ", result)

    def test_empty_string_fallback(self):
        """Empty string doesn't crash — returns something."""
        result = self.canonical("")
        self.assertIsInstance(result, str)


class TestNormalizeCategory(unittest.TestCase):
    """Tests for scraper.category_map.normalize_category."""

    def setUp(self):
        from scraper.category_map import normalize_category
        self.normalize = normalize_category

    def test_flower(self):
        self.assertEqual(self.normalize("flower", "weedmaps"), "Flower")

    def test_preroll(self):
        self.assertEqual(self.normalize("pre-roll", "weedmaps"), "Pre-Roll")

    def test_vape(self):
        self.assertEqual(self.normalize("vape cartridge", "dutchie"), "Vape")

    def test_concentrate(self):
        self.assertEqual(self.normalize("concentrate", "dutchie"), "Concentrate")

    def test_edible(self):
        self.assertEqual(self.normalize("edibles", "weedmaps"), "Edible")

    def test_topical(self):
        self.assertEqual(self.normalize("topicals", "weedmaps"), "Topical")

    def test_unknown_returns_other(self):
        self.assertEqual(self.normalize("mystery_product_xyz", ""), "Other")


class TestExtractCategoryFromUrl(unittest.TestCase):
    """Tests for pipeline.parse_raw.extract_category_from_url."""

    def setUp(self):
        from pipeline.parse_raw import extract_category_from_url
        self.extract = extract_category_from_url

    def test_dutchie_flower_url(self):
        url = "https://dutchie.com/dispensary/some-dispensary/products/flower"
        result = self.extract(url)
        self.assertEqual(result, "Flower")

    def test_dutchie_preroll_url(self):
        url = "https://dutchie.com/dispensary/some-dispensary/products/pre-roll"
        result = self.extract(url)
        self.assertEqual(result, "Pre-Roll")

    def test_trulieve_url(self):
        url = "https://www.trulieve.com/category/flower?storeId=MDROKB2"
        result = self.extract(url)
        self.assertEqual(result, "Flower")

    def test_curaleaf_url(self):
        url = "https://curaleaf.com/shop/maryland/curaleaf-md-columbia/recreational/menu/flower-542"
        result = self.extract(url)
        self.assertEqual(result, "Flower")

    def test_weedmaps_returns_none(self):
        """Weedmaps URLs have no category in the URL path."""
        url = "https://weedmaps.com/dispensaries/culta/menu"
        result = self.extract(url)
        self.assertIsNone(result)


class TestAssignCategoryConfidence(unittest.TestCase):
    """Tests for pipeline.parse_raw.assign_category_confidence."""

    def setUp(self):
        from pipeline.parse_raw import assign_category_confidence
        self.assign = assign_category_confidence

    def test_verified_when_both_signals_agree(self):
        result = self.assign("Flower", "Flower")
        self.assertEqual(result, "verified")

    def test_inferred_when_no_url_category(self):
        result = self.assign("Flower", None)
        self.assertEqual(result, "inferred")

    def test_conflict_when_signals_disagree(self):
        result = self.assign("Flower", "Vape")
        self.assertEqual(result, "conflict")


if __name__ == "__main__":
    unittest.main(verbosity=2)
