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
