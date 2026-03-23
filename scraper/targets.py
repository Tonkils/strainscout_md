"""
scraper/targets.py

Master dispensary-to-platform mapping for all 100+ Maryland dispensaries.

Data sources:
  - Manus JSONs/scraping_targets.json — 66 confirmed platform slugs
  - Manus JSONs/dispensary_benchmark.json — full 100 dispensary roster

Usage:
    from scraper.targets import get_weedmaps_targets, get_dutchie_targets
    from scraper.targets import get_jane_targets, get_unmapped_targets
"""

import json
import re
from pathlib import Path

_BASE = Path(__file__).resolve().parent.parent
_MANUS_FILE = _BASE / "Manus JSONs" / "scraping_targets.json"
_BENCHMARK_FILE = _BASE / "Manus JSONs" / "dispensary_benchmark.json"


def get_all_targets() -> list[dict]:
    """Return all 66 confirmed scraping targets from Manus reference data."""
    with open(_MANUS_FILE, encoding="utf-8") as f:
        return json.load(f)


def get_weedmaps_targets() -> list[dict]:
    """Return dispensaries with a confirmed Weedmaps slug."""
    return [d for d in get_all_targets() if d.get("weedmaps")]


def get_dutchie_targets() -> list[dict]:
    """Return dispensaries with a confirmed Dutchie slug."""
    return [d for d in get_all_targets() if d.get("dutchie")]


def get_jane_targets() -> list[dict]:
    """Return dispensaries with a confirmed iHeartJane URL."""
    results = []
    for d in get_all_targets():
        for url in d.get("urls", []):
            if "iheartjane.com" in url.lower() or "jane.com" in url.lower():
                d["iheartjane"] = url
                results.append(d)
                break
    return results


def get_benchmark() -> list[dict]:
    """Return the full 100-dispensary benchmark roster."""
    with open(_BENCHMARK_FILE, encoding="utf-8") as f:
        return json.load(f)


def get_unmapped_targets() -> list[dict]:
    """Return benchmark dispensaries that have NO confirmed platform slug.

    These need platform detection or direct website scraping.
    """
    confirmed = get_all_targets()
    confirmed_names = set()
    for t in confirmed:
        confirmed_names.add(t["name"].lower().strip())
        # Also add slug-based lookups
        for key in ("weedmaps", "dutchie"):
            if t.get(key):
                confirmed_names.add(t[key].lower())

    benchmark = get_benchmark()
    unmapped = []
    for d in benchmark:
        name = d.get("canonical_name", "")
        nl = name.lower().strip()
        # Check if this dispensary is in any target list
        is_mapped = False
        for cn in confirmed_names:
            if nl.startswith(cn[:15]) or cn.startswith(nl[:15]):
                is_mapped = True
                break
        if not is_mapped:
            unmapped.append(d)

    return unmapped


# ── Chain-to-platform inference ──────────────────────────────────────────────
# Based on confirmed scraping targets, these chains consistently use specific
# platforms. Used to infer platform for unmapped locations of the same chain.

CHAIN_PLATFORM_MAP = {
    # Chains confirmed on Weedmaps (all mapped locations use WM)
    "Curaleaf": "weedmaps",
    "Trulieve": "weedmaps",
    "Verilife": "weedmaps",
    "Zen Leaf": "weedmaps",
    "Story Cannabis": "weedmaps",
    "Rise": "weedmaps",
    "The Apothecarium": "weedmaps",
    "Health for Life": "weedmaps",
    "CULTA": "weedmaps",
    "Mana Supply Co.": "weedmaps",
    "Liberty Cannabis": "weedmaps",
    "Nirvana Cannabis": "weedmaps",
    "Green Goods": "weedmaps",
    "gLeaf": "weedmaps",
    "Chesapeake Apothecary": "weedmaps",
    # Chains confirmed on Dutchie
    "Ascend": "dutchie",
    "Remedy": "dutchie",
    "Far & Dotter": "dutchie",
}


def infer_platform(dispensary: dict) -> str | None:
    """Infer likely platform for an unmapped dispensary based on brand parent."""
    brand = dispensary.get("brand_parent", "")
    if brand in CHAIN_PLATFORM_MAP:
        return CHAIN_PLATFORM_MAP[brand]
    return None


def infer_weedmaps_slug(name: str) -> str:
    """Generate a likely Weedmaps slug from dispensary name."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def summary() -> None:
    """Print a full breakdown of platform coverage."""
    all_t = get_all_targets()
    wm = get_weedmaps_targets()
    dt = get_dutchie_targets()
    jane = get_jane_targets()
    unmapped = get_unmapped_targets()
    bench = get_benchmark()

    print(f"{'='*70}")
    print(f"  MARYLAND DISPENSARY SCRAPING TARGET SUMMARY")
    print(f"{'='*70}")
    print(f"  Benchmark dispensaries (total) : {len(bench)}")
    print(f"  Confirmed targets              : {len(all_t)}")
    print(f"    Weedmaps                     : {len(wm)}")
    print(f"    Dutchie                      : {len(dt)}")
    print(f"    iHeartJane                   : {len(jane)}")
    print(f"  Unmapped (need detection)      : {len(unmapped)}")
    print()

    # Show inferred platforms for unmapped
    inferred = {"weedmaps": [], "dutchie": [], "unknown": []}
    for d in unmapped:
        platform = infer_platform(d)
        if platform:
            inferred[platform].append(d["canonical_name"])
        else:
            inferred["unknown"].append(d["canonical_name"])

    print(f"  Inferred platforms for unmapped:")
    for platform, names in inferred.items():
        print(f"    {platform}: {len(names)}")
        for n in sorted(names):
            print(f"      {n}")
    print()


if __name__ == "__main__":
    summary()
