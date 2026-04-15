"""
tests/test_dispensary_links.py

Dispensary link and data verification.
Run: python -m unittest tests.test_dispensary_links -v
"""

import sys
import os
import re
import unittest
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import load_catalog


class TestDispensaryData(unittest.TestCase):
    """Verify dispensary names, links, and ordering data."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()

    def test_dispensary_links_present(self):
        """Products that have dispensaries should have dispensary_links.
        Report % coverage and any products with dispensaries but no links."""
        with_disps = [p for p in self.catalog if p.get("dispensaries")]
        missing_links = [
            p for p in with_disps
            if not p.get("dispensary_links")
        ]
        total = len(with_disps)
        covered = total - len(missing_links)
        pct = covered / total * 100 if total else 0
        print(f"\n  Dispensary link coverage: {covered}/{total} ({pct:.1f}%)")
        if missing_links:
            print(f"  [ADVISORY] {len(missing_links)} products have dispensaries but no dispensary_links:")
            for p in missing_links[:10]:
                print(f"    - \"{p['name']}\" ({len(p['dispensaries'])} dispensaries)")

    def test_dispensary_links_are_urls(self):
        """All values in dispensary_links should start with http:// or https://."""
        bad = []
        for p in self.catalog:
            links = p.get("dispensary_links", {})
            if not isinstance(links, dict):
                continue
            for disp_name, url in links.items():
                if not isinstance(url, str) or not re.match(r'https?://', url):
                    bad.append((p["name"], disp_name, url))
        if bad:
            print(f"\n  [ADVISORY] {len(bad)} dispensary_links values are not valid URLs:")
            for prod, disp, url in bad[:10]:
                print(f"    - \"{prod}\" / \"{disp}\": {url!r}")
        else:
            print(f"\n  All dispensary_links values are valid URLs")

    def test_ordering_links_format(self):
        """If ordering_links exists, each value should be a dict (possibly with
        dutchie/weedmaps keys) or a string URL. Report malformed entries."""
        malformed = []
        for p in self.catalog:
            ol = p.get("ordering_links")
            if not ol or not isinstance(ol, dict):
                continue
            for disp_name, value in ol.items():
                if isinstance(value, str):
                    # String URL is valid
                    if not re.match(r'https?://', value):
                        malformed.append((p["name"], disp_name, value, "string is not a URL"))
                elif isinstance(value, dict):
                    # Dict with optional dutchie/weedmaps keys is valid
                    for k, v in value.items():
                        if not isinstance(v, str) or not re.match(r'https?://', v):
                            malformed.append((p["name"], disp_name, v, f"nested key '{k}' is not a URL"))
                else:
                    malformed.append((p["name"], disp_name, value, f"unexpected type {type(value).__name__}"))
        if malformed:
            print(f"\n  [ADVISORY] {len(malformed)} malformed ordering_links entries:")
            for prod, disp, val, reason in malformed[:10]:
                print(f"    - \"{prod}\" / \"{disp}\": {val!r} ({reason})")
        else:
            print(f"\n  All ordering_links entries are well-formed")

    def test_dispensary_names_consistent(self):
        """Collect all dispensary names from dispensaries arrays and prices arrays.
        Report any that look like duplicates (case-insensitive matches with different
        capitalization/spelling)."""
        all_names: set[str] = set()
        for p in self.catalog:
            for d in p.get("dispensaries", []):
                if isinstance(d, str) and d.strip():
                    all_names.add(d)
            for pr in p.get("prices", []):
                d = pr.get("dispensary", "")
                if isinstance(d, str) and d.strip():
                    all_names.add(d)

        # Group by lowercased name
        groups: dict[str, list[str]] = {}
        for name in all_names:
            key = name.strip().lower()
            groups.setdefault(key, []).append(name)

        dupes = {k: v for k, v in groups.items() if len(v) > 1}
        if dupes:
            print(f"\n  [ADVISORY] {len(dupes)} dispensary name groups with inconsistent casing/spelling:")
            for key, variants in sorted(dupes.items())[:15]:
                print(f"    - {variants}")
        else:
            print(f"\n  All {len(all_names)} dispensary names are consistent")

    def test_no_empty_dispensary_names(self):
        """No blank/empty dispensary names in prices array or dispensaries list."""
        empty_in_disps = []
        empty_in_prices = []
        for p in self.catalog:
            for d in p.get("dispensaries", []):
                if not isinstance(d, str) or not d.strip():
                    empty_in_disps.append(p["name"])
                    break
            for pr in p.get("prices", []):
                d = pr.get("dispensary", "")
                if not isinstance(d, str) or not d.strip():
                    empty_in_prices.append(p["name"])
                    break
        if empty_in_disps:
            print(f"\n  [ADVISORY] {len(empty_in_disps)} products have blank dispensary names in dispensaries list:")
            for name in empty_in_disps[:10]:
                print(f"    - \"{name}\"")
        if empty_in_prices:
            print(f"\n  [ADVISORY] {len(empty_in_prices)} products have blank dispensary names in prices array:")
            for name in empty_in_prices[:10]:
                print(f"    - \"{name}\"")
        if not empty_in_disps and not empty_in_prices:
            print(f"\n  No blank dispensary names found")

    def test_dispensary_product_counts(self):
        """Report top 10 dispensaries by product count (informational)."""
        counter: Counter = Counter()
        for p in self.catalog:
            for d in p.get("dispensaries", []):
                if isinstance(d, str) and d.strip():
                    counter[d] += 1
        top = counter.most_common(10)
        print(f"\n  Top 10 dispensaries by product count ({len(counter)} total dispensaries):")
        for name, count in top:
            print(f"    {count:>5}  {name}")


