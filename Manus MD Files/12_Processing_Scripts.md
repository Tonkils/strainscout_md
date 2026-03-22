# Processing Scripts — Data Pipeline Source Code

These are the Python scripts that transformed raw scraping results into the production catalog. Each script performs a specific transformation step in the pipeline.

---

## `build_scraping_targets.py`

**Purpose:** Compiled 66 dispensary scraping targets with Weedmaps/Dutchie/iHeartJane slugs
**Lines:** 121

```python
"""
Build a comprehensive list of Maryland dispensary menu URLs across
Weedmaps, Dutchie, and iHeartJane for scraping.

Strategy: Use the MCA registry of 102 dispensaries and map each to
its online menu platform(s). We need 51+ (50%+) with scrapable menus.
"""

import json

# Load registry
with open('md_cannabis_data/md_registry.json') as f:
    reg = json.load(f)

# Known dispensary-to-platform mappings from search results and common knowledge
# Format: (trade_name_pattern, weedmaps_slug, dutchie_slug, iheartjane_slug)
# We'll build this from multiple sources

dispensary_urls = [
    # Weedmaps confirmed
    {"name": "The Dispensary", "city": "Westminster", "weedmaps": "the-dispensary-westminster", "dutchie": "the-dispensary-md"},
    {"name": "HI Tide", "city": "Ocean City", "weedmaps": "hi-tide-dispensary"},
    {"name": "SweetBuds Dispensary", "city": "Frederick", "weedmaps": "sweetbuds-dispensary"},
    {"name": "Mary & Main", "city": "Capitol Heights", "weedmaps": "mary-and-main-capitol-heights"},
    {"name": "Elevated Dispo", "city": "Salisbury", "weedmaps": "elevated-dispo", "dutchie": "elevated-dispo"},
    {"name": "The Apothecarium Cumberland", "city": "Cumberland", "weedmaps": "allegany-medical-marijuana-dispensary"},
    {"name": "Dispensary Works", "city": "White Plains", "weedmaps": "dispensary-works"},
    {"name": "Culta", "city": "Baltimore", "weedmaps": "culta"},
    {"name": "Bloom Medicinals", "city": "Germantown", "weedmaps": "bloom-medicinals-germantown"},
    {"name": "Starbuds Baltimore", "city": "Baltimore", "weedmaps": "starbuds-baltimore"},
    {"name": "Nirvana Center", "city": "Rosedale", "weedmaps": "nirvana-center-rosedale"},
    {"name": "Storehouse", "city": "Baltimore", "weedmaps": "storehouse-baltimore"},
    {"name": "Releaf Shop", "city": "Baltimore", "weedmaps": "releaf-shop"},
    {"name": "Peake Releaf", "city": "Rockville", "weedmaps": "peake-releaf"},
    {"name": "Ritual Dispensary", "city": "Glen Burnie", "weedmaps": "ritual-dispensary"},
    {"name": "Revolution Releaf", "city": "Laurel", "weedmaps": "revolution-releaf"},
    {"name": "Trilogy Wellness", "city": "Ellicott City", "weedmaps": "trilogy-wellness-of-maryland"},
    {"name": "Herbafi", "city": "Silver Spring", "weedmaps": "herbafi"},
    {"name": "Kip", "city": "Cockeysville", "weedmaps": "kip-dispensary"},
    {"name": "MCNA Wellness", "city": "Brandywine", "weedmaps": "mcna-wellness"},
    {"name": "Jova Wellness", "city": "Temple Hills", "weedmaps": "jova-wellness-center"},
    
    # Dutchie confirmed
    {"name": "Far & Dotter Elkton", "city": "Elkton", "dutchie": "far-and-dotter-elkton"},
    {"name": "Ascend Crofton", "city": "Crofton", "dutchie": "crofton-maryland"},
    {"name": "Nature's Care & Wellness", "city": "Perryville", "dutchie": "nature-care-and-wellness"},
    {"name": "Waave Cannabis", "city": "Greenbelt", "dutchie": "waave"},
    {"name": "Remedy Baltimore", "city": "Woodlawn", "dutchie": "remedy-baltimore"},
    
    # iHeartJane confirmed
    {"name": "GoldLeaf MD", "city": "Annapolis", "iheartjane": "3435/goldleaf-md-delivery"},
    {"name": "Caroline Pharma", "city": "Federalsburg", "iheartjane": "6565/caroline-pharma-rec"},
    {"name": "RISE Hagerstown", "city": "Hagerstown", "iheartjane": "5477/rise-dispensaries-hagerstown-adult-use"},
    {"name": "Sunburst Pharm", "city": "Cambridge", "iheartjane": "710/sunburst-pharm-med"},
    
    # Major chains likely on platforms
    {"name": "Curaleaf Reisterstown", "city": "Reisterstown", "weedmaps": "curaleaf-reisterstown"},
    {"name": "Curaleaf Takoma Park", "city": "Takoma Park", "weedmaps": "curaleaf-takoma-park"},
    {"name": "Trulieve Rockville", "city": "Rockville", "weedmaps": "trulieve-rockville"},
    {"name": "Trulieve Lutherville", "city": "Lutherville", "weedmaps": "trulieve-lutherville"},
    {"name": "Trulieve Halethorpe", "city": "Halethorpe", "weedmaps": "trulieve-halethorpe"},
    {"name": "Liberty Cannabis Rockville", "city": "Rockville", "weedmaps": "liberty-cannabis-rockville"},
    {"name": "Liberty Cannabis Baltimore", "city": "Baltimore", "weedmaps": "liberty-cannabis-baltimore"},
    {"name": "Liberty Cannabis Oxon Hill", "city": "Oxon Hill", "weedmaps": "liberty-cannabis-oxon-hill"},
    {"name": "Verilife New Market", "city": "New Market", "weedmaps": "verilife-new-market"},
    {"name": "Verilife Silver Spring", "city": "Silver Spring", "weedmaps": "verilife-silver-spring"},
    {"name": "Verilife Westminster", "city": "Westminster", "weedmaps": "verilife-westminster"},
    {"name": "Zen Leaf Elkridge", "city": "Elkridge", "weedmaps": "zen-leaf-elkridge"},
    {"name": "Zen Leaf Germantown", "city": "Germantown", "weedmaps": "zen-leaf-germantown"},
    {"name": "Zen Leaf Pasadena", "city": "Pasadena", "weedmaps": "zen-leaf-pasadena"},
    {"name": "Zen Leaf Towson", "city": "Towson", "weedmaps": "zen-leaf-towson"},
    {"name": "Rise Silver Spring", "city": "Silver Spring", "weedmaps": "rise-silver-spring"},
    {"name": "Rise Joppa", "city": "Joppa", "weedmaps": "rise-joppa"},
    {"name": "Mission Catonsville", "city": "Catonsville", "weedmaps": "mission-catonsville-dispensary"},
    {"name": "Mission Hampden", "city": "Baltimore", "weedmaps": "mission-hampden"},
    {"name": "Mission Rockville", "city": "Rockville", "weedmaps": "mission-rockville"},
    {"name": "Mana Supply Middle River", "city": "Middle River", "weedmaps": "mana-supply-co-middle-river"},
    {"name": "Mana Supply Edgewater", "city": "Edgewater", "weedmaps": "mana-supply-company"},
    {"name": "Story Cannabis Hyattsville", "city": "Hyattsville", "weedmaps": "story-cannabis-hyattsville"},
    {"name": "Story Cannabis Mechanicsville", "city": "Mechanicsville", "weedmaps": "story-cannabis-mechanicsville"},
    {"name": "Story Cannabis Waldorf", "city": "Waldorf", "weedmaps": "story-cannabis-waldorf"},
    {"name": "Story Cannabis Silver Spring", "city": "Silver Spring", "weedmaps": "story-cannabis-silver-spring"},
    {"name": "Green Goods Baltimore", "city": "Baltimore", "weedmaps": "green-goods-baltimore"},
    {"name": "The Apothecarium Salisbury", "city": "Salisbury", "weedmaps": "the-apothecarium-salisbury"},
    {"name": "The Apothecarium Burtonsville", "city": "Burtonsville", "weedmaps": "the-apothecarium-burtonsville"},
    {"name": "The Apothecarium Nottingham", "city": "Nottingham", "weedmaps": "the-apothecarium-nottingham"},
    {"name": "Thrive Dispensary", "city": "Annapolis", "weedmaps": "thrive-dispensary-annapolis"},
    {"name": "Temescal Wellness", "city": "Pikesville", "weedmaps": "temescal-wellness-of-maryland"},
    {"name": "Remedy Columbia", "city": "Columbia", "weedmaps": "remedy-columbia"},
    {"name": "Remedy 695", "city": "Windsor Mill", "weedmaps": "remedy-695"},
    {"name": "Health for Life White Marsh", "city": "Nottingham", "weedmaps": "health-for-life-white-marsh"},
    {"name": "Chesapeake Apothecary North", "city": "Clinton", "weedmaps": "chesapeake-apothecary"},
]

# Build full URLs
for d in dispensary_urls:
    urls = []
    if 'weedmaps' in d:
        urls.append(f"https://weedmaps.com/dispensaries/{d['weedmaps']}")
    if 'dutchie' in d:
        urls.append(f"https://dutchie.com/dispensary/{d['dutchie']}")
    if 'iheartjane' in d:
        urls.append(f"https://www.iheartjane.com/stores/{d['iheartjane']}/menu/featured")
    d['urls'] = urls

print(f"Total dispensaries with known menu URLs: {len(dispensary_urls)}")
print(f"Target (50% of 102): 51")
print(f"Coverage: {len(dispensary_urls)/102*100:.0f}%")

# Save for scraping
with open('md_cannabis_data/scraping_targets.json', 'w') as f:
    json.dump(dispensary_urls, f, indent=2)

# Print summary
wm = sum(1 for d in dispensary_urls if 'weedmaps' in d)
dt = sum(1 for d in dispensary_urls if 'dutchie' in d)
ihj = sum(1 for d in dispensary_urls if 'iheartjane' in d)
print(f"\nPlatform breakdown:")
print(f"  Weedmaps: {wm}")
print(f"  Dutchie: {dt}")
print(f"  iHeartJane: {ihj}")

```

