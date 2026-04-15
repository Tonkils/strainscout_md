#!/usr/bin/env python3
"""
Pipeline Step 3: Deduplicate enriched strain records.

Groups strain-per-dispensary records by cleaned canonical name, then merges
them into one entry per strain with aggregated price/dispensary data.

Input:  data/processed/enriched_strains.json
Output: data/processed/deduped_strains.json
"""

import json
import re
import os
import copy
from pathlib import Path
from collections import defaultdict, Counter

BASE = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE / "data" / "processed"

INPUT = PROCESSED_DIR / "enriched_strains.json"
OUTPUT = PROCESSED_DIR / "deduped_strains.json"

# ── Brand list for stripping ──
BRANDS = [
    "nature's heritage", "natures heritage", "evermore", "verano", "rythm",
    "rhythm", "culta", "strane", "grassroots", "garcia", "garcia hand picked",
    "garcia hand-picked", "kind tree", "sunmed", "sun med", "district cannabis",
    "good green", "harvest", "cookies", "fade co.", "fade co",
    "liberty cannabis", "in-house", "curaleaf", "triple seven", "verilife",
    "purple city genetics", "select co-op", "mpx", "curio wellness", "curio",
    "holistic industries", "cresco", "columbia care", "trulieve", "gold leaf",
    "gleaf", "g leaf", "hms", "remedy", "fernway", "camp",
    "blvck mrkt", "revelry", "hana", "vireo", "zen leaf", "allegany",
    "harvest house", "redemption", "just flower", "foreign", "bmore", "local",
    "&shine", "the essence", "essence", "1937", "aeriz",
    "modern flower", "savvy", "roll one", "find.", "find", "legend",
    "everyday", "exclusive", "wellness", "happy eddie", "seed & strain",
    "wildflower", "market", "house of kush", "dark heart",
    "mother exotic", "edie parker", "flower pot", "standard wellness",
    "main st. flower club", "triple 7's", "phase 3", "phas3",
    "shore natural", "growers", "grow west",
]
BRANDS.sort(key=len, reverse=True)


def canonical_key(name: str) -> str:
    """Normalize a strain name to a canonical grouping key."""
    n = name.strip()
    nl = n.lower()

    # Strip brand prefix
    for brand in BRANDS:
        if nl.startswith(brand):
            rest = nl[len(brand):]
            if rest and rest[0] in " |-:":
                n = n[len(brand):].lstrip(" |-:")
                nl = n.lower()
                break

    # Remove special chars but keep spaces/hyphens
    n = re.sub(r"[^a-zA-Z0-9\s\-]", "", n)
    # Collapse whitespace
    n = re.sub(r"\s+", " ", n).strip().lower()

    return n if n else name.lower().strip()


def score_record(rec: dict) -> int:
    """Score a record for quality — higher is better."""
    score = 0
    if rec.get("description") and len(rec["description"]) > 20:
        score += 10
    if rec.get("genetics") and len(rec["genetics"]) > 3:
        score += 10
    if rec.get("effects") and len(rec["effects"]) > 0:
        score += 5
    if rec.get("flavors") and len(rec["flavors"]) > 0:
        score += 5
    if rec.get("terpenes") and len(rec["terpenes"]) > 0:
        score += 5
    if rec.get("thc") is not None:
        score += 5
    if rec.get("price_eighth") is not None:
        score += 3
    if rec.get("brand"):
        score += 2
    # Prefer Leafly-sourced types over pattern-inferred
    if rec.get("type_source") == "leafly":
        score += 20
    elif rec.get("type_source") == "weedmaps":
        score += 15
    elif rec.get("type_source") == "name_pattern":
        score += 5
    return score


def merge_list_field(a: list, b: list) -> list:
    """Merge two lists, deduplicating by lowercase."""
    existing = set(x.lower() for x in a)
    result = list(a)
    for item in b:
        if item.lower() not in existing and item not in ("Not_Found", ""):
            result.append(item)
            existing.add(item.lower())
    return result


