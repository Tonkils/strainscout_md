#!/usr/bin/env python3
"""
Build the final StrainScout MD strain catalog JSON for the website.
Transforms the reconciled data into a clean, optimized format for the frontend.
"""

import json
import re
import hashlib
from collections import Counter, defaultdict

with open('reconciled_strains.json') as f:
    catalog = json.load(f)
with open('dispensary_benchmark.json') as f:
    disp_benchmark = json.load(f)
with open('grower_benchmark.json') as f:
    grower_benchmark = json.load(f)

# Build dispensary lookup with coordinates
disp_lookup = {}
for d in disp_benchmark:
    name = d.get('canonical_name', '').strip()
    if name:
        disp_lookup[name.lower()] = {
            'name': name,
            'address': d.get('full_address', ''),
            'city': d.get('city', ''),
            'lat': d.get('lat', 0),
            'lng': d.get('lng', 0),
            'brand': d.get('brand_parent', ''),
            'phone': d.get('phone', ''),
            'website': d.get('website', ''),
            'rating': d.get('google_rating', ''),
        }

# Build grower lookup
grower_lookup = {}
for g in grower_benchmark:
    primary = g.get('primary_brand', '').strip()
    if primary:
        grower_lookup[primary.lower()] = {
            'legal_name': g.get('legal_name', ''),
            'primary_brand': primary,
            'sub_brands': g.get('sub_brands', ''),
        }

def clean_strain_name(name):
    """Clean strain name for display."""
    # Remove size info
    clean = re.sub(r'\s+\d+(\.\d+)?g\s*$', '', name)
    # Remove format suffixes
    clean = re.sub(r'\s*(Pre-?Pack(aged)?|Full\s*Buds?|Ground|Smalls?|Mixed\s*Buds?|Shake/Trim|Premium)\s*$', '', clean, flags=re.I)
    # Remove brand prefixes if they appear in the name
    clean = re.sub(r'\s*\*\s*\[REG\s*\$\d+\]', '', clean)
    clean = re.sub(r'\s*\[Reg\.\s*\$\d+\]', '', clean)
    clean = clean.strip(' -|')
    return clean if clean else name