---

## `parse_weedmaps_data.py`

**Purpose:** Parsed semicolon-delimited Weedmaps scraping results into structured JSON
**Lines:** 133

```python
#!/usr/bin/env python3
"""Parse all Weedmaps scraping results into a normalized strain-per-dispensary database."""
import json
import re
import csv

with open('/home/ubuntu/scrape_weedmaps_menus.json') as f:
    data = json.load(f)

results = data['results']

# Parse all strain records
all_records = []
parse_errors = []

for r in results:
    out = r['output']
    disp_name = out.get('dispensary_name', '')
    found = out.get('found_on_weedmaps', '').lower() == 'yes'
    wm_url = out.get('weedmaps_url', '')
    strains_raw = out.get('strains_data', 'none')
    
    if not found or strains_raw in ('none', '', 'None', 'not_found'):
        continue
    
    # Split by semicolon
    entries = strains_raw.split(';')
    
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue
        
        # Try to parse: strain_name,brand,price,weight,thc_pct,category
        parts = entry.split(',')
        
        record = {
            'dispensary': disp_name,
            'weedmaps_url': wm_url,
            'strain_name': '',
            'brand': '',
            'price': '',
            'weight': '',
            'thc_pct': '',
            'category': 'flower',
        }
        
        if len(parts) >= 1:
            record['strain_name'] = parts[0].strip()
        if len(parts) >= 2:
            record['brand'] = parts[1].strip()
        if len(parts) >= 3:
            # Clean price
            price_raw = parts[2].strip()
            price_raw = price_raw.replace('$', '').replace('N/A', '').strip()
            record['price'] = price_raw
        if len(parts) >= 4:
            record['weight'] = parts[3].strip()
        if len(parts) >= 5:
            record['thc_pct'] = parts[4].strip().replace('THC', '').replace('%', '').strip()
        if len(parts) >= 6:
            record['category'] = parts[5].strip()
        
        # Skip empty strain names
        if not record['strain_name'] or record['strain_name'] in ('N/A', 'none'):
            continue
        
        # Clean up strain name - remove size suffixes like "3.5g", "1/8 oz" etc
        name = record['strain_name']
        name = re.sub(r'\s+\d+(\.\d+)?g$', '', name)
        name = re.sub(r'\s+Flower$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s+Mixed Buds.*$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s*\|\s*Exclusive.*$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s*\|\s*Premium.*$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s+1\.0oz$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s+\d+/\d+\s*oz$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'^\s*RYTHM\s*-\s*', '', name)  # Remove RYTHM prefix
        record['strain_name'] = name.strip()
        
        all_records.append(record)

print(f"Total strain-dispensary records parsed: {len(all_records)}")

# Deduplicate by dispensary + strain_name
seen = set()
unique_records = []
for r in all_records:
    key = (r['dispensary'], r['strain_name'].lower())
    if key not in seen:
        seen.add(key)
        unique_records.append(r)

print(f"Unique strain-dispensary records: {len(unique_records)}")

# Count unique strains
unique_strains = set(r['strain_name'].lower() for r in unique_records)
print(f"Unique strain names: {len(unique_strains)}")

# Count unique dispensaries with data
unique_disps = set(r['dispensary'] for r in unique_records)
print(f"Dispensaries with strain data: {len(unique_disps)}")

# Count records with prices
with_price = [r for r in unique_records if r['price'] and r['price'] not in ('N/A', '')]
print(f"Records with prices: {len(with_price)} ({100*len(with_price)/len(unique_records):.1f}%)")

# Count records with brands
with_brand = [r for r in unique_records if r['brand'] and r['brand'] not in ('N/A', '', 'Unknown')]
print(f"Records with brands: {len(with_brand)} ({100*len(with_brand)/len(unique_records):.1f}%)")

# Count records with THC
with_thc = [r for r in unique_records if r['thc_pct'] and r['thc_pct'] not in ('N/A', '')]
print(f"Records with THC%: {len(with_thc)} ({100*len(with_thc)/len(unique_records):.1f}%)")

# Save as JSON
with open('/home/ubuntu/weedmaps_strain_data.json', 'w') as f:
    json.dump(unique_records, f, indent=2)

# Save as CSV
with open('/home/ubuntu/weedmaps_strain_data.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['dispensary', 'strain_name', 'brand', 'price', 'weight', 'thc_pct', 'category', 'weedmaps_url'])
    writer.writeheader()
    for r in unique_records:
        writer.writerow(r)

print(f"\nSaved to weedmaps_strain_data.json and weedmaps_strain_data.csv")

# Show brand distribution
from collections import Counter
brands = Counter(r['brand'] for r in unique_records if r['brand'] and r['brand'] not in ('N/A', '', 'Unknown'))
print(f"\nTop 20 brands found on Weedmaps:")
for brand, count in brands.most_common(20):
    print(f"  {brand}: {count}")

```

---

## `parse_dispensary_data.py`

**Purpose:** Parsed dispensary website scraping results into structured JSON
**Lines:** 101

```python
#!/usr/bin/env python3
"""Parse dispensary website scraping results and save normalized data."""
import json
import re
import csv

with open('/home/ubuntu/scrape_dispensary_websites.json') as f:
    data = json.load(f)

results = data['results']
all_records = []

for r in results:
    out = r['output']
    disp_name = out.get('dispensary_name', '')
    has_menu = out.get('has_online_menu', '').lower() in ('yes', 'partial')
    platform = out.get('menu_platform', 'unknown')
    strains_raw = out.get('strains_data', 'none')
    
    if not has_menu or strains_raw in ('none', '', 'None', 'not_found'):
        continue
    
    entries = strains_raw.split(';')
    
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue
        
        parts = entry.split(',')
        
        record = {
            'dispensary': disp_name,
            'source': 'dispensary_website',
            'menu_platform': platform,
            'strain_name': '',
            'brand': '',
            'price': '',
            'weight': '',
            'thc_pct': '',
        }
        
        if len(parts) >= 1:
            record['strain_name'] = parts[0].strip()
        if len(parts) >= 2:
            record['brand'] = parts[1].strip()
        if len(parts) >= 3:
            price_raw = parts[2].strip().replace('$', '').replace('N/A', '').strip()
            record['price'] = price_raw
        if len(parts) >= 4:
            record['weight'] = parts[3].strip()
        if len(parts) >= 5:
            record['thc_pct'] = parts[4].strip().replace('THC', '').replace('%', '').strip()
        
        if not record['strain_name'] or record['strain_name'] in ('N/A', 'none'):
            continue
        
        # Clean strain name
        name = record['strain_name']
        name = re.sub(r'\s+\d+(\.\d+)?g$', '', name)
        name = re.sub(r'\s+Flower$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s*\|\s*\d+(\.\d+)?g$', '', name)
        name = re.sub(r'\s*\|\s*Reserve.*$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s*\|\s*Premium.*$', '', name, flags=re.IGNORECASE)
        record['strain_name'] = name.strip()
        
        all_records.append(record)

# Deduplicate
seen = set()
unique_records = []
for r in all_records:
    key = (r['dispensary'], r['strain_name'].lower())
    if key not in seen:
        seen.add(key)
        unique_records.append(r)

print(f"Total dispensary website records parsed: {len(all_records)}")
print(f"Unique strain-dispensary records: {len(unique_records)}")
print(f"Unique strain names: {len(set(r['strain_name'].lower() for r in unique_records))}")
print(f"Dispensaries with data: {len(set(r['dispensary'] for r in unique_records))}")

with_price = [r for r in unique_records if r['price'] and r['price'] not in ('N/A', '')]
with_brand = [r for r in unique_records if r['brand'] and r['brand'] not in ('N/A', '', 'Unknown')]
with_thc = [r for r in unique_records if r['thc_pct'] and r['thc_pct'] not in ('N/A', '')]

print(f"Records with prices: {len(with_price)} ({100*len(with_price)/len(unique_records):.1f}%)")
print(f"Records with brands: {len(with_brand)} ({100*len(with_brand)/len(unique_records):.1f}%)")
print(f"Records with THC%: {len(with_thc)} ({100*len(with_thc)/len(unique_records):.1f}%)")

# Save
with open('/home/ubuntu/dispensary_website_strain_data.json', 'w') as f:
    json.dump(unique_records, f, indent=2)

with open('/home/ubuntu/dispensary_website_strain_data.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['dispensary', 'strain_name', 'brand', 'price', 'weight', 'thc_pct', 'source', 'menu_platform'])
    writer.writeheader()
    for r in unique_records:
        writer.writerow(r)

print(f"\nSaved to dispensary_website_strain_data.json and .csv")

```