def main():
    print("=" * 70)
    print("PIPELINE STEP 3: DEDUPLICATE STRAINS")
    print("=" * 70)

    with open(INPUT, encoding="utf-8") as f:
        data = json.load(f)
    records = data["records"]
    print(f"Input: {len(records)} enriched records")

    # Group by canonical name + weight so different sizes stay separate
    groups = defaultdict(list)
    for rec in records:
        name_key = canonical_key(rec["strain_name"])
        weight = rec.get("weight") or ""
        key = f"{name_key}|{weight}" if weight else name_key
        groups[key].append(rec)

    # Merge each group into a single strain entry
    deduped = []
    merge_log = []

    for key, group in groups.items():
        # Sort by quality score, pick the best record as base
        group.sort(key=score_record, reverse=True)
        winner = copy.deepcopy(group[0])

        # Determine product_category: vote on the most common category in group
        cat_votes = Counter(
            r.get("product_category", "Flower") for r in group
            if r.get("product_category")
        )
        product_category = cat_votes.most_common(1)[0][0] if cat_votes else "Flower"

        # Determine category_confidence: prefer "verified" > "inferred" > "conflict"
        conf_set = set(r.get("category_confidence", "inferred") for r in group)
        if "verified" in conf_set:
            category_confidence = "verified"
        elif "conflict" in conf_set:
            category_confidence = "conflict"
        else:
            category_confidence = "inferred"

        # Build the unified strain entry
        weight = winner.get("weight") or ""
        # If multiple records have different weights, take the most common
        if not weight:
            weight_votes = Counter(r.get("weight", "") for r in group if r.get("weight"))
            if weight_votes:
                weight = weight_votes.most_common(1)[0][0]

        strain = {
            "id": "",  # will be set below
            "name": winner["strain_name"],
            "brand": winner.get("brand", ""),
            "weight": weight,
            "type": winner.get("strain_type", "Hybrid"),
            "type_source": winner.get("type_source", ""),
            "type_confidence": winner.get("type_confidence"),
            "product_category": product_category,
            "category_confidence": category_confidence,
            "thc": winner.get("thc"),
            "cbd": 0,
            "terpenes": winner.get("terpenes", []),
            "effects": winner.get("effects", []),
            "flavors": winner.get("flavors", []),
            "description": winner.get("description", ""),
            "genetics": winner.get("genetics", ""),
            "leafly_url": winner.get("leafly_url", ""),
            "weedmaps_url": "",  # will be set below
            "prices": [],
            "dispensaries": [],
            "dispensary_links": {},
        }

        # Collect prices and dispensaries from ALL records in the group
        seen_prices = set()
        disp_set = set()

        for rec in group:
            disp = rec.get("dispensary", "")
            if disp:
                disp_set.add(disp)

            price = rec.get("price_eighth")
            if price is not None and disp:
                price_key = (disp.lower(), price)
                if price_key not in seen_prices:
                    seen_prices.add(price_key)
                    strain["prices"].append({
                        "dispensary": disp,
                        "price": price,
                        "source": "weedmaps",
                    })

            # Merge enrichment data from other records
            if rec is not winner:
                # Fill empty scalar fields
                if not strain["brand"] and rec.get("brand"):
                    strain["brand"] = rec["brand"]
                if not strain["description"] and rec.get("description"):
                    strain["description"] = rec["description"]
                if not strain["genetics"] and rec.get("genetics"):
                    strain["genetics"] = rec["genetics"]
                if strain.get("thc") is None and rec.get("thc") is not None:
                    strain["thc"] = rec["thc"]

                # Merge list fields
                strain["terpenes"] = merge_list_field(
                    strain["terpenes"], rec.get("terpenes", [])
                )
                strain["effects"] = merge_list_field(
                    strain["effects"], rec.get("effects", [])
                )
                strain["flavors"] = merge_list_field(
                    strain["flavors"], rec.get("flavors", [])
                )

            # Collect Weedmaps URL
            wm_url = rec.get("weedmaps_url", "")
            if wm_url and not strain["weedmaps_url"]:
                strain["weedmaps_url"] = wm_url

            # Dispensary links
            if disp and wm_url:
                strain["dispensary_links"][disp] = wm_url

        strain["dispensaries"] = sorted(disp_set)

        # Compute price stats
        price_vals = [p["price"] for p in strain["prices"]]
        if price_vals:
            strain["price_min"] = min(price_vals)
            strain["price_max"] = max(price_vals)
            strain["price_avg"] = round(sum(price_vals) / len(price_vals), 2)
        else:
            strain["price_min"] = None
            strain["price_max"] = None
            strain["price_avg"] = None

        strain["dispensary_count"] = len(disp_set)

        # Generate slug-based ID (include weight to differentiate sizes)
        slug = re.sub(r"[^a-z0-9]+", "-", strain["name"].lower()).strip("-")
        if strain.get("weight"):
            slug = f"{slug}-{strain['weight'].lower()}"
        strain["id"] = slug

        deduped.append(strain)

        if len(group) > 1:
            merge_log.append({
                "canonical": key,
                "merged_count": len(group),
                "names": [r["strain_name"] for r in group],
                "winner_name": strain["name"],
                "dispensaries": len(disp_set),
                "prices": len(strain["prices"]),
            })

    # Fix ID collisions
    id_counts = defaultdict(list)
    for s in deduped:
        id_counts[s["id"]].append(s["name"])

    collisions = {k: v for k, v in id_counts.items() if len(v) > 1}
    if collisions:
        print(f"\nWARNING: {len(collisions)} ID collisions — fixing...")
        seen_ids = set()
        for s in deduped:
            if s["id"] in seen_ids:
                i = 2
                while f"{s['id']}-{i}" in seen_ids:
                    i += 1
                s["id"] = f"{s['id']}-{i}"
            seen_ids.add(s["id"])

    # Sort by name
    deduped.sort(key=lambda s: s["name"].lower())

    # ── Grade each strain ──
    for s in deduped:
        score = 0
        if s.get("type", "").lower() in ("indica", "sativa", "hybrid"):
            score += 2
        if s.get("thc") and s["thc"] > 0:
            score += 1
        if s.get("terpenes") and len(s["terpenes"]) > 0:
            score += 2
        if s.get("effects") and len(s["effects"]) > 0:
            score += 1
        if s.get("description") and len(s["description"]) > 20:
            score += 1
        if s.get("genetics") and len(s["genetics"]) > 3:
            score += 1
        if s.get("prices") and len(s["prices"]) > 0:
            score += 1
        if s.get("brand"):
            score += 1

        if score >= 7:
            s["grade"] = "A"
        elif score >= 4:
            s["grade"] = "B"
        else:
            s["grade"] = "C"

    # Stats
    print(f"\nOutput: {len(deduped)} unique strains (merged {len(records) - len(deduped)} duplicates)")
    print(f"Merge operations: {len(merge_log)}")

    grade_dist = Counter(s["grade"] for s in deduped)
    print(f"\nGrade distribution:")
    for g in ("A", "B", "C"):
        print(f"  {g}: {grade_dist.get(g, 0)} ({100*grade_dist.get(g,0)/len(deduped):.1f}%)")

    has_prices = sum(1 for s in deduped if s["prices"])
    has_type = sum(1 for s in deduped if s["type"] in ("Indica", "Sativa", "Hybrid"))
    has_terpenes = sum(1 for s in deduped if s["terpenes"])
    has_brand = sum(1 for s in deduped if s["brand"])
    has_desc = sum(1 for s in deduped if s["description"])

    cat_dist = Counter(s.get("product_category", "Flower") for s in deduped)
    conf_dist = Counter(s.get("category_confidence", "inferred") for s in deduped)

    print(f"\nCoverage:")
    print(f"  Prices: {has_prices}/{len(deduped)} ({100*has_prices/len(deduped):.1f}%)")
    print(f"  Type: {has_type}/{len(deduped)} ({100*has_type/len(deduped):.1f}%)")
    print(f"  Terpenes: {has_terpenes}/{len(deduped)} ({100*has_terpenes/len(deduped):.1f}%)")
    print(f"  Brand: {has_brand}/{len(deduped)} ({100*has_brand/len(deduped):.1f}%)")
    print(f"  Description: {has_desc}/{len(deduped)} ({100*has_desc/len(deduped):.1f}%)")
    print(f"\nProduct categories:")
    for cat, count in cat_dist.most_common():
        print(f"  {cat}: {count}")
    print(f"Category confidence: verified={conf_dist['verified']}, inferred={conf_dist['inferred']}, conflict={conf_dist['conflict']}")

    # Save
    output_data = {
        "metadata": {
            **data["metadata"],
            "unique_strains": len(deduped),
            "merges": len(merge_log),
        },
        "strains": deduped,
        "merge_log": merge_log,
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nSaved to {OUTPUT}")
    print(f"File size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
    return output_data


if __name__ == "__main__":
    main()
