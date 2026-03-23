#!/usr/bin/env python3
"""
Pipeline Step 2: Enrich parsed strain records with Leafly data.

Uses the cached Leafly lookup files (from Manus) to add:
  - strain type (Indica/Sativa/Hybrid)
  - terpenes, effects, flavors
  - description, genetics
  - Leafly URL

Falls back to name-pattern inference for strains not found in Leafly.

Input:  data/processed/parsed_strains.json
Output: data/processed/enriched_strains.json
"""

import json
import re
import os
from pathlib import Path
from collections import Counter

BASE = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE / "data" / "processed"
MANUS_DIR = BASE / "Manus JSONs"

INPUT = PROCESSED_DIR / "parsed_strains.json"
OUTPUT = PROCESSED_DIR / "enriched_strains.json"

# ── Leafly cache files ──
LEAFLY_COMPREHENSIVE = MANUS_DIR / "leafly_comprehensive_scrape.json"
LEAFLY_UNTYPED = MANUS_DIR / "leafly_untyped_lookup.json"
ALREADY_MATCHED = MANUS_DIR / "untyped_already_matched.json"


def build_leafly_index() -> dict:
    """Build a lowercase-name → Leafly data dict from all cache files."""
    index = {}

    # First-round comprehensive results
    if LEAFLY_COMPREHENSIVE.exists():
        with open(LEAFLY_COMPREHENSIVE, encoding="utf-8") as f:
            data = json.load(f)
        results = data.get("results", []) if isinstance(data, dict) else data
        for r in results:
            output = r.get("output", {})
            if isinstance(output, dict) and output.get("found") in (True, "true", "yes", "Yes"):
                name = (output.get("strain_name") or r.get("input", "")).lower().strip()
                if name:
                    index[name] = output

    # Untyped lookup results (newer, overrides)
    if LEAFLY_UNTYPED.exists():
        with open(LEAFLY_UNTYPED, encoding="utf-8") as f:
            data = json.load(f)
        results = data.get("results", []) if isinstance(data, dict) else data
        for r in results:
            output = r.get("output", {})
            if isinstance(output, dict):
                found = output.get("found", "")
                if found in (True, "true", "yes", "Yes"):
                    name = (output.get("strain_name") or r.get("input", "")).lower().strip()
                    if name:
                        index[name] = output

    # Previously matched entries
    if ALREADY_MATCHED.exists():
        with open(ALREADY_MATCHED, encoding="utf-8") as f:
            matched = json.load(f)
        for m in matched:
            name = m.get("strain_name", m.get("name", "")).lower().strip()
            if name:
                # Normalize to same format as other Leafly entries
                entry = {
                    "found": True,
                    "strain_name": m.get("strain_name", m.get("name", "")),
                    "strain_type": m.get("leafly_type", m.get("type", "")),
                    "terpenes": m.get("leafly_terpenes", m.get("terpenes", "")),
                    "effects": m.get("leafly_effects", m.get("effects", "")),
                    "flavors": m.get("leafly_flavors", m.get("flavors", "")),
                    "description": m.get("leafly_description", m.get("description", "")),
                    "genetics": m.get("leafly_genetics", m.get("genetics", "")),
                    "leafly_url": m.get("leafly_url", ""),
                }
                index[name] = entry

    return index


def parse_csv_field(val) -> list:
    """Parse a comma-separated string into a clean list."""
    if not val or not isinstance(val, str):
        return []
    if val.lower() in ("", "n/a", "none", "not found", "not available", "not_found"):
        return []
    return [v.strip() for v in val.split(",") if v.strip()]