---

## `build_strain_catalog_v2.py`

**Purpose:** Deduplicated 11K records into unique strain entries with aggregated stats
**Lines:** 130

```python
#!/usr/bin/env python3
"""
Build a comprehensive Maryland cannabis strain catalog from 11,115 scraped products.
Deduplicates by strain name, aggregates across dispensaries, and computes stats.
"""
import json
import re
from collections import defaultdict

# Load all products
with open('md_cannabis_data/md_flower_products_full.json') as f:
    products = json.load(f)

print(f"Loaded {len(products)} products")

def clean_strain_name(name):
    """Normalize strain names by removing weight, brand prefixes, and common suffixes."""
    name = name.strip()
    # Remove common weight patterns
    name = re.sub(r'\s*\|\s*(Flower\s*)?\d+(\.\d+)?\s*g\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*\|\s*1/\d+(th|st|nd|rd)?\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*-\s*\d+(\.\d+)?\s*g\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+\d+(\.\d+)?\s*g$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*\(\d+(\.\d+)?\s*g\)', '', name, flags=re.IGNORECASE)
    # Remove "Flower" suffix
    name = re.sub(r'\s*\|\s*Flower\s*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+Flower$', '', name, flags=re.IGNORECASE)
    # Remove brand prefixes like "Brand - " or "Brand | "
    # But be careful not to remove strain name parts
    # Remove trailing whitespace and pipes
    name = name.strip(' |')
    return name

# Group products by cleaned strain name
strain_groups = defaultdict(list)
for p in products:
    clean_name = clean_strain_name(p['strain_name'])
    if clean_name and len(clean_name) > 1:
        strain_groups[clean_name].append(p)

print(f"Unique strains after dedup: {len(strain_groups)}")

# Build strain catalog entries
catalog = []
for strain_name, entries in strain_groups.items():
    # Aggregate data across all dispensary listings
    brands = set(e['brand'] for e in entries if e.get('brand'))
    thc_vals = [e['thc_pct'] for e in entries if e.get('thc_pct') is not None and isinstance(e['thc_pct'], (int, float)) and e['thc_pct'] > 0]
    cbd_vals = [e['cbd_pct'] for e in entries if e.get('cbd_pct') is not None and isinstance(e['cbd_pct'], (int, float)) and e['cbd_pct'] > 0]
    prices = [e['price_eighth'] for e in entries if e.get('price_eighth') is not None and isinstance(e['price_eighth'], (int, float)) and e['price_eighth'] > 0]
    dispensaries = list(set(e['dispensary'] for e in entries))
    cities = list(set(e['city'] for e in entries))
    
    # Get strain type (most common)
    types = [e['strain_type'] for e in entries if e.get('strain_type')]
    strain_type = max(set(types), key=types.count) if types else ''
    
    # Get genetics (most common non-empty)
    genetics = [e['genetics'] for e in entries if e.get('genetics')]
    genetics_tag = max(set(genetics), key=genetics.count) if genetics else ''
    
    # Get terpenes (first non-empty)
    terpenes = ''
    for e in entries:
        if e.get('terpenes'):
            terpenes = e['terpenes']
            break
    
    entry = {
        'strain_name': strain_name,
        'brand': ', '.join(sorted(brands)) if brands else '',
        'strain_type': strain_type,
        'genetics': genetics_tag,
        'thc_min': round(min(thc_vals), 2) if thc_vals else None,
        'thc_max': round(max(thc_vals), 2) if thc_vals else None,
        'thc_avg': round(sum(thc_vals) / len(thc_vals), 2) if thc_vals else None,
        'cbd_min': round(min(cbd_vals), 2) if cbd_vals else None,
        'cbd_max': round(max(cbd_vals), 2) if cbd_vals else None,
        'price_min': min(prices) if prices else None,
        'price_max': max(prices) if prices else None,
        'price_avg': round(sum(prices) / len(prices), 2) if prices else None,
        'terpenes': terpenes,
        'num_dispensaries': len(dispensaries),
        'dispensaries': dispensaries,
        'cities': cities,
        'num_listings': len(entries)
    }
    
    catalog.append(entry)

# Sort by number of dispensaries (most available first)
catalog.sort(key=lambda x: (-x['num_dispensaries'], x['strain_name']))

# Save catalog
with open('md_cannabis_data/strain_catalog_v2.json', 'w') as f:
    json.dump(catalog, f, indent=2)

# Print summary stats
print(f"\n=== STRAIN CATALOG SUMMARY ===")
print(f"Total unique strains: {len(catalog)}")
print(f"With THC data: {sum(1 for s in catalog if s['thc_avg'] is not None)} ({100*sum(1 for s in catalog if s['thc_avg'] is not None)//len(catalog)}%)")
print(f"With price data: {sum(1 for s in catalog if s['price_avg'] is not None)} ({100*sum(1 for s in catalog if s['price_avg'] is not None)//len(catalog)}%)")
print(f"With brand: {sum(1 for s in catalog if s['brand']) } ({100*sum(1 for s in catalog if s['brand'])//len(catalog)}%)")
print(f"With strain type: {sum(1 for s in catalog if s['strain_type'])} ({100*sum(1 for s in catalog if s['strain_type'])//len(catalog)}%)")

# Top 20 most available strains
print(f"\nTop 20 most widely available strains:")
for i, s in enumerate(catalog[:20]):
    thc_str = f"{s['thc_avg']:.1f}%" if s['thc_avg'] else "N/A"
    price_str = f"${s['price_avg']:.0f}" if s['price_avg'] else "N/A"
    print(f"  {i+1}. {s['strain_name']} ({s['strain_type']}) - THC: {thc_str}, Price: {price_str}, at {s['num_dispensaries']} dispensaries")

# Strain type distribution
from collections import Counter
type_counts = Counter(s['strain_type'] for s in catalog if s['strain_type'])
print(f"\nStrain type distribution:")
for t, c in type_counts.most_common():
    print(f"  {t}: {c} ({100*c//len(catalog)}%)")

# Save the unique strain names for Leafly enrichment
strain_names_for_enrichment = []
for s in catalog:
    if not s.get('terpenes'):  # Needs enrichment
        strain_names_for_enrichment.append(s['strain_name'])

with open('md_cannabis_data/strains_for_enrichment.txt', 'w') as f:
    for name in strain_names_for_enrichment:
        f.write(name + '\n')

print(f"\nStrains needing Leafly enrichment: {len(strain_names_for_enrichment)}")

```

---

## `accuracy_assurance_method.py`

**Purpose:** 5-layer reconciliation: name normalization, brand resolution, price triangulation, profile verification, confidence scoring
**Lines:** 473