class TestExternalLinks(unittest.TestCase):
    """Verify Leafly and Weedmaps URL formatting and coverage."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog()

    def test_leafly_urls_format(self):
        """leafly_url should match pattern https://www.leafly.com/strains/..."""
        leafly_re = re.compile(r'^https://www\.leafly\.com/strains/.+')
        bad = []
        for p in self.catalog:
            url = p.get("leafly_url", "")
            if url and not leafly_re.match(url):
                bad.append((p["name"], url))
        if bad:
            print(f"\n  [ADVISORY] {len(bad)} leafly_url values don't match expected pattern:")
            for name, url in bad[:10]:
                print(f"    - \"{name}\": {url}")
        else:
            with_url = sum(1 for p in self.catalog if p.get("leafly_url"))
            print(f"\n  All {with_url} leafly_url values match expected pattern")

    def test_weedmaps_urls_format(self):
        """weedmaps_url should match pattern https://weedmaps.com/..."""
        wm_re = re.compile(r'^https://weedmaps\.com/.+')
        bad = []
        for p in self.catalog:
            url = p.get("weedmaps_url", "")
            if url and not wm_re.match(url):
                bad.append((p["name"], url))
        if bad:
            print(f"\n  [ADVISORY] {len(bad)} weedmaps_url values don't match expected pattern:")
            for name, url in bad[:10]:
                print(f"    - \"{name}\": {url}")
        else:
            with_url = sum(1 for p in self.catalog if p.get("weedmaps_url"))
            print(f"\n  All {with_url} weedmaps_url values match expected pattern")

    def test_external_links_coverage(self):
        """Report % of products with leafly_url and weedmaps_url."""
        total = len(self.catalog)
        with_leafly = sum(1 for p in self.catalog if p.get("leafly_url"))
        with_weedmaps = sum(1 for p in self.catalog if p.get("weedmaps_url"))
        with_both = sum(
            1 for p in self.catalog
            if p.get("leafly_url") and p.get("weedmaps_url")
        )
        leafly_pct = with_leafly / total * 100 if total else 0
        weedmaps_pct = with_weedmaps / total * 100 if total else 0
        both_pct = with_both / total * 100 if total else 0
        print(f"\n  External link coverage ({total} products):")
        print(f"    leafly_url:   {with_leafly:>5} ({leafly_pct:.1f}%)")
        print(f"    weedmaps_url: {with_weedmaps:>5} ({weedmaps_pct:.1f}%)")
        print(f"    both:         {with_both:>5} ({both_pct:.1f}%)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