def extract_pure_name(name: str) -> str:
    """Extract pure strain name for Leafly matching (strip brand, size, format)."""
    n = name.strip()
    n = re.sub(r"\(.*?\)", "", n).strip()
    # Remove size/weight
    n = re.sub(r"\s*\d+(\.\d+)?\s*(g|oz|mg)\b", "", n, flags=re.I).strip()
    n = re.sub(r"\s*\d+/\d+\s*oz\b", "", n, flags=re.I).strip()
    # Remove format words
    for pat in [
        r"\s*(Smalls?|Shake|Ground|Popcorn|Mini|Minis|Whole|Full|Littles?)\s*$",
        r"\s*(Pre-?Roll|Pre-?Pack|PrePack|Prepacked?|Pre-?Ground)\s*$",
        r"\s*(Premium|Select|Reserve|Exclusive|Limited)\s*$",
        r"\s*(Flower|Buds?|Nug|Nugs|Mixed\s*Buds?)\s*$",
    ]:
        n = re.sub(pat, "", n, flags=re.I).strip()
    n = re.sub(r"[\s\-|:./\[\]]+$", "", n).strip()
    return n if len(n) >= 2 else name


def make_leafly_slug(name: str) -> str:
    """Convert strain name to Leafly URL slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def find_leafly_match(name: str, index: dict) -> dict | None:
    """Try multiple name variations to find a Leafly match."""
    pure = extract_pure_name(name)

    # Exact match on pure name
    if pure.lower() in index:
        return index[pure.lower()]

    # Without special chars
    clean = re.sub(r"[^a-zA-Z0-9\s]", "", pure).strip().lower()
    if clean in index:
        return index[clean]

    # First two words
    words = pure.split()
    if len(words) >= 2:
        two = " ".join(words[:2]).lower()
        if two in index:
            return index[two]

    # Cross names: "Animal Face x Sherb Crasher" → try "Animal Face"
    if " x " in pure.lower():
        first_parent = pure.lower().split(" x ")[0].strip()
        if first_parent in index:
            return index[first_parent]

    return None


# ── Name-pattern type inference (fallback) ──

INDICA_PATTERNS = [
    r"\bkush\b", r"\bog\b", r"\bpurple\b", r"\bbubba\b", r"\bgranddaddy\b",
    r"\bafghani?\b", r"\bnorthern.?lights?\b", r"\bblueberry\b", r"\bgrape\b",
    r"\bpurp\b", r"\bskywalker\b", r"\bgorilla\b", r"\bdo.?si.?do\b",
    r"\bgmo\b", r"\bmk.?ultra\b", r"\bdiablo\b", r"\bpunch\b",
    r"\bzerbert\b", r"\blavender\b", r"\bmendo\b", r"\bforbidden\b",
    r"\bslurricane\b",
]

SATIVA_PATTERNS = [
    r"\bhaze\b", r"\bjack\b", r"\bdurban\b", r"\btangie\b",
    r"\bgreen.?crack\b", r"\bsuper.?silver\b", r"\bmaui\b",
    r"\btrain.?wreck\b", r"\bstrawberry.?cough\b", r"\bcinderella\b",
    r"\bacapulco\b", r"\bpanama\b", r"\bcolombian\b", r"\bthai\b",
    r"\bamnesia\b", r"\bclementine\b", r"\belectric\b",
]

HYBRID_PATTERNS = [
    r"\bgelato\b", r"\bruntz\b", r"\bcookies?\b", r"\bzkittlez\b",
    r"\bblue.?dream\b", r"\bgirl.?scout\b", r"\bgsc\b", r"\bwhite.?widow\b",
    r"\bgorilla.?glue\b", r"\bgg\d?\b", r"\bchemdog\b", r"\bdiesel\b",
    r"\bsherbet\b", r"\bice.?cream\b", r"\bcandy\b", r"\bsundae\b",
    r"\bwedding.?cake\b", r"\bapple\b", r"\bmac\b", r"\bgarlic\b",
    r"\bglue\b", r"\bbiscotti\b", r"\bcake\b", r"\bbanana\b",
]


def predict_type_by_name(name: str) -> tuple[str, float, str]:
    """Predict strain type from name patterns. Returns (type, confidence, method)."""
    nl = name.lower()
    indica = sum(1 for p in INDICA_PATTERNS if re.search(p, nl))
    sativa = sum(1 for p in SATIVA_PATTERNS if re.search(p, nl))
    hybrid = sum(1 for p in HYBRID_PATTERNS if re.search(p, nl))
    total = indica + sativa + hybrid
    if total == 0:
        return "Hybrid", 0.33, "default"
    scores = {"Indica": indica, "Sativa": sativa, "Hybrid": hybrid}
    best = max(scores, key=scores.get)
    conf = scores[best] / total
    if sum(1 for v in scores.values() if v > 0) == 1:
        conf = min(conf + 0.2, 1.0)
    return best, round(conf, 3), "name_pattern"


def main():
    print("=" * 70)
    print("PIPELINE STEP 2: ENRICH WITH LEAFLY DATA")
    print("=" * 70)

    # Load parsed data
    with open(INPUT, encoding="utf-8") as f:
        data = json.load(f)
    records = data["records"]
    print(f"Loaded {len(records)} parsed records")

    # Build Leafly index
    leafly_index = build_leafly_index()
    print(f"Leafly index: {len(leafly_index)} entries")

    stats = Counter()

    for rec in records:
        name = rec["strain_name"]

        # Try Leafly match
        match = find_leafly_match(name, leafly_index)

        if match:
            stats["leafly_matched"] += 1

            # Type
            if not rec.get("strain_type"):
                ltype = (match.get("strain_type") or "").strip()
                if ltype.lower() in ("indica", "sativa", "hybrid"):
                    rec["strain_type"] = ltype.capitalize()
                    rec["type_source"] = "leafly"
                    stats["type_from_leafly"] += 1

            # Terpenes
            terps = parse_csv_field(match.get("terpenes", ""))
            if terps:
                rec["terpenes"] = terps
                stats["terpenes_added"] += 1

            # Effects
            effects = parse_csv_field(match.get("effects", ""))
            if effects:
                rec["effects"] = effects
                stats["effects_added"] += 1

            # Flavors
            flavors = parse_csv_field(match.get("flavors", ""))
            if flavors:
                rec["flavors"] = flavors
                stats["flavors_added"] += 1

            # Description
            desc = match.get("description", "")
            if desc and len(desc) > 10:
                rec["description"] = desc
                stats["description_added"] += 1

            # Genetics
            genetics = match.get("genetics", "")
            if genetics and len(genetics) > 3:
                rec["genetics"] = genetics
                stats["genetics_added"] += 1

            # Leafly URL
            leafly_url = match.get("leafly_url", "")
            if leafly_url and leafly_url.startswith("http"):
                rec["leafly_url"] = leafly_url
                stats["leafly_url_from_cache"] += 1
        else:
            stats["no_leafly_match"] += 1

        # Fallback: generate Leafly URL from name
        if not rec.get("leafly_url"):
            pure = extract_pure_name(name)
            slug = make_leafly_slug(pure)
            if slug:
                rec["leafly_url"] = f"https://www.leafly.com/strains/{slug}"
                stats["leafly_url_generated"] += 1

        # Fallback: name-pattern type inference
        if not rec.get("strain_type"):
            pred_type, conf, method = predict_type_by_name(name)
            rec["strain_type"] = pred_type
            rec["type_confidence"] = conf
            rec["type_source"] = method
            stats["type_from_pattern"] += 1
        elif rec.get("strain_type") and not rec.get("type_source"):
            rec["type_source"] = "weedmaps"

        # Ensure list fields exist
        for field in ("terpenes", "effects", "flavors"):
            if field not in rec:
                rec[field] = []

        if "description" not in rec:
            rec["description"] = ""
        if "genetics" not in rec:
            rec["genetics"] = ""

    # Print stats
    print(f"\nEnrichment stats:")
    for k, v in sorted(stats.items()):
        print(f"  {k}: {v}")

    # Type distribution
    types = Counter(r.get("strain_type", "Unknown") for r in records)
    print(f"\nType distribution:")
    for t, c in types.most_common():
        print(f"  {t}: {c} ({100*c/len(records):.1f}%)")

    # Type source breakdown
    sources = Counter(r.get("type_source", "unknown") for r in records)
    print(f"\nType source breakdown:")
    for s, c in sources.most_common():
        print(f"  {s}: {c}")

    # Save
    output_data = {
        "metadata": {
            **data["metadata"],
            "enrichment_stats": dict(stats),
        },
        "records": records,
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nSaved to {OUTPUT}")
    print(f"File size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
    return output_data


if __name__ == "__main__":
    main()