```python
#!/usr/bin/env python3
"""
Step 5: Accuracy Assurance Method
Reconciles three data sources (original catalog, Weedmaps, dispensary websites)
into a single verified record per strain with confidence scoring.

The method works in 5 layers:
1. Strain Name Normalization — canonical name matching across sources
2. Brand/Grower Resolution — map consumer brands to MCA-licensed growers
3. Price Triangulation — reconcile prices across sources with freshness weighting
4. Profile Verification — THC%, terpenes validated against Leafly reference data
5. Confidence Scoring — each field gets a confidence grade (A/B/C/F)
"""
import json
import re
from collections import defaultdict
from difflib import SequenceMatcher

# ============================================================
# LOAD ALL DATA SOURCES
# ============================================================

# Source 1: Original strain catalog
with open('/home/ubuntu/strain_catalog.json') as f:
    catalog_data = json.load(f)

# Source 2: Weedmaps scraped data
with open('/home/ubuntu/weedmaps_strain_data.json') as f:
    wm_data = json.load(f)

# Source 3: Dispensary website scraped data
with open('/home/ubuntu/dispensary_website_strain_data.json') as f:
    dw_data = json.load(f)

# Benchmarks
with open('/home/ubuntu/grower_benchmark.json') as f:
    grower_benchmark = json.load(f)

with open('/home/ubuntu/dispensary_benchmark.json') as f:
    disp_benchmark = json.load(f)

# ============================================================
# LAYER 1: STRAIN NAME NORMALIZATION
# ============================================================

def normalize_strain_name(name):
    """Normalize strain name for fuzzy matching."""
    if not name:
        return ''
    name = name.lower().strip()
    # Remove common suffixes
    name = re.sub(r'\s*\(.*?\)\s*', ' ', name)
    name = re.sub(r'\s+\d+(\.\d+)?g$', '', name)
    name = re.sub(r'\s+flower$', '', name)
    name = re.sub(r'\s+mixed\s+buds.*$', '', name)
    name = re.sub(r'\s*\|\s*.*$', '', name)
    name = re.sub(r'\s*-\s*\d+(\.\d+)?g$', '', name)
    # Remove special chars but keep spaces
    name = re.sub(r'[^\w\s#]', '', name)
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def fuzzy_match(name1, name2, threshold=0.85):
    """Check if two strain names are similar enough to be the same."""
    n1 = normalize_strain_name(name1)
    n2 = normalize_strain_name(name2)
    if n1 == n2:
        return True
    return SequenceMatcher(None, n1, n2).ratio() >= threshold

# ============================================================
# LAYER 2: BRAND/GROWER RESOLUTION
# ============================================================

# Build brand-to-grower mapping from benchmark
brand_to_grower = {}
for g in grower_benchmark:
    legal_name = g.get('legal_entity', '')
    primary_brand = g.get('primary_brand', '')
    sub_brands = g.get('sub_brands', '')
    
    if primary_brand:
        brand_to_grower[primary_brand.lower()] = {
            'legal_entity': legal_name,
            'primary_brand': primary_brand,
            'mca_license': g.get('mca_license', ''),
        }
    
    if sub_brands:
        for sb in sub_brands.split(','):
            sb = sb.strip()
            if sb:
                brand_to_grower[sb.lower()] = {
                    'legal_entity': legal_name,
                    'primary_brand': primary_brand,
                    'mca_license': g.get('mca_license', ''),
                }

# Add common brand aliases
aliases = {
    'curio wellness™': 'curio wellness',
    'curio exclusive': 'curio wellness',
    'curio': 'curio wellness',
    'rythm': 'rythm',
    'gti': 'rythm',
    'green thumb industries': 'rythm',
    'sunmed': 'sunmed growers',
    'sunmed growers': 'sunmed growers',
    'evermore': 'evermore cannabis company',
    'evermore cannabis company': 'evermore cannabis company',
    '(the) essence': 'the essence',
    'essence': 'the essence',
    'strane': 'strane',
    'holistic industries': 'strane',
    'garcia hand picked': 'garcia hand picked',
    'garcia': 'garcia hand picked',
    'good green': 'good green',
    'bl^ck mrkt': 'black market',
    'black market': 'black market',
    'modern flower': 'modern flower',
    'savvy': 'savvy',
    'grassroots': 'grassroots',
    'select': 'select',
    'fade co': 'fade co.',
    'fade co.': 'fade co.',
    'district cannabis': 'district cannabis',
    'cookies': 'cookies',
    'culta': 'culta',
    'nature\'s heritage': "nature's heritage",
    'natures heritage': "nature's heritage",
    'find': 'find',
    'redemption': 'redemption',
    'just flower': 'just flower',
    'kind tree': 'kind tree',
}

def resolve_brand(brand_name):
    """Resolve a consumer brand name to its canonical form and MCA grower."""
    if not brand_name:
        return {'canonical_brand': '', 'grower': '', 'confidence': 'F'}
    
    bn = brand_name.lower().strip()
    
    # Check aliases first
    if bn in aliases:
        canonical = aliases[bn]
    else:
        canonical = bn
    
    # Check grower benchmark
    if canonical in brand_to_grower:
        info = brand_to_grower[canonical]
        return {
            'canonical_brand': info['primary_brand'],
            'grower': info['legal_entity'],
            'confidence': 'A',
        }
    
    # Fuzzy match against known brands
    best_match = None
    best_score = 0
    for known_brand in brand_to_grower:
        score = SequenceMatcher(None, canonical, known_brand).ratio()
        if score > best_score and score >= 0.8:
            best_score = score
            best_match = known_brand
    
    if best_match:
        info = brand_to_grower[best_match]
        return {
            'canonical_brand': info['primary_brand'],
            'grower': info['legal_entity'],
            'confidence': 'B',
        }
    
    return {'canonical_brand': brand_name, 'grower': '', 'confidence': 'C'}

# ============================================================
# LAYER 3: PRICE TRIANGULATION
# ============================================================

def triangulate_price(catalog_price, wm_price, dw_price):
    """
    Reconcile prices from up to 3 sources.
    Priority: dispensary website > weedmaps > catalog (freshness order)
    """
    prices = []
    
    for label, p in [('dw', dw_price), ('wm', wm_price), ('catalog', catalog_price)]:
        if p and str(p).strip() not in ('', 'N/A', 'None', '0'):
            try:
                val = float(str(p).replace('$', '').strip())
                if 1 < val < 500:  # Sanity check
                    prices.append((label, val))
            except ValueError:
                pass
    
    if not prices:
        return {'price': '', 'source': '', 'confidence': 'F'}
    
    if len(prices) == 1:
        return {'price': prices[0][1], 'source': prices[0][0], 'confidence': 'B'}
    
    # If 2+ sources agree within $3, high confidence
    if len(prices) >= 2:
        vals = [p[1] for p in prices]
        if max(vals) - min(vals) <= 3.0:
            # Use dispensary website price if available, else weedmaps
            best = next((p for p in prices if p[0] == 'dw'), prices[0])
            return {'price': best[1], 'source': best[0], 'confidence': 'A'}
        else:
            # Disagreement — use most recent (dw > wm > catalog)
            best = next((p for p in prices if p[0] == 'dw'), 
                       next((p for p in prices if p[0] == 'wm'), prices[0]))
            return {'price': best[1], 'source': best[0], 'confidence': 'C',
                    'note': f'Price disagreement: {prices}'}
    
    return {'price': prices[0][1], 'source': prices[0][0], 'confidence': 'B'}

# ============================================================
# LAYER 4: PROFILE VERIFICATION
# ============================================================

def verify_thc(catalog_thc, wm_thc, dw_thc):
    """Verify THC% across sources."""
    values = []
    
    for label, t in [('dw', dw_thc), ('wm', wm_thc), ('catalog', catalog_thc)]:
        if t and str(t).strip() not in ('', 'N/A', 'None', '0'):
            try:
                val = float(str(t).replace('%', '').strip())
                if 0 < val < 50:  # Sanity check (THC can't be >50%)
                    values.append((label, val))
            except ValueError:
                pass
    
    if not values:
        return {'thc': '', 'source': '', 'confidence': 'F'}
    
    if len(values) == 1:
        return {'thc': values[0][1], 'source': values[0][0], 'confidence': 'B'}
    
    # If 2+ sources agree within 5% (absolute), high confidence
    vals = [v[1] for v in values]
    if max(vals) - min(vals) <= 5.0:
        avg = sum(vals) / len(vals)
        return {'thc': round(avg, 2), 'source': 'avg', 'confidence': 'A'}
    else:
        # Large disagreement — flag for review, use median
        vals_sorted = sorted(vals)
        median = vals_sorted[len(vals_sorted) // 2]
        return {'thc': median, 'source': 'median', 'confidence': 'C',
                'note': f'THC disagreement: {values}'}

# ============================================================
# LAYER 5: CONFIDENCE SCORING
# ============================================================

def calculate_overall_confidence(field_confidences):
    """Calculate overall record confidence from individual field grades."""
    grades = list(field_confidences.values())
    grade_scores = {'A': 4, 'B': 3, 'C': 2, 'F': 0}
    
    total = sum(grade_scores.get(g, 0) for g in grades)
    max_possible = len(grades) * 4
    
    if max_possible == 0:
        return 'F'
    
    ratio = total / max_possible
    
    if ratio >= 0.85:
        return 'A'
    elif ratio >= 0.65:
        return 'B'
    elif ratio >= 0.45:
        return 'C'
    else:
        return 'F'

# ============================================================
# MAIN RECONCILIATION
# ============================================================

print("=" * 70)
print("STEP 5: ACCURACY ASSURANCE METHOD — RECONCILIATION ENGINE")
print("=" * 70)

# Build a unified strain index from all sources
# Key: normalized strain name
# Value: list of records from different sources

unified = defaultdict(lambda: {'catalog': [], 'weedmaps': [], 'dispensary_website': []})

# Index catalog data
for row in catalog_data:
    strain_name = row.get('Strain Name', '') or row.get('strain_name', '')
    if strain_name:
        norm = normalize_strain_name(strain_name)
        unified[norm]['catalog'].append(row)

# Index Weedmaps data
for rec in wm_data:
    norm = normalize_strain_name(rec['strain_name'])
    unified[norm]['weedmaps'].append(rec)

# Index dispensary website data
for rec in dw_data:
    norm = normalize_strain_name(rec['strain_name'])
    unified[norm]['dispensary_website'].append(rec)

print(f"\nTotal unique normalized strain names: {len(unified)}")
print(f"  In catalog: {sum(1 for v in unified.values() if v['catalog'])}")
print(f"  In Weedmaps: {sum(1 for v in unified.values() if v['weedmaps'])}")
print(f"  In dispensary websites: {sum(1 for v in unified.values() if v['dispensary_website'])}")
print(f"  In 2+ sources: {sum(1 for v in unified.values() if sum(1 for s in v.values() if s) >= 2)}")
print(f"  In all 3 sources: {sum(1 for v in unified.values() if all(v.values()))}")

# Reconcile each strain
reconciled = []
flagged = []

for norm_name, sources in unified.items():
    cat_recs = sources['catalog']
    wm_recs = sources['weedmaps']
    dw_recs = sources['dispensary_website']
    
    # Get the best strain name (prefer catalog, then weedmaps, then website)
    if cat_recs:
        strain_name = cat_recs[0].get('Strain Name', '') or cat_recs[0].get('strain_name', '')
    elif wm_recs:
        strain_name = wm_recs[0]['strain_name']
    else:
        strain_name = dw_recs[0]['strain_name']
    
    # Resolve brand/grower
    brands = []
    if cat_recs:
        b = cat_recs[0].get('Grower/Brand', '') or cat_recs[0].get('grower_brand', '')
        if b:
            brands.append(b)
    for r in wm_recs:
        if r.get('brand'):
            brands.append(r['brand'])
    for r in dw_recs:
        if r.get('brand'):
            brands.append(r['brand'])
    
    # Use most common brand
    if brands:
        from collections import Counter
        brand_counts = Counter(b.strip() for b in brands if b.strip())
        primary_brand = brand_counts.most_common(1)[0][0] if brand_counts else ''
    else:
        primary_brand = ''
    
    brand_info = resolve_brand(primary_brand)
    
    # Get strain type from catalog
    strain_type = ''
    if cat_recs:
        strain_type = cat_recs[0].get('Type', '') or cat_recs[0].get('type', '')
    
    # Get THC from all sources
    cat_thc = cat_recs[0].get('THC %', '') or cat_recs[0].get('thc_pct', '') if cat_recs else ''
    wm_thcs = [r.get('thc_pct', '') for r in wm_recs if r.get('thc_pct')]
    dw_thcs = [r.get('thc_pct', '') for r in dw_recs if r.get('thc_pct')]
    wm_thc = wm_thcs[0] if wm_thcs else ''
    dw_thc = dw_thcs[0] if dw_thcs else ''
    
    thc_info = verify_thc(cat_thc, wm_thc, dw_thc)
    
    # Get terpenes from catalog (only source with terpene data)
    terpenes = ''
    if cat_recs:
        terpenes = cat_recs[0].get('Terpenes', '') or cat_recs[0].get('terpenes', '')
    
    # Build per-dispensary price records
    dispensary_prices = {}
    for r in wm_recs:
        disp = r['dispensary']
        price = r.get('price', '')
        dispensary_prices[disp] = {'wm_price': price, 'dw_price': ''}
    for r in dw_recs:
        disp = r['dispensary']
        price = r.get('price', '')
        if disp in dispensary_prices:
            dispensary_prices[disp]['dw_price'] = price
        else:
            dispensary_prices[disp] = {'wm_price': '', 'dw_price': price}
    
    # Get catalog prices
    cat_price_min = ''
    cat_price_avg = ''
    if cat_recs:
        cat_price_min = cat_recs[0].get('Price (Low)', '') or cat_recs[0].get('price_low', '')
        cat_price_avg = cat_recs[0].get('Price (Avg)', '') or cat_recs[0].get('price_avg', '')
    
    # Count sources
    source_count = sum(1 for s in [cat_recs, wm_recs, dw_recs] if s)
    
    # Calculate field confidences
    field_conf = {
        'name': 'A' if source_count >= 2 else 'B',
        'brand': brand_info['confidence'],
        'thc': thc_info['confidence'],
        'dispensaries': 'A' if len(dispensary_prices) >= 2 else ('B' if dispensary_prices else 'F'),
    }
    
    overall_conf = calculate_overall_confidence(field_conf)
    
    record = {
        'strain_name': strain_name,
        'normalized_name': norm_name,
        'strain_type': strain_type,
        'brand': brand_info['canonical_brand'],
        'grower_legal': brand_info['grower'],
        'brand_confidence': brand_info['confidence'],
        'thc_pct': thc_info.get('thc', ''),
        'thc_source': thc_info.get('source', ''),
        'thc_confidence': thc_info['confidence'],
        'terpenes': terpenes,
        'dispensary_count': len(dispensary_prices),
        'dispensary_prices': dispensary_prices,
        'source_count': source_count,
        'in_catalog': bool(cat_recs),
        'in_weedmaps': bool(wm_recs),
        'in_dispensary_website': bool(dw_recs),
        'field_confidences': field_conf,
        'overall_confidence': overall_conf,
    }
    
    if overall_conf in ('A', 'B'):
        reconciled.append(record)
    else:
        flagged.append(record)

print(f"\n--- Reconciliation Results ---")
print(f"Total strains processed: {len(reconciled) + len(flagged)}")
print(f"Passed (A/B confidence): {len(reconciled)}")
print(f"Flagged (C/F confidence): {len(flagged)}")

# Confidence distribution
from collections import Counter
conf_dist = Counter(r['overall_confidence'] for r in reconciled + flagged)
print(f"\nConfidence distribution:")
for grade in ['A', 'B', 'C', 'F']:
    print(f"  Grade {grade}: {conf_dist.get(grade, 0)}")

# Save results
with open('/home/ubuntu/reconciled_strains.json', 'w') as f:
    json.dump(reconciled, f, indent=2, default=str)

with open('/home/ubuntu/flagged_strains.json', 'w') as f:
    json.dump(flagged, f, indent=2, default=str)

print(f"\nSaved: reconciled_strains.json ({len(reconciled)} records)")
print(f"Saved: flagged_strains.json ({len(flagged)} records)")

# Summary stats
total = len(reconciled) + len(flagged)
with_brand = sum(1 for r in reconciled if r['brand'])
with_grower = sum(1 for r in reconciled if r['grower_legal'])
with_thc = sum(1 for r in reconciled if r['thc_pct'])
with_terpenes = sum(1 for r in reconciled if r['terpenes'])
with_prices = sum(1 for r in reconciled if r['dispensary_count'] > 0)

print(f"\n--- Reconciled Strain Data Quality ---")
print(f"With brand: {with_brand}/{len(reconciled)} ({100*with_brand/max(len(reconciled),1):.1f}%)")
print(f"With MCA grower: {with_grower}/{len(reconciled)} ({100*with_grower/max(len(reconciled),1):.1f}%)")
print(f"With THC%: {with_thc}/{len(reconciled)} ({100*with_thc/max(len(reconciled),1):.1f}%)")
print(f"With terpenes: {with_terpenes}/{len(reconciled)} ({100*with_terpenes/max(len(reconciled),1):.1f}%)")
print(f"With dispensary prices: {with_prices}/{len(reconciled)} ({100*with_prices/max(len(reconciled),1):.1f}%)")

```

