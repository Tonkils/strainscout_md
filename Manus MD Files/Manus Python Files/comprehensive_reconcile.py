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
