"""
scraper/category_map.py

Canonical category normalization for all platforms.

Each dispensary platform uses its own labels. This module maps every known
platform-specific category string to one of our seven standard categories:
  Flower | Pre-Roll | Vape | Concentrate | Edible | Topical | Other

Usage:
    from scraper.category_map import normalize_category, STANDARD_CATEGORIES

    cat = normalize_category("pre-rolls", platform="weedmaps")
    # → "Pre-Roll"
"""

# ── Standard category values ──────────────────────────────────────────────────
STANDARD_CATEGORIES = frozenset({
    "Flower",
    "Pre-Roll",
    "Vape",
    "Concentrate",
    "Edible",
    "Topical",
    "Other",
})

# ── Per-platform raw label → standard category ────────────────────────────────
# All comparisons are done case-insensitively after stripping whitespace.
# Add new entries here whenever a new label is observed in raw API responses.

_MAP: dict[str, str] = {
    # ── Flower ──────────────────────────────────────────────────────────────
    "flower":                  "Flower",
    "flowers":                 "Flower",
    "buds":                    "Flower",
    "bud":                     "Flower",
    "pre-packaged-flower":     "Flower",
    "pre_packaged_flower":     "Flower",
    "smalls":                  "Flower",
    "popcorn":                 "Flower",
    "shake":                   "Flower",
    "ground flower":           "Flower",
    "ground":                  "Flower",

    # ── Pre-Roll ────────────────────────────────────────────────────────────
    "pre-roll":                "Pre-Roll",
    "pre-rolls":               "Pre-Roll",
    "preroll":                 "Pre-Roll",
    "prerolls":                "Pre-Roll",
    "pre_roll":                "Pre-Roll",
    "pre_rolls":               "Pre-Roll",
    "joints":                  "Pre-Roll",
    "joint":                   "Pre-Roll",
    "blunts":                  "Pre-Roll",
    "blunt":                   "Pre-Roll",
    "infused pre-rolls":       "Pre-Roll",
    "infused pre-roll":        "Pre-Roll",
    "infused prerolls":        "Pre-Roll",
    "infused joints":          "Pre-Roll",
    "mini pre-rolls":          "Pre-Roll",
    "dogwalkers":              "Pre-Roll",

    # ── Vape ────────────────────────────────────────────────────────────────
    "vaporizers":              "Vape",
    "vaporizer":               "Vape",
    "vape":                    "Vape",
    "vapes":                   "Vape",
    "cartridges":              "Vape",
    "cartridge":               "Vape",
    "carts":                   "Vape",
    "cart":                    "Vape",
    "disposables":             "Vape",
    "disposable":              "Vape",
    "pods":                    "Vape",
    "pod":                     "Vape",
    "510":                     "Vape",
    "510 cartridges":          "Vape",
    "live resin cartridges":   "Vape",
    "all-in-ones":             "Vape",
    "all in ones":             "Vape",

    # ── Concentrate ─────────────────────────────────────────────────────────
    "concentrates":            "Concentrate",
    "concentrate":             "Concentrate",
    "extracts":                "Concentrate",
    "extract":                 "Concentrate",
    "dabs":                    "Concentrate",
    "wax":                     "Concentrate",
    "shatter":                 "Concentrate",
    "rosin":                   "Concentrate",
    "live resin":              "Concentrate",
    "hash":                    "Concentrate",
    "kief":                    "Concentrate",
    "badder":                  "Concentrate",
    "budder":                  "Concentrate",
    "diamonds":                "Concentrate",
    "sauce":                   "Concentrate",
    "rso":                     "Concentrate",
    "oil":                     "Concentrate",
    "oils":                    "Concentrate",
    "distillate":              "Concentrate",
    "live sugar":              "Concentrate",
    "cured sugar":             "Concentrate",
    "crumble":                 "Concentrate",
    "tinctures":               "Concentrate",  # Most tinctures at MD dispensaries are RSO-style
    "tincture":                "Concentrate",

    # ── Edible ──────────────────────────────────────────────────────────────
    "edibles":                 "Edible",
    "edible":                  "Edible",
    "gummies":                 "Edible",
    "gummy":                   "Edible",
    "chocolates":              "Edible",
    "chocolate":               "Edible",
    "beverages":               "Edible",
    "beverage":                "Edible",
    "drinks":                  "Edible",
    "drink":                   "Edible",
    "capsules":                "Edible",
    "capsule":                 "Edible",
    "tablets":                 "Edible",
    "tablet":                  "Edible",
    "mints":                   "Edible",
    "hard candies":            "Edible",
    "hard candy":              "Edible",
    "lozenges":                "Edible",
    "lozenge":                 "Edible",
    "baked goods":             "Edible",
    "cookies":                 "Edible",
    "brownies":                "Edible",
    "snacks":                  "Edible",
    "syrup":                   "Edible",
    "syrups":                  "Edible",
    "chews":                   "Edible",
    "chew":                    "Edible",

    # ── Topical ─────────────────────────────────────────────────────────────
    "topicals":                "Topical",
    "topical":                 "Topical",
    "lotions":                 "Topical",
    "lotion":                  "Topical",
    "balms":                   "Topical",
    "balm":                    "Topical",
    "salves":                  "Topical",
    "salve":                   "Topical",
    "patches":                 "Topical",
    "patch":                   "Topical",
    "creams":                  "Topical",
    "cream":                   "Topical",
    "gels":                    "Topical",
    "gel":                     "Topical",
    "sprays":                  "Topical",
    "spray":                   "Topical",
    "transdermal":             "Topical",

    # ── Other ────────────────────────────────────────────────────────────────
    "accessories":             "Other",
    "accessory":               "Other",
    "merchandise":             "Other",
    "seeds":                   "Other",
    "clones":                  "Other",
    "apparel":                 "Other",
    "bundles":                 "Other",
    "bundle":                  "Other",
}