---

## `comprehensive_reconcile.py`

**Purpose:** Merged Leafly enrichment, new scrape data, link generation into final catalog
**Lines:** 619

```python
#!/usr/bin/env python3
"""
Comprehensive reconciliation:
1. Apply new Leafly untyped lookup results (533 strains)
2. Apply previously matched Leafly data (42 strains)
3. Apply first-round Leafly data to remaining gaps
4. Use name-pattern inference for still-untyped strains
5. Generate Leafly/Weedmaps/dispensary links for all strains
6. Integrate 534 new strains from dispensary scraping
7. Build final source of truth catalog
"""
import json, re
from collections import Counter

# ── Load all data sources ──
print("Loading data sources...")
with open('/home/ubuntu/strainscout_catalog_final.json') as f:
    catalog = json.load(f)
print(f"  Catalog: {len(catalog)} strains")

with open('/home/ubuntu/leafly_untyped_lookup.json') as f:
    untyped_leafly = json.load(f)
untyped_results = untyped_leafly.get('results', [])
print(f"  Untyped Leafly results: {len(untyped_results)}")

with open('/home/ubuntu/untyped_already_matched.json') as f:
    already_matched = json.load(f)
print(f"  Previously matched: {len(already_matched)}")

with open('/home/ubuntu/leafly_comprehensive_scrape.json') as f:
    first_leafly = json.load(f)
first_results = first_leafly.get('results', [])
print(f"  First-round Leafly results: {len(first_results)}")

with open('/home/ubuntu/new_strains_from_scrape.json') as f:
    new_strains = json.load(f)
print(f"  New strains from scraping: {len(new_strains)}")

# Load dispensary benchmark for link generation
with open('/home/ubuntu/dispensary_benchmark.json') as f:
    disp_benchmark = json.load(f)
print(f"  Dispensary benchmark: {len(disp_benchmark)} entries")

# ── Build Leafly lookup index ──
leafly_index = {}  # lowercase name -> data

# First round results
for r in first_results:
    output = r.get('output', {})
    if isinstance(output, dict) and output.get('found') == True:
        name = output.get('strain_name', '').lower().strip()
        if name:
            leafly_index[name] = output

# Untyped results (newer, takes priority)
for r in untyped_results:
    output = r.get('output', {})
    if isinstance(output, dict) and output.get('found', '').lower() == 'yes':
        name = output.get('strain_name', '').lower().strip()
        if name:
            leafly_index[name] = output

print(f"\nTotal unique Leafly entries: {len(leafly_index)}")

# ── Name cleaning function ──
def extract_pure_name(name):
    """Extract the pure strain name from a catalog entry."""
    n = name
    n = re.sub(r'\(.*?\)', '', n).strip()
    for sep in ['|', ' - ', ' \u2013 ', ':']:
        if sep in n:
            parts = [p.strip() for p in n.split(sep) if p.strip()]
            format_words = {'flower', 'buds', 'smalls', 'shake', 'pre-roll', 'preroll',
                          'whole', 'premium', 'select', 'ground', 'popcorn', 'prepack',
                          'pre-pack', 'prepacked', 'indica', 'sativa', 'hybrid', 'reserve'}
            meaningful = [p for p in parts if p.lower() not in format_words and len(p) > 2]
            if meaningful:
                n = meaningful[-1]
    # Remove weight/size
    n = re.sub(r'\s*\d+(\.\d+)?\s*(g|oz|mg)\b', '', n, flags=re.I).strip()
    n = re.sub(r'\s*\d+/\d+\s*oz\b', '', n, flags=re.I).strip()
    # Remove format suffixes
    for pat in [
        r'\s*(Smalls?|Shake|Ground|Popcorn|Mini|Minis|Whole|Full|Littles?)\s*$',
        r'\s*(Pre-?Roll|Pre-?Pack|PrePack|Prepacked?|Pre-?Ground)\s*$',
        r'\s*(Premium|Select|Reserve|Exclusive|Limited)\s*$',
        r'\s*(Flower|Buds?|Nug|Nugs)\s*$',
        r'\s*(Mixed|Trim|Kief|PRJs?)\s*$',
        r'\s*#\d+\s*$',
        r'\s*\d+\s*pk\s*$',
        r'\s*\[\]\s*$',
    ]:
        n = re.sub(pat, '', n, flags=re.I).strip()
    # Remove brand names
    brands = [
        'RYTHM', 'Verano', 'Culta', 'Evermore', 'Grassroots', "Nature's Heritage",
        'District Cannabis', 'Garcia Hand Picked', 'Good Green', 'Kind Tree', 'Strane',
        'SunMed', 'Harvest', 'Curio', 'HMS', 'Cookies', 'BLVCK MRKT', 'Cresco',
        'Rhythm', 'gLeaf', 'Holistic', 'Fernway', 'Revelry', 'Hana', 'MPX',
        'Trulieve', 'Curaleaf', 'Vireo', 'Zen Leaf', 'Gold Leaf', 'Remedy',
        'Allegany', 'Harvest House', 'Redemption', 'Just Flower', 'Foreign',
        'Fade Co.', 'Fade Co', 'Bmore', 'Local', '&shine', 'the Essence',
        '(the) Essence', '(The) Essence', 'ESSENCE', '1937', 'Aeriz',
        'Modern Flower', 'Savvy', 'Roll One', 'Find.', 'Find', 'Legend',
        'Everyday', 'Exclusive', 'Wellness', 'Happy Eddie', 'HAPPY EDDIE',
        'Seed & Strain', 'Wildflower', 'MARKET', 'ROLL ONE', 'SAVVY',
        'House Of Kush', 'HOUSE OF KUSH', 'Dark Heart', 'DARK HEART',
        'MOTHER EXOTIC', 'EDIE PARKER', 'Edie Parker', 'Flower Pot',
        'Standard Wellness', 'Main St. Flower Club', 'Triple 7\'s',
        'PHASE 3', 'PHAS3', 'Shore Natural', 'Growers',
    ]
    for b in sorted(brands, key=len, reverse=True):
        pattern = re.escape(b)
        n = re.sub(r'^' + pattern + r'[\s\-|:]*', '', n, flags=re.I).strip()
    # Remove trailing brand references
    n = re.sub(r'\s*[-|]\s*(Strane|Verano|Culta|Rythm|RYTHM|Evermore|Grassroots|Curio|HMS|SunMed|Kind Tree|gLeaf|Cresco|Cookies|Garcia|Harvest|Holistic|Fernway|Revelry|Hana|MPX|Grow West|Trulieve|Curaleaf|Vireo|Remedy|Gold Leaf|Zen Leaf|Allegany|Harvest House|Redemption|Bmore|Local).*$', '', n, flags=re.I).strip()
    n = re.sub(r'\s*by\s*(Strane|Verano|Culta|Rythm|Evermore|Grassroots|Curio|HMS|SunMed|Kind Tree|gLeaf|Cresco|Cookies|Garcia|Harvest|Holistic|Grow West|Trulieve|Curaleaf|Vireo|Remedy|Gold Leaf|ForwardGro|Liberty|Curio Wellness).*$', '', n, flags=re.I).strip()
    # Clean up
    n = re.sub(r'\b(Indica|Sativa|Hybrid)\b\s*(Dominant)?\s*', '', n, flags=re.I).strip()
    n = re.sub(r'^[\s\-|:./]+', '', n).strip()
    n = re.sub(r'[\s\-|:./\[\]]+$', '', n).strip()
    n = re.sub(r'\s*>?\d+[\-\s]*\d*%?\s*(8th|quarter|half|oz)?\s*$', '', n, flags=re.I).strip()
    return n if len(n) >= 2 else name

def make_leafly_slug(name):
    """Convert strain name to Leafly URL slug."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug

def find_leafly_match(name):
    """Try multiple name variations to find a Leafly match."""
    pure = extract_pure_name(name)
    
    # Try exact match
    if pure.lower() in leafly_index:
        return leafly_index[pure.lower()]
    
    # Try without special chars
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', pure).strip().lower()
    if clean in leafly_index:
        return leafly_index[clean]
    
    # Try first two words (many strains are two-word names)
    words = pure.split()
    if len(words) >= 2:
        two_word = ' '.join(words[:2]).lower()
        if two_word in leafly_index:
            return leafly_index[two_word]
    
    # Try without "x" crosses (e.g., "Animal Face x Sherb Crasher" -> "Animal Face")
    if ' x ' in pure.lower():
        first_parent = pure.lower().split(' x ')[0].strip()
        if first_parent in leafly_index:
            return leafly_index[first_parent]
    
    return None

# ── STEP 1: Apply Leafly data to catalog ──
print("\n" + "=" * 70)
print("STEP 1: APPLYING LEAFLY DATA TO CATALOG")
print("=" * 70)

def parse_csv_field(val):
    """Parse a comma-separated string into a list."""
    if not val or val.lower() in ('', 'n/a', 'none', 'not found', 'not available'):
        return []
    return [v.strip() for v in val.split(',') if v.strip()]

stats = Counter()
catalog_by_id = {s['id']: s for s in catalog}

for s in catalog:
    match = find_leafly_match(s['name'])
    if not match:
        stats['no_match'] += 1
        continue
    
    stats['matched'] += 1
    
    # Apply type if missing
    stype = s.get('type', '').lower()
    if stype not in ('indica', 'sativa', 'hybrid'):
        leafly_type = match.get('strain_type', '').lower()
        if leafly_type in ('indica', 'sativa', 'hybrid'):
            s['type'] = leafly_type.capitalize()
            s['type_source'] = 'leafly'
            stats['type_filled'] += 1
    
    # Apply terpenes if missing
    if not s.get('terpenes') or s['terpenes'] == ['Not_Found']:
        terps = parse_csv_field(match.get('terpenes', ''))
        if terps:
            s['terpenes'] = terps
            stats['terpenes_filled'] += 1
    
    # Apply effects if missing
    if not s.get('effects'):
        effects = parse_csv_field(match.get('effects', ''))
        if effects:
            s['effects'] = effects
            stats['effects_filled'] += 1
    
    # Apply flavors if missing
    if not s.get('flavors'):
        flavors = parse_csv_field(match.get('flavors', ''))
        if flavors:
            s['flavors'] = flavors
            stats['flavors_filled'] += 1
    
    # Apply description if missing
    if not s.get('description'):
        desc = match.get('description', '')
        if desc and len(desc) > 10:
            s['description'] = desc
            stats['description_filled'] += 1
    
    # Apply genetics if missing
    if not s.get('genetics'):
        genetics = match.get('genetics', '')
        if genetics and len(genetics) > 3:
            s['genetics'] = genetics
            stats['genetics_filled'] += 1
    
    # Apply Leafly URL
    leafly_url = match.get('leafly_url', '')
    if leafly_url and leafly_url.startswith('http'):
        s['leafly_url'] = leafly_url
        stats['leafly_url_added'] += 1
    elif not s.get('leafly_url'):
        pure = extract_pure_name(s['name'])
        slug = make_leafly_slug(pure)
        if slug:
            s['leafly_url'] = f"https://www.leafly.com/strains/{slug}"
            stats['leafly_url_generated'] += 1

# Also apply the 42 previously matched
for m in already_matched:
    sid = m['id']
    if sid in catalog_by_id:
        s = catalog_by_id[sid]
        if s.get('type', '').lower() not in ('indica', 'sativa', 'hybrid'):
            ltype = m.get('leafly_type', '').lower()
            if ltype in ('indica', 'sativa', 'hybrid'):
                s['type'] = ltype.capitalize()
                s['type_source'] = 'leafly_prev'
                stats['type_filled'] += 1
        if not s.get('terpenes') or s['terpenes'] == ['Not_Found']:
            terps = parse_csv_field(m.get('leafly_terpenes', ''))
            if terps:
                s['terpenes'] = terps
                stats['terpenes_filled'] += 1
        if not s.get('effects'):
            effects = parse_csv_field(m.get('leafly_effects', ''))
            if effects:
                s['effects'] = effects
                stats['effects_filled'] += 1
        if not s.get('flavors'):
            flavors = parse_csv_field(m.get('leafly_flavors', ''))
            if flavors:
                s['flavors'] = flavors
                stats['flavors_filled'] += 1
        if not s.get('description'):
            desc = m.get('leafly_description', '')
            if desc and len(desc) > 10:
                s['description'] = desc
                stats['description_filled'] += 1
        if not s.get('genetics'):
            genetics = m.get('leafly_genetics', '')
            if genetics and len(genetics) > 3:
                s['genetics'] = genetics
                stats['genetics_filled'] += 1

print(f"\nLeafly matching stats:")
for k, v in sorted(stats.items()):
    print(f"  {k}: {v}")

# ── STEP 2: Name-pattern type inference for remaining untyped ──
print("\n" + "=" * 70)
print("STEP 2: NAME-PATTERN TYPE INFERENCE")
print("=" * 70)

INDICA_PATTERNS = [
    r'\bkush\b', r'\bog\b', r'\bpurple\b', r'\bbubba\b', r'\bgranddaddy\b',
    r'\bafghani?\b', r'\bnorthern.?lights?\b', r'\bblueberry\b', r'\bgrape\b',
    r'\bpurp\b', r'\bskywalker\b', r'\bgorilla\b', r'\bdo.?si.?do\b',
    r'\bgmo\b', r'\bmk.?ultra\b', r'\bdiablo\b', r'\bpunch\b',
    r'\bzerbert\b', r'\blavender\b', r'\bmendo\b', r'\bforbidden\b',
    r'\bslurricane\b', r'\bsedative\b', r'\bsleep\b',
]

SATIVA_PATTERNS = [
    r'\bhaze\b', r'\bjack\b', r'\bdurban\b', r'\btangie\b',
    r'\bgreen.?crack\b', r'\bsuper.?silver\b', r'\bmaui\b',
    r'\btrain.?wreck\b', r'\bstrawberry.?cough\b', r'\bcinderella\b',
    r'\bacapulco\b', r'\bpanama\b', r'\bcolombian\b', r'\bthai\b',
    r'\bamnesia\b', r'\bclementine\b', r'\belectric\b',
    r'\bpineapple\b.*\bexpress\b', r'\benergy\b',
]

HYBRID_PATTERNS = [
    r'\bgelato\b', r'\bruntz\b', r'\bcookies?\b', r'\bzkittlez\b',
    r'\bblue.?dream\b', r'\bgirl.?scout\b', r'\bgsc\b', r'\bwhite.?widow\b',
    r'\bgorilla.?glue\b', r'\bgg\d?\b', r'\bchemdog\b', r'\bdiesel\b',
    r'\bsherbet\b', r'\bice.?cream\b', r'\bcandy\b', r'\bsundae\b',
    r'\bwedding.?cake\b', r'\bapple\b', r'\bmac\b', r'\bgarlic\b',
    r'\bglue\b', r'\bbiscotti\b', r'\bcake\b', r'\bbanana\b',
]

def predict_type_name(name):
    name_lower = name.lower()
    indica_score = sum(1 for p in INDICA_PATTERNS if re.search(p, name_lower))
    sativa_score = sum(1 for p in SATIVA_PATTERNS if re.search(p, name_lower))
    hybrid_score = sum(1 for p in HYBRID_PATTERNS if re.search(p, name_lower))
    total = indica_score + sativa_score + hybrid_score
    if total == 0:
        return 'Hybrid', 0.33, 'default'
    scores = {'Indica': indica_score, 'Sativa': sativa_score, 'Hybrid': hybrid_score}
    best = max(scores, key=scores.get)
    confidence = scores[best] / total
    if sum(1 for v in scores.values() if v > 0) == 1:
        confidence = min(confidence + 0.2, 1.0)
    return best, confidence, 'name_pattern'

still_untyped = [s for s in catalog if s.get('type', '').lower() not in ('indica', 'sativa', 'hybrid')]
print(f"Still untyped after Leafly: {len(still_untyped)}")

inferred_count = 0
high_conf = 0
for s in still_untyped:
    pred_type, conf, method = predict_type_name(s['name'])
    s['type'] = pred_type
    s['type_confidence'] = round(conf, 3)
    s['type_source'] = method
    inferred_count += 1
    if conf >= 0.6:
        high_conf += 1

print(f"Inferred types: {inferred_count}")
print(f"High confidence (>=0.6): {high_conf}")
print(f"Low confidence (default hybrid): {inferred_count - high_conf}")

# ── STEP 3: Generate links for all strains ──
print("\n" + "=" * 70)
print("STEP 3: GENERATING LINKS")
print("=" * 70)

# Build dispensary URL index
disp_urls = {}
for d in disp_benchmark:
    name = d.get('canonical_name', d.get('dispensary_name', ''))
    website = d.get('website', '')
    if name and website:
        disp_urls[name.lower()] = website

# Generate Weedmaps search URL for a strain
def make_weedmaps_url(strain_name):
    pure = extract_pure_name(strain_name)
    slug = re.sub(r'[^a-zA-Z0-9\s]', '', pure).strip()
    slug = re.sub(r'\s+', '+', slug)
    return f"https://weedmaps.com/search?q={slug}&type=strain" if slug else ''

links_added = 0
for s in catalog:
    # Leafly URL (if not already set)
    if not s.get('leafly_url'):
        pure = extract_pure_name(s['name'])
        slug = make_leafly_slug(pure)
        if slug:
            s['leafly_url'] = f"https://www.leafly.com/strains/{slug}"
    
    # Weedmaps URL
    if not s.get('weedmaps_url'):
        s['weedmaps_url'] = make_weedmaps_url(s['name'])
    
    # Dispensary URLs (for each dispensary that carries this strain)
    if not s.get('dispensary_links'):
        s['dispensary_links'] = {}
    
    # From prices array
    for p in s.get('prices', []):
        disp_name = p.get('dispensary', '')
        if disp_name and disp_name.lower() in disp_urls:
            if disp_name not in s['dispensary_links']:
                s['dispensary_links'][disp_name] = disp_urls[disp_name.lower()]
    
    # From dispensaries list
    for disp_name in s.get('dispensaries', []):
        if disp_name and disp_name.lower() in disp_urls:
            if disp_name not in s['dispensary_links']:
                s['dispensary_links'][disp_name] = disp_urls[disp_name.lower()]
    
    links_added += 1

print(f"Links generated for {links_added} strains")

# Count link coverage
has_leafly = sum(1 for s in catalog if s.get('leafly_url'))
has_weedmaps = sum(1 for s in catalog if s.get('weedmaps_url'))
has_disp_links = sum(1 for s in catalog if s.get('dispensary_links'))
print(f"  Leafly URLs: {has_leafly} ({has_leafly/len(catalog)*100:.1f}%)")
print(f"  Weedmaps URLs: {has_weedmaps} ({has_weedmaps/len(catalog)*100:.1f}%)")
print(f"  Dispensary links: {has_disp_links} ({has_disp_links/len(catalog)*100:.1f}%)")

# ── STEP 4: Integrate new strains from scraping ──
print("\n" + "=" * 70)
print("STEP 4: INTEGRATING NEW STRAINS")
print("=" * 70)

existing_names = {s['name'].lower() for s in catalog}
existing_pure = {extract_pure_name(s['name']).lower() for s in catalog}

added = 0
skipped_dup = 0
next_id = len(catalog) + 1  # Simple sequential ID for new strains

for ns in new_strains:
    ns_name = ns.get('strain_name', ns.get('name', ''))
    if not ns_name:
        continue
    
    # Check for duplicates
    if ns_name.lower() in existing_names:
        skipped_dup += 1
        continue
    pure = extract_pure_name(ns_name)
    if pure.lower() in existing_pure:
        skipped_dup += 1
        continue
    
    # Build new strain entry
    new_entry = {
        'id': make_leafly_slug(ns_name) or f'new-strain-{next_id}',
        'name': ns_name,
        'brand': ns.get('brand', ''),
        'type': '',
        'thc': ns.get('thc', 0),
        'cbd': ns.get('cbd', 0),
        'terpenes': [],
        'effects': [],
        'flavors': [],
        'description': '',
        'genetics': '',
        'prices': [],
        'dispensaries': [ns.get('dispensary', '')] if ns.get('dispensary') else [],
        'dispensary_links': {},
        'grade': 'C',
        'source': 'dispensary_scrape',
    }
    
    # Try to enrich from Leafly
    match = find_leafly_match(ns_name)
    if match:
        ltype = match.get('strain_type', '').lower()
        if ltype in ('indica', 'sativa', 'hybrid'):
            new_entry['type'] = ltype.capitalize()
            new_entry['type_source'] = 'leafly'
        terps = parse_csv_field(match.get('terpenes', ''))
        if terps:
            new_entry['terpenes'] = terps
        effects = parse_csv_field(match.get('effects', ''))
        if effects:
            new_entry['effects'] = effects
        flavors = parse_csv_field(match.get('flavors', ''))
        if flavors:
            new_entry['flavors'] = flavors
        desc = match.get('description', '')
        if desc:
            new_entry['description'] = desc
        genetics = match.get('genetics', '')
        if genetics:
            new_entry['genetics'] = genetics
        leafly_url = match.get('leafly_url', '')
        if leafly_url:
            new_entry['leafly_url'] = leafly_url
        new_entry['grade'] = 'B' if new_entry['type'] else 'C'
    
    # If no type from Leafly, use name pattern
    if not new_entry['type']:
        pred_type, conf, method = predict_type_name(ns_name)
        new_entry['type'] = pred_type
        new_entry['type_confidence'] = round(conf, 3)
        new_entry['type_source'] = method
    
    # Add price if available
    price = ns.get('price')
    if price:
        try:
            price_val = float(str(price).replace('$', '').strip())
            if 5 <= price_val <= 200:
                new_entry['prices'] = [{
                    'dispensary': ns.get('dispensary', ''),
                    'price': price_val,
                    'source': 'scrape'
                }]
        except (ValueError, TypeError):
            pass
    
    # Generate links
    slug = make_leafly_slug(extract_pure_name(ns_name))
    if slug and not new_entry.get('leafly_url'):
        new_entry['leafly_url'] = f"https://www.leafly.com/strains/{slug}"
    new_entry['weedmaps_url'] = make_weedmaps_url(ns_name)
    
    disp = ns.get('dispensary', '')
    if disp and disp.lower() in disp_urls:
        new_entry['dispensary_links'][disp] = disp_urls[disp.lower()]
    
    catalog.append(new_entry)
    existing_names.add(ns_name.lower())
    existing_pure.add(pure.lower())
    next_id += 1
    added += 1

print(f"New strains added: {added}")
print(f"Duplicates skipped: {skipped_dup}")
print(f"Total catalog size: {len(catalog)}")

# ── STEP 5: Re-grade all strains ──
print("\n" + "=" * 70)
print("STEP 5: RE-GRADING STRAINS")
print("=" * 70)

for s in catalog:
    score = 0
    if s.get('type', '').lower() in ('indica', 'sativa', 'hybrid'):
        score += 2
    if s.get('thc') and s['thc'] > 0:
        score += 1
    if s.get('terpenes') and s['terpenes'] != ['Not_Found'] and len(s['terpenes']) > 0:
        score += 2
    if s.get('effects') and len(s['effects']) > 0:
        score += 1
    if s.get('description') and len(s['description']) > 20:
        score += 1
    if s.get('genetics') and len(s['genetics']) > 3:
        score += 1
    if s.get('prices') and len(s['prices']) > 0:
        score += 1
    if s.get('brand'):
        score += 1
    
    if score >= 7:
        s['grade'] = 'A'
    elif score >= 4:
        s['grade'] = 'B'
    else:
        s['grade'] = 'C'

grade_dist = Counter(s['grade'] for s in catalog)
print(f"Grade distribution:")
for g in ['A', 'B', 'C']:
    print(f"  {g}: {grade_dist[g]} ({grade_dist[g]/len(catalog)*100:.1f}%)")

# ── STEP 6: Final statistics ──
print("\n" + "=" * 70)
print("FINAL CATALOG STATISTICS")
print("=" * 70)

fields = ['type', 'thc', 'terpenes', 'effects', 'flavors', 'description', 'genetics', 'brand', 'prices', 'leafly_url', 'weedmaps_url']
for field in fields:
    if field == 'thc':
        count = sum(1 for s in catalog if s.get(field) and s[field] > 0)
    elif field in ('terpenes', 'effects', 'flavors', 'prices'):
        count = sum(1 for s in catalog if s.get(field) and len(s[field]) > 0 and s[field] != ['Not_Found'])
    elif field in ('leafly_url', 'weedmaps_url'):
        count = sum(1 for s in catalog if s.get(field) and s[field].startswith('http'))
    else:
        count = sum(1 for s in catalog if s.get(field) and len(str(s[field])) > 0)
    print(f"  {field:20s}: {count:5d} ({count/len(catalog)*100:.1f}%)")

# Type source breakdown
type_sources = Counter(s.get('type_source', 'original') for s in catalog if s.get('type'))
print(f"\nType source breakdown:")
for src, count in type_sources.most_common():
    print(f"  {src}: {count}")

# Save final catalog
with open('/home/ubuntu/strainscout_catalog_v3.json', 'w') as f:
    json.dump(catalog, f, indent=2)

# Save compact version for website
compact = []
for s in catalog:
    entry = {
        'id': s['id'],
        'name': s['name'],
        'brand': s.get('brand', ''),
        'type': s.get('type', 'Hybrid'),
        'thc': s.get('thc', 0),
        'cbd': s.get('cbd', 0),
        'terpenes': [t for t in s.get('terpenes', []) if t and t != 'Not_Found'],
        'effects': s.get('effects', []),
        'flavors': s.get('flavors', []),
        'description': s.get('description', ''),
        'genetics': s.get('genetics', ''),
        'grade': s.get('grade', 'C'),
        'prices': s.get('prices', []),
        'dispensaries': s.get('dispensaries', []),
        'leafly_url': s.get('leafly_url', ''),
        'weedmaps_url': s.get('weedmaps_url', ''),
        'dispensary_links': s.get('dispensary_links', {}),
    }
    compact.append(entry)

with open('/home/ubuntu/strainscout_catalog_v3.min.json', 'w') as f:
    json.dump(compact, f, separators=(',', ':'))

import os
full_size = os.path.getsize('/home/ubuntu/strainscout_catalog_v3.json')
min_size = os.path.getsize('/home/ubuntu/strainscout_catalog_v3.min.json')
print(f"\nFull catalog: {full_size/1024:.0f} KB")
print(f"Minified catalog: {min_size/1024:.0f} KB")
print(f"\n{'='*70}")
print("DONE - Catalog v3 saved")
print(f"{'='*70}")

```

