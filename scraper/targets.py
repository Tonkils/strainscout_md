"""
scraper/targets.py

Loads Maryland dispensary scraping targets and provides helpers to
filter by platform.  The canonical source is:
  Manus JSONs/scraping_targets.json  — 66 dispensaries with confirmed slugs

Usage:
    from scraper.targets import get_weedmaps_targets, get_all_targets
    targets = get_weedmaps_targets()   # list of dicts with 'weedmaps' key
"""

import json
import os
from pathlib import Path

# Resolve paths relative to this file so the module works from any cwd
_BASE = Path(__file__).resolve().parent.parent          # strainscout_md/
_MANUS_FILE = _BASE / "Manus JSONs" / "scraping_targets.json"
_DISPENSARIES_FILE = _BASE / "data" / "dispensaries.json"


def get_all_targets() -> list[dict]:
    """Return all 66 confirmed scraping targets from Manus reference data."""
    with open(_MANUS_FILE, encoding="utf-8") as f:
        return json.load(f)


def get_weedmaps_targets() -> list[dict]:
    """Return dispensaries that have a confirmed Weedmaps slug."""
    return [d for d in get_all_targets() if d.get("weedmaps")]


def get_dutchie_targets() -> list[dict]:
    """Return dispensaries that have a confirmed Dutchie slug."""
    return [d for d in get_all_targets() if d.get("dutchie")]


def get_jane_targets() -> list[dict]:
    """Return dispensaries with a confirmed iHeartJane path."""
    return [d for d in get_all_targets() if d.get("iheartjane")]


def get_weedmaps_only_targets() -> list[dict]:
    """Return dispensaries on Weedmaps but NOT Dutchie/Jane."""
    return [d for d in get_all_targets()
            if d.get("weedmaps") and not d.get("dutchie") and not d.get("iheartjane")]


def summary() -> None:
    """Print a quick breakdown of platform coverage."""
    all_t = get_all_targets()
    wm = get_weedmaps_targets()
    dt = get_dutchie_targets()
    jane = get_jane_targets()
    print(f"Total targets : {len(all_t)}")
    print(f"Weedmaps      : {len(wm)}")
    print(f"Dutchie       : {len(dt)}")
    print(f"iHeartJane    : {len(jane)}")
    print(f"Weedmaps URL  : https://weedmaps.com/dispensaries/<slug>")
    print()
    print("Weedmaps dispensaries:")
    for d in wm:
        print(f"  {d['name']:40s}  {d['weedmaps']}")


if __name__ == "__main__":
    summary()
