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
