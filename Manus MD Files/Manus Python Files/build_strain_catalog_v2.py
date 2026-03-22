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
