#!/usr/bin/env python3
"""
Deduplicate the v3 catalog by merging entries that represent the same strain.
Rules:
1. Group by cleaned canonical name (strip brand prefixes, size suffixes, format tags)
2. For each group, pick the "best" entry (highest grade, most fields filled)
3. Merge all dispensary/price data from all entries into the winner
4. Merge any enrichment data (effects, flavors, terpenes, genetics) from other entries
5. Normalize the canonical name to the cleanest version
"""

import json, re, copy
from collections import defaultdict

# --- Load catalog ---
with open("strainscout_catalog_v3.json") as f:
    strains = json.load(f)

print(f"Input: {len(strains)} strains")

# --- Brand list for stripping ---
BRANDS = [
    "nature's heritage", "natures heritage", "evermore", "verano", "rythm", "rhythm",
    "culta", "strane", "grassroots", "garcia", "garcia hand picked",
    "kind tree", "sunmed", "sun med", "district cannabis", "good green",
    "harvest", "cookies", "fade co.", "fade co", "liberty cannabis",
    "in-house", "curaleaf", "triple seven", "verilife", "purple city genetics",
    "select co-op", "mpx", "curio wellness", "curio", "holistic industries",
    "cresco", "columbia care", "trulieve", "gold leaf", "gleaf", "g leaf",
    "hms", "remedy", "fernway", "camp", "garcia hand-picked",
]
# Sort longest first so "garcia hand picked" matches before "garcia"
BRANDS.sort(key=len, reverse=True)

def clean_name(name):
    """Strip brand prefixes, size suffixes, and format tags to get canonical strain name."""
    n = name.strip()
    nl = n.lower()
    
    # Strip brand prefixes
    for brand in BRANDS:
        if nl.startswith(brand):
            rest = nl[len(brand):]
            if rest and rest[0] in " |-:":
                n = n[len(brand):].lstrip(" |-:")
                nl = n.lower()
                break
            elif rest == "":
                break  # The entire name IS the brand — don't strip
    
    # Strip size suffixes like "3.5g", "[3.5g]", "(3.5g)", "14g"
    n = re.sub(r'\s*[\[\(]?\d+(\.\d+)?\s*(g|oz|mg|ml|gram)s?[\]\)]?\s*$', '', n, flags=re.IGNORECASE)
    
    # Strip format suffixes
    n = re.sub(r'\s*(Smalls?|Shake|Pre-?Rolls?|Pre-?Pack|Flower|Full Buds?|Popcorn|Minis?)\s*$', '', n, flags=re.IGNORECASE)
    
    # Strip trailing pipes, dashes, spaces
    n = re.sub(r'[\s\|\-]+$', '', n)
    
    # Strip leading/trailing whitespace
    n = n.strip()
    
    return n

def canonical_key(name):
    """Lowercase cleaned name for grouping."""
    return clean_name(name).lower().strip()

def score_entry(s):
    """Score an entry for quality — higher is better."""
    grade_scores = {"A": 3, "B": 2, "C": 1}
    score = grade_scores.get(s.get("grade", "C"), 0) * 100
    
    # Prefer entries with more filled fields
    if s.get("description"): score += 10
    if s.get("genetics"): score += 10
    if s.get("effects") and len(s["effects"]) > 0: score += 5
    if s.get("flavors") and len(s["flavors"]) > 0: score += 5
    if s.get("terpenes") and len(s["terpenes"]) > 0: score += 5
    if s.get("thc") is not None: score += 5
    if s.get("prices") and len(s["prices"]) > 0: score += len(s["prices"])
    
    # Prefer cleaner names (shorter after cleaning = less junk)
    name_len = len(s["name"])
    clean_len = len(clean_name(s["name"]))
    if name_len == clean_len:
        score += 20  # Name is already clean
    
    return score

def merge_prices(winner_prices, donor_prices):
    """Merge price lists, avoiding duplicates by (dispensary, price) key."""
    existing = set()
    for p in winner_prices:
        key = (p.get("dispensary", "").lower(), p.get("price", 0))
        existing.add(key)
    
    for p in donor_prices:
        key = (p.get("dispensary", "").lower(), p.get("price", 0))
        if key not in existing:
            winner_prices.append(p)
            existing.add(key)
    
    return winner_prices

def merge_list_field(winner_list, donor_list):
    """Merge list fields (effects, flavors, terpenes), preserving order and avoiding dupes."""
    existing = set(x.lower() for x in winner_list)
    for item in donor_list:
        if item.lower() not in existing and item != "Not_Found":
            winner_list.append(item)
            existing.add(item.lower())
    return winner_list

# --- Group by canonical name ---
groups = defaultdict(list)
for s in strains:
    key = canonical_key(s["name"])
    if key:
        groups[key].append(s)
    else:
        # Empty key means the name was entirely a brand name — keep as-is
        groups[s["name"].lower()].append(s)

# --- Merge each group ---
deduped = []
merge_log = []

