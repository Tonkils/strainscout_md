"""
tests/conftest.py

Shared fixtures and constants for StrainScout data accuracy tests.
Loads the catalog from disk and defines category field requirements.

Usage:
    from tests.conftest import load_catalog, VALID_CATEGORIES, PRODUCT_CARD_SPECS
"""

import json
import os
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

# ── Catalog paths (try pipeline output first, then web_2 public) ──────────────
CATALOG_PATHS = [
    BASE / "data" / "output" / "strainscout_catalog_v10.min.json",
    BASE / "web_2" / "public" / "data" / "strainscout_catalog_v10.min.json",
]

VALID_CATEGORIES = ["Flower", "Pre-Roll", "Vape", "Concentrate", "Edible", "Topical", "Other"]

VALID_CONFIDENCE = ["verified", "inferred", "conflict"]


def load_catalog(path: str | None = None) -> list[dict]:
    """Load the catalog JSON. Accepts an override path or auto-discovers."""
    if path:
        p = Path(path)
    else:
        p = None
        for candidate in CATALOG_PATHS:
            if candidate.exists():
                p = candidate
                break
    if p is None or not p.exists():
        raise FileNotFoundError(
            f"No catalog found. Searched: {[str(c) for c in CATALOG_PATHS]}"
        )
    with open(p, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "strains" in data:
        return data["strains"]
    raise ValueError(f"Unexpected catalog format in {p}")


def products_by_category(catalog: list[dict]) -> dict[str, list[dict]]:
    """Group catalog entries by product_category."""
    groups: dict[str, list[dict]] = {}
    for item in catalog:
        cat = item.get("product_category", "Flower")
        groups.setdefault(cat, []).append(item)
    return groups


# ── Common fields every product should have ───────────────────────────────────
COMMON_FIELDS = [
    "name", "brand", "product_category", "prices", "dispensaries",
    "thc", "cbd", "terpenes", "last_verified",
]

CATEGORY_REQUIRED_FIELDS: dict[str, list[str]] = {
    "Flower":      COMMON_FIELDS,
    "Edible":      COMMON_FIELDS,
    "Concentrate": COMMON_FIELDS,
    "Vape":        COMMON_FIELDS,
    "Pre-Roll":    COMMON_FIELDS,
    "Topical":     COMMON_FIELDS,
    "Other":       ["name", "product_category"],
}


# ── Product card display specs ────────────────────────────────────────────────
# "required_display": fields the card MUST show (from existing data model)
# "desired_display": fields we'd LIKE to show (parsed from name, may not exist)

PRODUCT_CARD_SPECS: dict[str, dict] = {
    "Flower": {
        "required_display": ["name", "brand", "price", "dispensaries", "thc", "cbd", "terpenes", "date_scraped"],
        "desired_display": ["strain", "weight"],
    },
    "Edible": {
        "required_display": ["name", "brand", "price", "dispensaries", "thc", "cbd", "terpenes", "date_scraped"],
        "desired_display": ["quantity", "edible_type"],
    },
    "Concentrate": {
        "required_display": ["name", "brand", "price", "dispensaries", "thc", "cbd", "terpenes", "date_scraped"],
        "desired_display": ["strain", "amount", "concentrate_type"],
    },
    "Vape": {
        "required_display": ["name", "brand", "price", "dispensaries", "thc", "cbd", "terpenes", "date_scraped"],
        "desired_display": ["weight"],
    },
    "Pre-Roll": {
        "required_display": ["name", "brand", "price", "dispensaries", "thc", "cbd", "terpenes", "date_scraped"],
        "desired_display": ["strain", "weight_or_quantity", "preroll_type"],
    },
}


# ── Name parsers (extract category-specific info from product names) ──────────

def parse_weight(name: str) -> str | None:
    """Extract weight like '3.5g', '7g', '1g', '0.5g' from product name."""
    m = re.search(r'(\d+(?:\.\d+)?)\s*g\b', name, re.IGNORECASE)
    return m.group(0).strip() if m else None


def parse_quantity(name: str) -> str | None:
    """Extract quantity like '2pk', '5ct', '(2pk)', '10 Pack' from name."""
    m = re.search(r'(\d+)\s*(?:pk|ct|pack)\b', name, re.IGNORECASE)
    return m.group(0).strip() if m else None


def parse_edible_type(name: str) -> str | None:
    """Infer edible sub-type from name."""
    n = name.lower()
    if re.search(r'gummy|gummies', n):
        return "Gummy"
    if re.search(r'chocolate|truffle', n):
        return "Chocolate"
    if re.search(r'soda|beverage|drink|sparkling|water', n):
        return "Liquid"
    if re.search(r'capsule|tablet', n):
        return "Capsule"
    if re.search(r'chews?|candy|caramel|lozenge', n):
        return "Chew"
    if re.search(r'syrup|elixir|tincture', n):
        return "Liquid"
    return None


def parse_concentrate_type(name: str) -> str | None:
    """Infer concentrate sub-type from name."""
    n = name.lower()
    if re.search(r'badder|batter', n):
        return "Badder"
    if re.search(r'budder', n):
        return "Budder"
    if re.search(r'shatter', n):
        return "Shatter"
    if re.search(r'\brso\b', n):
        return "RSO"
    if re.search(r'\bwax\b', n):
        return "Wax"
    if re.search(r'live\s+resin', n):
        return "Live Resin"
    if re.search(r'rosin', n):
        return "Rosin"
    if re.search(r'isolate', n):
        return "Isolate"
    if re.search(r'sugar', n):
        return "Sugar"
    if re.search(r'crumble', n):
        return "Crumble"
    if re.search(r'diamond', n):
        return "Diamonds"
    if re.search(r'\bhash\b', n):
        return "Hash"
    if re.search(r'kief', n):
        return "Kief"
    if re.search(r'sauce', n):
        return "Sauce"
    if re.search(r'distillate', n):
        return "Distillate"
    return None


def parse_preroll_type(name: str) -> str | None:
    """Infer pre-roll sub-type from name."""
    n = name.lower()
    if re.search(r'infused', n):
        return "Infused"
    if parse_quantity(name):
        return "Pack"
    if re.search(r'\b1\s*(?:pk|ct|pack)\b', n) or re.search(r'single', n):
        return "Single"
    return None


# ── Ground truth from publish/test_classify.py ────────────────────────────────
# 63+ curated test cases mapping product name → expected category.

GROUND_TRUTH = [
    # Flower
    ("White Truffle", "Flower"),
    ("Forum Cut Cookies", "Flower"),
    ("Animal Mint Cookies", "Flower"),
    ("Brownie Scout", "Flower"),
    ("Ice Cream Cake", "Flower"),
    ("Sour Cream", "Flower"),
    ("Boston Cream", "Flower"),
    ("Neapolitan Space Cream", "Flower"),
    ("Jelly Breath", "Flower"),
    ("Jelly Donuts x GMO", "Flower"),
    ("Candy Panties", "Flower"),
    ("Candy Fumez", "Flower"),
    ("Strawberry Candy #4", "Flower"),
    ("Purple Cookies", "Flower"),
    ("Pomme Jelly Small", "Flower"),
    ("Pomme Jelly Whole", "Flower"),
    ("Indica Dominant Premium Flower Brownie Scout", "Flower"),
    ("Triple Stack Whole", "Flower"),
    ("Huckleberry Soda #5", "Flower"),
    ("LA Chocolate", "Flower"),
    ("Sherbsicle Cookies", "Flower"),
    ("Cabernet Cookies", "Flower"),
    ("Jet Cookie", "Flower"),
    # Pre-Roll
    ("Happy J's Funky Guava PRJ (2ct)", "Pre-Roll"),
    ("Eden Cherry Marshmallow Infused Joint 1pk", "Pre-Roll"),
    ("2pk Pre-Rolls", "Pre-Roll"),
    ("Dogwalkers Show Dog Sherbanger #22 Infused Joint 1pk", "Pre-Roll"),
    ("INFUSED Chocolatina (2pk)", "Pre-Roll"),
    ("INFUSED Double Krush (1pk)", "Pre-Roll"),
    ("Remix INFUSED Blue Dream (1pk)", "Pre-Roll"),
    ("Colors Sour Peach x Ripped Off Runtz Infused Joints 2pk", "Pre-Roll"),
    ("Happy-er J's INFUSED Sunset Octane X House Blends (2pk)", "Pre-Roll"),
    ("Moonbeam Gelato Shorties (2pk)", "Pre-Roll"),
    ("Triple Stack Shorties (2pk)", "Pre-Roll"),
    ("Happy J's Huckleberry Soda 5 (2pk)", "Pre-Roll"),
    ("Happy-er J's INFUSED LCG X Ice Cream Cake (2pk)", "Pre-Roll"),
    ("Happy-er J's Funky Guava x House Blends Infused", "Pre-Roll"),
    ("Happy J's Midnight Circus (2pk)", "Pre-Roll"),
    # Vape
    ("Apple Bomb Live Resin Cart", "Vape"),
    ("Champagne Supernova Distillate Cartridge", "Vape"),
    ("Select BRIQ Essentials AIO Disposable Strawberry Shortcake", "Vape"),
    ("Bomb Popz Cloud Bar", "Vape"),
    ("Blueberry Dream Cloud Bar", "Vape"),
    ("Sunnies London Pound Cake Disposable Pen", "Vape"),
    # Concentrate
    ("Orange Drizzle Live Resin Cake Badder", "Concentrate"),
    ("Starkiller RSO", "Concentrate"),
    ("Sunnies 1g THCA Isolate", "Concentrate"),
    ("Sunnies THCA Isolate", "Concentrate"),
    ("THCa Isolate", "Concentrate"),
    ("1g Heirloom BHO Cured Sugar", "Concentrate"),
    ("Heirloom BHO Cured Sugar", "Concentrate"),
    ("Sunnies 1g Cherry Chem Pie Live Resin Batter", "Concentrate"),
    # Edible (including ones that have "Live Resin" but are gummies)
    ("Sunnies Live Resin Gummies: Cherry Pie OG I Black Cherry", "Edible"),
    ("Oria 10mg Peach Mango Live Resin Gummies (2pk)", "Edible"),
    ("10mg Black Cherry Vanilla Chews", "Edible"),
    ("ALLCAPS 10mg FECO Capsules (10pk", "Edible"),
    ("10mg Wild Cherriezzz Discos 5:1:1 CBD:THC:CBN", "Edible"),
    ("Sunnies 10mg Fruit Burst Quick Kicks", "Edible"),
    ("Sunnies Socials 10mg Mango Sparkling Water", "Edible"),
    ("Dark Chocolate Espresso Truffles", "Edible"),
    ("Keef Classic Soda Orange Kush", "Edible"),
    # Topical
    ("CBD Topical Lotion", "Topical"),
    # Other
    ("10 Pack", "Other"),
    ("5 Pack", "Other"),
    ("Shop Best Cannabis Strains", "Other"),
]
