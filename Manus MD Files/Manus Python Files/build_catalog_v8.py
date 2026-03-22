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