for key, group in groups.items():
    if len(group) == 1:
        deduped.append(group[0])
        continue
    
    # Sort by quality score, pick the best
    group.sort(key=score_entry, reverse=True)
    winner = copy.deepcopy(group[0])
    
    # Use the cleanest name
    cleaned = clean_name(winner["name"])
    if cleaned and len(cleaned) > 2:
        winner["name"] = cleaned
    
    # Merge data from all other entries
    for donor in group[1:]:
        # Merge prices
        winner["prices"] = merge_prices(winner.get("prices", []), donor.get("prices", []))
        
        # Merge list fields
        for field in ["effects", "flavors", "terpenes"]:
            winner[field] = merge_list_field(winner.get(field, []), donor.get(field, []))
        
        # Fill empty scalar fields from donor
        for field in ["description", "genetics", "thc", "cbd", "type", "brand"]:
            if not winner.get(field) and donor.get(field):
                winner[field] = donor[field]
        
        # Merge dispensary links (dict: name -> url)
        winner_dl = winner.get("dispensary_links", {})
        if not isinstance(winner_dl, dict):
            winner_dl = {}
        donor_dl = donor.get("dispensary_links", {})
        if isinstance(donor_dl, dict):
            for dname, durl in donor_dl.items():
                if dname.lower() not in {k.lower() for k in winner_dl}:
                    winner_dl[dname] = durl
        winner["dispensary_links"] = winner_dl
    
    # Recalculate derived fields
    prices = [p["price"] for p in winner.get("prices", []) if p.get("price")]
    if prices:
        winner["price_min"] = min(prices)
        winner["price_max"] = max(prices)
        winner["price_avg"] = round(sum(prices) / len(prices), 2)
    
    winner["dispensary_count"] = len(set(
        p.get("dispensary", "") for p in winner.get("prices", []) if p.get("dispensary")
    ))
    
    # Update the ID to use the cleaned name slug
    slug = re.sub(r'[^a-z0-9]+', '-', winner["name"].lower()).strip('-')
    winner["id"] = slug
    
    # Log the merge
    merge_log.append({
        "canonical": key,
        "merged_count": len(group),
        "merged_names": [s["name"] for s in group],
        "winner_name": winner["name"],
        "prices_after": len(winner.get("prices", [])),
    })
    
    deduped.append(winner)

# --- Check for ID collisions after dedup ---
id_counts = defaultdict(list)
for s in deduped:
    id_counts[s["id"]].append(s["name"])

collisions = {k: v for k, v in id_counts.items() if len(v) > 1}
if collisions:
    print(f"\nWARNING: {len(collisions)} ID collisions after dedup:")
    for k, v in list(collisions.items())[:10]:
        print(f"  {k}: {v}")
    # Fix by appending index
    seen_ids = set()
    for s in deduped:
        if s["id"] in seen_ids:
            i = 2
            while f"{s['id']}-{i}" in seen_ids:
                i += 1
            s["id"] = f"{s['id']}-{i}"
        seen_ids.add(s["id"])

# --- Sort by name ---
deduped.sort(key=lambda s: s["name"].lower())

# --- Stats ---
print(f"\nOutput: {len(deduped)} strains (removed {len(strains) - len(deduped)} duplicates)")
print(f"Merge operations: {len(merge_log)}")
print(f"Groups merged: {sum(1 for m in merge_log if m['merged_count'] > 1)}")

# Grade distribution
from collections import Counter
grades = Counter(s.get("grade", "C") for s in deduped)
print(f"\nGrade distribution:")
for g in ["A", "B", "C"]:
    print(f"  Grade {g}: {grades.get(g, 0)} ({grades.get(g, 0)/len(deduped)*100:.1f}%)")

# Coverage stats
has_type = sum(1 for s in deduped if s.get("type") and s["type"] != "Unknown")
has_brand = sum(1 for s in deduped if s.get("brand"))
has_thc = sum(1 for s in deduped if s.get("thc"))
has_prices = sum(1 for s in deduped if s.get("prices") and len(s["prices"]) > 0)
has_terpenes = sum(1 for s in deduped if s.get("terpenes") and len([t for t in s["terpenes"] if t != "Not_Found"]) > 0)
has_effects = sum(1 for s in deduped if s.get("effects") and len(s["effects"]) > 0)
has_description = sum(1 for s in deduped if s.get("description"))
has_genetics = sum(1 for s in deduped if s.get("genetics"))

print(f"\nCoverage after dedup:")
print(f"  Type: {has_type}/{len(deduped)} ({has_type/len(deduped)*100:.1f}%)")
print(f"  Brand: {has_brand}/{len(deduped)} ({has_brand/len(deduped)*100:.1f}%)")
print(f"  THC: {has_thc}/{len(deduped)} ({has_thc/len(deduped)*100:.1f}%)")
print(f"  Prices: {has_prices}/{len(deduped)} ({has_prices/len(deduped)*100:.1f}%)")
print(f"  Terpenes: {has_terpenes}/{len(deduped)} ({has_terpenes/len(deduped)*100:.1f}%)")
print(f"  Effects: {has_effects}/{len(deduped)} ({has_effects/len(deduped)*100:.1f}%)")
print(f"  Description: {has_description}/{len(deduped)} ({has_description/len(deduped)*100:.1f}%)")
print(f"  Genetics: {has_genetics}/{len(deduped)} ({has_genetics/len(deduped)*100:.1f}%)")

# --- Save ---
with open("strainscout_catalog_v4.json", "w") as f:
    json.dump(deduped, f, indent=2)

with open("strainscout_catalog_v4.min.json", "w") as f:
    json.dump(deduped, f, separators=(",", ":"))

with open("dedup_merge_log.json", "w") as f:
    json.dump(merge_log, f, indent=2)

import os
print(f"\nFile sizes:")
print(f"  v4 full: {os.path.getsize('strainscout_catalog_v4.json') / 1024 / 1024:.2f} MB")
print(f"  v4 min:  {os.path.getsize('strainscout_catalog_v4.min.json') / 1024 / 1024:.2f} MB")
print(f"\nSaved: strainscout_catalog_v4.json, strainscout_catalog_v4.min.json, dedup_merge_log.json")