---

## `dedup_catalog.py`

**Purpose:** Fuzzy-match deduplication to merge near-duplicate strain entries
**Lines:** 263

```python
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

```

---

## `build_catalog_v8.py`

**Purpose:** Added last_verified timestamps and version metadata to all entries
**Lines:** 91

```python
#!/usr/bin/env python3
"""
Data Engineer — Sprint 1
Build catalog v8: Add last_verified timestamps to every price entry.

Since all prices were scraped on March 9, 2026, all entries get that date.
The timestamp infrastructure is what matters — the automated refresh pipeline
(Sprint 5+) will populate diverse timestamps over time.
"""
import json
from datetime import datetime, timezone

CATALOG_V7 = "/home/ubuntu/strainscout_catalog_v7_ordering.json"
CATALOG_V8 = "/home/ubuntu/strainscout_catalog_v8.json"
CATALOG_V8_MIN = "/home/ubuntu/strainscout_catalog_v8.min.json"

# The scraping was done on March 9, 2026
SCRAPE_DATE = "2026-03-09T14:00:00Z"

with open(CATALOG_V7) as f:
    catalog = json.load(f)

print(f"Loaded {len(catalog)} strains from v7")

# Stats tracking
total_prices = 0
prices_with_ts = 0
strains_with_prices = 0
strains_without_prices = 0

for strain in catalog:
    # Add catalog-level last_verified (most recent price check across all dispensaries)
    strain["catalog_version"] = "v8"
    strain["catalog_updated"] = "2026-03-14T00:00:00Z"
    
    if strain.get("prices") and len(strain["prices"]) > 0:
        strains_with_prices += 1
        for price_entry in strain["prices"]:
            price_entry["last_verified"] = SCRAPE_DATE
            price_entry["verified_source"] = "initial_scrape"
            total_prices += 1
            prices_with_ts += 1
        
        # Set strain-level last_verified to the scrape date
        strain["last_verified"] = SCRAPE_DATE
        strain["verification_status"] = "scraped"
    else:
        strains_without_prices += 1
        # Strains without prices get no verification timestamp
        strain["last_verified"] = None
        strain["verification_status"] = "no_price_data"
        # Ensure prices is at least an empty list
        if "prices" not in strain:
            strain["prices"] = []

# Validation checks
print(f"\n=== Catalog v8 Validation ===")
print(f"Total strains: {len(catalog)}")
print(f"Strains with prices: {strains_with_prices}")
print(f"Strains without prices: {strains_without_prices}")
print(f"Total price entries: {total_prices}")
print(f"Price entries with last_verified: {prices_with_ts}")
print(f"Coverage: {prices_with_ts}/{total_prices} = {prices_with_ts/total_prices*100:.1f}%")

# Verify no future dates
future_count = 0
for strain in catalog:
    for p in strain.get("prices", []):
        ts = p.get("last_verified", "")
        if ts and ts > datetime.now(timezone.utc).isoformat():
            future_count += 1
print(f"Future-dated timestamps: {future_count} (should be 0)")

# Verify no data loss
v7_count = 2220  # known v7 count
assert len(catalog) == v7_count, f"Data loss! Expected {v7_count}, got {len(catalog)}"
print(f"Data integrity: PASS ({len(catalog)} strains preserved)")

# Write full and minified versions
with open(CATALOG_V8, "w") as f:
    json.dump(catalog, f, indent=2)

with open(CATALOG_V8_MIN, "w") as f:
    json.dump(catalog, f, separators=(",", ":"))

import os
full_size = os.path.getsize(CATALOG_V8) / 1024 / 1024
min_size = os.path.getsize(CATALOG_V8_MIN) / 1024 / 1024
print(f"\nCatalog v8 written:")
print(f"  Full: {CATALOG_V8} ({full_size:.2f} MB)")
print(f"  Min:  {CATALOG_V8_MIN} ({min_size:.2f} MB)")

```