def normalize_category(raw: str, platform: str = "") -> str:
    """
    Map a platform-specific category string to our standard category.

    Args:
        raw:      The raw category string from the platform API/DOM.
        platform: Optional hint for disambiguation (e.g. "weedmaps", "dutchie").

    Returns:
        One of: Flower | Pre-Roll | Vape | Concentrate | Edible | Topical | Other
        Falls back to "Other" for unrecognized values.
    """
    if not raw:
        return "Other"

    key = raw.strip().lower()

    # Direct lookup
    if key in _MAP:
        return _MAP[key]

    # Substring matches for compound labels like "flower - indica" or "Live Resin Cartridges"
    if "pre-roll" in key or "preroll" in key or "joint" in key or "blunt" in key:
        return "Pre-Roll"
    if "cartridge" in key or "cart" in key or "vape" in key or "vapor" in key or "disposable" in key or "pod" in key:
        return "Vape"
    if "concentrate" in key or "extract" in key or "rosin" in key or "wax" in key or "shatter" in key or "hash" in key:
        return "Concentrate"
    if "edible" in key or "gummy" in key or "gummies" in key or "chocolate" in key or "beverage" in key:
        return "Edible"
    if "topical" in key or "lotion" in key or "balm" in key or "patch" in key or "salve" in key:
        return "Topical"
    if "flower" in key or "bud" in key:
        return "Flower"

    return "Other"


def is_flower(category: str) -> bool:
    """Return True if this category is Flower (for backwards-compatible filtering)."""
    return normalize_category(category) == "Flower"


# ── Platform-specific category URLs (for scrapers that navigate per category) ─
# Used by Trulieve and Curaleaf scrapers to enumerate all product categories.

TRULIEVE_CATEGORY_URLS: list[dict] = [
    {"category": "Flower",      "path": "/category/flower"},
    {"category": "Pre-Roll",    "path": "/category/pre-rolls"},
    {"category": "Vape",        "path": "/category/vaporizers"},
    {"category": "Concentrate", "path": "/category/concentrates"},
    {"category": "Edible",      "path": "/category/edibles"},
    {"category": "Topical",     "path": "/category/topicals"},
]

CURALEAF_CATEGORY_IDS: list[dict] = [
    {"category": "Flower",      "path": "/menu/flower-542"},
    {"category": "Pre-Roll",    "path": "/menu/pre-rolls-543"},
    {"category": "Vape",        "path": "/menu/vaporizers-544"},
    {"category": "Concentrate", "path": "/menu/concentrates-545"},
    {"category": "Edible",      "path": "/menu/edibles-546"},
    {"category": "Topical",     "path": "/menu/topicals-547"},
]