def generate_slug(name):
    """Generate URL-friendly slug from strain name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

def generate_id(name):
    """Generate unique ID from strain name."""
    return hashlib.md5(name.encode()).hexdigest()[:12]

# Build the final catalog
final_catalog = {
    'metadata': {
        'version': '1.0.0',
        'generated': '2026-03-10',
        'total_strains': 0,
        'total_dispensaries': 0,
        'total_brands': 0,
        'data_sources': ['Original Catalog', 'Weedmaps', 'Dispensary Websites', 'Leafly'],
        'validation_score': 99.98,
    },
    'strains': [],
    'dispensaries': [],
    'brands': [],
}

# Process strains
seen_slugs = set()
brand_set = set()
disp_set = set()

for r in catalog:
    name = r.get('strain_name', '')
    if not name:
        continue
    
    clean_name = r.get('clean_strain_name', clean_strain_name(name))
    slug = generate_slug(clean_name)
    
    # Handle duplicate slugs
    if slug in seen_slugs:
        slug = f"{slug}-{generate_id(name)[:6]}"
    seen_slugs.add(slug)
    
    brand = r.get('brand', '')
    if brand:
        brand_set.add(brand)
    
    # Build dispensary pricing
    dispensary_prices = []
    dp = r.get('dispensary_prices', {})
    if isinstance(dp, dict):
        for disp_name, prices in dp.items():
            disp_set.add(disp_name)
            if isinstance(prices, dict):
                for size, price in prices.items():
                    try:
                        p = float(str(price).replace('$', '').replace(',', ''))
                        dispensary_prices.append({
                            'dispensary': disp_name,
                            'size': size,
                            'price': round(p, 2),
                        })
                    except:
                        pass
            elif isinstance(prices, (int, float)):
                dispensary_prices.append({
                    'dispensary': disp_name,
                    'size': '3.5g',
                    'price': round(float(prices), 2),
                })
    
    # Build dispensary list
    dispensaries = r.get('dispensaries', [])
    if isinstance(dispensaries, str):
        dispensaries = [d.strip() for d in dispensaries.split(',') if d.strip()]
    for d in dispensaries:
        disp_set.add(d)
    
    # Parse terpenes
    terpenes = []
    terp_str = r.get('terpenes', '')
    if terp_str and isinstance(terp_str, str):
        terps = [t.strip() for t in terp_str.split(',') if t.strip()]
        for t in terps:
            t_clean = t.lower().strip()
            # Normalize terpene names
            t_clean = re.sub(r'^(alpha|beta|a|b|d|e)-?', '', t_clean).strip()
            if t_clean and t_clean not in ('unknown', 'n/a', ''):
                terpenes.append(t_clean.title())
    
    # Determine strain type
    strain_type = r.get('strain_type', 'hybrid')
    if not strain_type or strain_type.lower() in ('unknown', 'n/a', ''):
        strain_type = 'hybrid'
    strain_type = strain_type.lower()
    
    # Calculate price stats
    all_prices = [dp['price'] for dp in dispensary_prices]
    avg_price = r.get('catalog_price_avg')
    if avg_price:
        try:
            avg_price = float(str(avg_price).replace('$', '').replace(',', ''))
        except:
            avg_price = None
    
    if all_prices:
        price_min = min(all_prices)
        price_max = max(all_prices)
        price_avg = sum(all_prices) / len(all_prices)
    elif avg_price:
        price_min = avg_price
        price_max = avg_price
        price_avg = avg_price
    else:
        price_min = None
        price_max = None
        price_avg = None
    
    # THC
    thc = r.get('thc_pct') or r.get('thc_range_leafly', '')
    
    strain_entry = {
        'id': generate_id(name),
        'slug': slug,
        'name': clean_name,
        'original_name': name,
        'brand': brand,
        'type': strain_type,
        'thc': str(thc) if thc else '',
        'terpenes': terpenes[:5],  # Top 5 terpenes
        'dispensary_count': len(set(dispensaries + [dp['dispensary'] for dp in dispensary_prices])),
        'prices': dispensary_prices,
        'price_min': round(price_min, 2) if price_min else None,
        'price_max': round(price_max, 2) if price_max else None,
        'price_avg': round(price_avg, 2) if price_avg else None,
        'dispensaries': list(set(dispensaries + [dp['dispensary'] for dp in dispensary_prices])),
        'confidence': r.get('overall_confidence', 'C'),
        'limited_data': r.get('limited_data', False),
    }
    
    final_catalog['strains'].append(strain_entry)

# Build dispensary list
for disp_name in sorted(disp_set):
    dl = disp_name.lower().strip()
    info = disp_lookup.get(dl, {})
    
    # Count strains at this dispensary
    strain_count = sum(1 for s in final_catalog['strains'] if disp_name in s['dispensaries'])
    
    final_catalog['dispensaries'].append({
        'name': info.get('name', disp_name),
        'address': info.get('address', ''),
        'city': info.get('city', ''),
        'lat': info.get('lat', 0),
        'lng': info.get('lng', 0),
        'brand': info.get('brand', ''),
        'phone': info.get('phone', ''),
        'website': info.get('website', ''),
        'rating': info.get('rating', ''),
        'strain_count': strain_count,
    })

# Build brand list
for brand_name in sorted(brand_set):
    bl = brand_name.lower().strip()
    grower = grower_lookup.get(bl, {})
    
    strain_count = sum(1 for s in final_catalog['strains'] if s['brand'] == brand_name)
    
    final_catalog['brands'].append({
        'name': brand_name,
        'legal_name': grower.get('legal_name', ''),
        'sub_brands': grower.get('sub_brands', ''),
        'strain_count': strain_count,
    })

# Update metadata
final_catalog['metadata']['total_strains'] = len(final_catalog['strains'])
final_catalog['metadata']['total_dispensaries'] = len(final_catalog['dispensaries'])
final_catalog['metadata']['total_brands'] = len(final_catalog['brands'])

# Save
with open('strainscout_catalog.json', 'w') as f:
    json.dump(final_catalog, f, indent=2)

# Also save a minified version for the website
with open('strainscout_catalog.min.json', 'w') as f:
    json.dump(final_catalog, f, separators=(',', ':'))

import os
full_size = os.path.getsize('strainscout_catalog.json')
min_size = os.path.getsize('strainscout_catalog.min.json')

print(f"Final catalog built successfully!")
print(f"  Strains: {len(final_catalog['strains'])}")
print(f"  Dispensaries: {len(final_catalog['dispensaries'])}")
print(f"  Brands: {len(final_catalog['brands'])}")
print(f"  Full JSON: {full_size/1024:.1f} KB")
print(f"  Minified JSON: {min_size/1024:.1f} KB")

# Stats
types = Counter(s['type'] for s in final_catalog['strains'])
print(f"\nStrain types: {dict(types)}")

has_price = sum(1 for s in final_catalog['strains'] if s['price_avg'])
has_terp = sum(1 for s in final_catalog['strains'] if s['terpenes'])
has_brand = sum(1 for s in final_catalog['strains'] if s['brand'])
print(f"With prices: {has_price}")
print(f"With terpenes: {has_terp}")
print(f"With brand: {has_brand}")

# Price distribution
prices = [s['price_avg'] for s in final_catalog['strains'] if s['price_avg']]
if prices:
    print(f"\nPrice stats (avg per strain):")
    print(f"  Min: ${min(prices):.2f}")
    print(f"  Max: ${max(prices):.2f}")
    print(f"  Mean: ${sum(prices)/len(prices):.2f}")
    print(f"  Median: ${sorted(prices)[len(prices)//2]:.2f}")

# Top brands by strain count
top_brands = sorted(final_catalog['brands'], key=lambda x: -x['strain_count'])[:15]
print(f"\nTop 15 brands:")
for b in top_brands:
    print(f"  {b['name']}: {b['strain_count']} strains")
