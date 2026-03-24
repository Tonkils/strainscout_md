"""
Category classifier accuracy test — before vs after fix.
Run: python publish/test_classify.py
"""
import json, re, collections, sys

with open('strainscout_md/web_2/public/data/strainscout_catalog_v10.min.json', encoding='utf-8') as f:
    strains = json.load(f)

# ── Ground truth: 63 curated test cases ──────────────────────────────────────
GROUND_TRUTH = [
    # Flower strains (must NOT be classified as Edible/Topical/etc.)
    ("White Truffle",                                    "Flower"),
    ("Forum Cut Cookies",                                "Flower"),
    ("Animal Mint Cookies",                              "Flower"),
    ("Brownie Scout",                                    "Flower"),
    ("Ice Cream Cake",                                   "Flower"),
    ("Sour Cream",                                       "Flower"),
    ("Boston Cream",                                     "Flower"),
    ("Neapolitan Space Cream",                           "Flower"),
    ("Jelly Breath",                                     "Flower"),
    ("Jelly Donuts x GMO",                               "Flower"),
    ("Candy Panties",                                    "Flower"),
    ("Candy Fumez",                                      "Flower"),
    ("Strawberry Candy #4",                              "Flower"),
    ("Purple Cookies",                                   "Flower"),
    ("Pomme Jelly Small",                                "Flower"),
    ("Pomme Jelly Whole",                                "Flower"),
    ("Indica Dominant Premium Flower Brownie Scout",     "Flower"),
    ("Triple Stack Whole",                               "Flower"),
    ("Huckleberry Soda #5",                              "Flower"),
    ("LA Chocolate",                                     "Flower"),
    ("Sherbsicle Cookies",                               "Flower"),
    ("Cabernet Cookies",                                 "Flower"),
    ("Jet Cookie",                                       "Flower"),
    # Pre-Rolls
    ("Happy J's Funky Guava PRJ (2ct)",                  "Pre-Roll"),
    ("Eden Cherry Marshmallow Infused Joint 1pk",        "Pre-Roll"),
    ("2pk Pre-Rolls",                                    "Pre-Roll"),
    ("Dogwalkers Show Dog Sherbanger #22 Infused Joint 1pk", "Pre-Roll"),
    ("INFUSED Chocolatina (2pk)",                        "Pre-Roll"),
    ("INFUSED Double Krush (1pk)",                       "Pre-Roll"),
    ("Remix INFUSED Blue Dream (1pk)",                   "Pre-Roll"),
    ("Colors Sour Peach x Ripped Off Runtz Infused Joints 2pk", "Pre-Roll"),
    ("Happy-er J's INFUSED Sunset Octane X House Blends (2pk)", "Pre-Roll"),
    ("Moonbeam Gelato Shorties (2pk)",                   "Pre-Roll"),
    ("Triple Stack Shorties (2pk)",                      "Pre-Roll"),
    ("Happy J's Huckleberry Soda 5 (2pk)",               "Pre-Roll"),
    ("Happy-er J's INFUSED LCG X Ice Cream Cake (2pk)", "Pre-Roll"),
    ("Happy-er J's Funky Guava x House Blends Infused", "Pre-Roll"),
    ("Happy J's Midnight Circus (2pk)",                  "Pre-Roll"),
    # Vapes
    ("Apple Bomb Live Resin Cart",                       "Vape"),
    ("Champagne Supernova Distillate Cartridge",         "Vape"),
    ("Select BRIQ Essentials AIO Disposable Strawberry Shortcake", "Vape"),
    ("Bomb Popz Cloud Bar",                              "Vape"),
    ("Blueberry Dream Cloud Bar",                        "Vape"),
    ("Sunnies London Pound Cake Disposable Pen",         "Vape"),
    # Concentrates
    ("Orange Drizzle Live Resin Cake Badder",            "Concentrate"),
    ("Starkiller RSO",                                   "Concentrate"),
    ("Sunnies 1g THCA Isolate",                          "Concentrate"),
    ("Sunnies THCA Isolate",                             "Concentrate"),
    ("THCa Isolate",                                     "Concentrate"),
    ("1g Heirloom BHO Cured Sugar",                      "Concentrate"),
    ("Heirloom BHO Cured Sugar",                         "Concentrate"),
    ("Sunnies 1g Cherry Chem Pie Live Resin Batter",     "Concentrate"),
    # These are Live Resin edibles — should NOT be Concentrate
    ("Sunnies Live Resin Gummies: Cherry Pie OG I Black Cherry", "Edible"),
    ("Oria 10mg Peach Mango Live Resin Gummies (2pk)",   "Edible"),
    # Edibles
    ("10mg Black Cherry Vanilla Chews",                  "Edible"),
    ("ALLCAPS 10mg FECO Capsules (10pk",                 "Edible"),
    ("10mg Wild Cherriezzz Discos 5:1:1 CBD:THC:CBN",   "Edible"),
    ("Sunnies 10mg Fruit Burst Quick Kicks",             "Edible"),
    ("Sunnies Socials 10mg Mango Sparkling Water",       "Edible"),
    ("Dark Chocolate Espresso Truffles",                 "Edible"),
    ("Keef Classic Soda Orange Kush",                    "Edible"),
    # Topical
    ("CBD Topical Lotion",                               "Topical"),
    # Other
    ("10 Pack",                                          "Other"),
    ("5 Pack",                                           "Other"),
    ("Shop Best Cannabis Strains",                       "Other"),
]

def make_classifier(version):
    if version == 'BEFORE':
        def classify(name):
            n = name.lower().strip()
            if re.search(r't-shirt|shirt\b|tee\b|^shop\s|^browse\s|% off|% back', n): return 'Other'
            if re.fullmatch(r'[\d\s]*(pack|ct)[\d\s]*', n): return 'Other'
            if re.search(r'\bprj\b|pre[-\s]?roll|preroll|\bjoint\b|\bblunt\b|mini\s+dogs?\b|show\s+dog\b|\bdogwalkers?\b|swift\s+lifts?\b|infused\s+\d+\s*[-]?\s*pack', n): return 'Pre-Roll'
            if re.search(r'\binfused\b', n) and re.search(r'pack\b|\d+\s*pack', n): return 'Pre-Roll'
            if re.search(r'\bcart\b|cartridge|vaporizer|510|disposable|\blr\s+pod\b|live\s+resin\s+cart|\bvape\b|\bpod\b|airopod', n): return 'Vape'
            if re.search(r'\bairo\b', n): return 'Vape'
            if re.search(r'\bwax\b|\bdab\b|shatter|budder|badder|batter|\brosin\b|live\s+resin\b|distillate|concentrate|extract|\bhash\b|kief\b|crumble|diamonds?\b|\bsauce\b|\brso\b|\bfeco\b|\boil\b|tincture|live\s+sugar|full[-\s]spec|full\s+extract|\bfso\b', n): return 'Concentrate'
            if re.search(r'gummy|gummies|chocolate|brownie|cookie|\bcandy\b|lozenge|\bcaramel\b|\bmochi\b|macaroon|truffle', n): return 'Edible'
            if re.search(r'chews?\b|jellies?\b|\bjelly\b|\bdiscos\b|\belixir\b|quick\s*kicks?\b|sparkling\s+water|\bsoda\b|\bbeverage\b|\bdrink\b|\bcapsule|\btablet\b|syrup|baked\s+bites', n): return 'Edible'
            if re.search(r'\d+mg\b', n): return 'Edible'
            if re.search(r'\bwana\b|\bsmokiez\b|\bsunnies\b|\bdixie\b', n): return 'Edible'
            if re.search(r'infused\s+(honey|butter|oil)', n): return 'Edible'
            if re.search(r'\d+\s*:\s*\d+', n): return 'Edible'
            if re.search(r'\b(cbg|cbn|cbd)\b', n): return 'Edible'
            if re.search(r'topical|lotion|balm|\bpatch\b|salve|moisturizer', n): return 'Topical'
            if re.search(r'cream\b|\bgel\b|\bspray\b', n): return 'Topical'
            return 'Flower'
    else:  # AFTER
        def classify(name):
            n = name.lower().strip()
            if re.search(r't-shirt|shirt\b|tee\b|^shop\s|^browse\s|% off|% back', n): return 'Other'
            if re.fullmatch(r'[\d\s]*(pack|ct)[\d\s]*', n): return 'Other'
            if re.search(r'\bprj\b|pre[-\s]?roll|preroll|\bjoints?\b|\bblunt\b|mini\s+dogs?\b|show\s+dog\b|\bdogwalkers?\b|swift\s+lifts?\b|infused\s+\d+\s*[-]?\s*(?:pack|pk)\b|\bhappy(?:-er)?\s+j[\u2019\']?s?\b|\bshorties?\b', n): return 'Pre-Roll'
            if re.search(r'\binfused\b', n) and re.search(r'(?:pack|pk)\b|\d+\s*(?:pack|pk)\b', n): return 'Pre-Roll'
            if re.search(r'\bcart\b|cartridge|vaporizer|510|disposable|\blr\s+pod\b|live\s+resin\s+cart|\bvape\b|\bpod\b|airopod|cloud\s+bar\b', n): return 'Vape'
            if re.search(r'\bairo\b', n): return 'Vape'
            if re.search(r'gummy|gummies', n): return 'Edible'  # early: beats live_resin
            if re.search(r'\bwax\b|\bdab\b|shatter|budder|badder|batter|\brosin\b|live\s+resin\b|distillate|concentrate|extract|\bhash\b|kief\b|crumble|diamonds?\b|\bsauce\b|\brso\b|\bfeco\b|\boil\b|tincture|live\s+sugar|cured\s+sugar|full[-\s]spec|full\s+extract|\bfso\b|\bisolate\b|\bthca\b|\bbho\b|\bpho\b', n): return 'Concentrate'
            if re.search(r'chocolate|lozenge|\bcaramel\b|\bmochi\b|macaroon', n): return 'Edible'
            if re.search(r'chews?\b|jellies?\b|\bdiscos\b|\belixir\b|quick\s*kicks?\b|sparkling\s+water|\bsoda\b|\bbeverage\b|\bdrink\b|\bcapsule|\btablet\b|syrup|baked\s+bites', n): return 'Edible'
            if re.search(r'\d+mg\b', n): return 'Edible'
            if re.search(r'\bwana\b|\bsmokiez\b|\bdixie\b|\bkeef\b', n): return 'Edible'
            if re.search(r'infused\s+(honey|butter|oil)', n): return 'Edible'
            if re.search(r'\d+\s*:\s*\d+', n): return 'Edible'
            if re.search(r'\b(cbg|cbn|cbd)\b', n): return 'Edible'
            if re.search(r'topical|lotion|balm|\bpatch\b|salve|moisturizer', n): return 'Topical'
            if re.search(r'\bgel\b|\bspray\b', n): return 'Topical'
            return 'Flower'
    return classify

before_fn = make_classifier('BEFORE')
after_fn  = make_classifier('AFTER')

# ── Ground truth accuracy ─────────────────────────────────────────────────────
print("=== GROUND TRUTH ACCURACY (63 curated items) ===")
before_pass = after_pass = fixed = newly_broken = 0
for name, expected in GROUND_TRUTH:
    b = before_fn(name)
    a = after_fn(name)
    b_ok = b == expected
    a_ok = a == expected
    before_pass += b_ok
    after_pass  += a_ok
    if not b_ok and a_ok:
        fixed += 1
        print(f"  FIXED  {repr(name)}")
        print(f"         {b} -> {a}  (expected {expected})")
    elif b_ok and not a_ok:
        newly_broken += 1
        print(f"  BROKE  {repr(name)}")
        print(f"         {b} -> {a}  (expected {expected})")

total = len(GROUND_TRUTH)
print(f"\nBEFORE: {before_pass}/{total} ({100*before_pass//total}%)")
print(f"AFTER:  {after_pass}/{total} ({100*after_pass//total}%)")
print(f"Fixed: +{fixed}  |  Newly broken: {newly_broken}")

# ── Full catalog distribution ─────────────────────────────────────────────────
print("\n=== FULL CATALOG (1297 items) ===")
print(f"  {'Category':<12} {'BEFORE':>8} {'AFTER':>8} {'DELTA':>8}")
b_dist = collections.Counter(before_fn(s['name']) for s in strains)
a_dist = collections.Counter(after_fn(s['name']) for s in strains)
for cat in ['Flower','Pre-Roll','Vape','Concentrate','Edible','Topical','Other']:
    b = b_dist[cat]; a = a_dist[cat]; d = a - b
    sign = '+' if d > 0 else ''
    print(f"  {cat:<12} {b:>8} {a:>8}   {sign}{d}")

# ── Remaining issues ──────────────────────────────────────────────────────────
print("\n=== REMAINING MEDIUM-CONFIDENCE ITEMS (after fix) ===")
def classify_detail(name):
    n = name.lower().strip()
    if re.search(r't-shirt|shirt\b|tee\b|^shop\s|^browse\s|% off|% back', n): return ('Other', 'HIGH')
    if re.fullmatch(r'[\d\s]*(pack|ct)[\d\s]*', n): return ('Other', 'MEDIUM')
    if re.search(r'\bprj\b|pre[-\s]?roll|preroll|\bjoints?\b|\bblunt\b|mini\s+dogs?\b|show\s+dog\b|\bdogwalkers?\b|swift\s+lifts?\b|infused\s+\d+\s*[-]?\s*(?:pack|pk)\b|\bhappy(?:-er)?\s+j[\u2019\']?s?\b|\bshorties?\b', n): return ('Pre-Roll', 'HIGH')
    if re.search(r'\binfused\b', n) and re.search(r'(?:pack|pk)\b|\d+\s*(?:pack|pk)\b', n): return ('Pre-Roll', 'MEDIUM')
    if re.search(r'\bcart\b|cartridge|vaporizer|510|disposable|\blr\s+pod\b|live\s+resin\s+cart|\bvape\b|\bpod\b|airopod|cloud\s+bar\b', n): return ('Vape', 'HIGH')
    if re.search(r'\bairo\b', n): return ('Vape', 'MEDIUM')
    if re.search(r'gummy|gummies', n): return ('Edible', 'HIGH')
    if re.search(r'\bwax\b|\bdab\b|shatter|budder|badder|batter|\brosin\b|live\s+resin\b|distillate|concentrate|extract|\bhash\b|kief\b|crumble|diamonds?\b|\bsauce\b|\brso\b|\bfeco\b|\boil\b|tincture|live\s+sugar|cured\s+sugar|full[-\s]spec|full\s+extract|\bfso\b|\bisolate\b|\bthca\b|\bbho\b|\bpho\b', n): return ('Concentrate', 'HIGH')
    if re.search(r'chocolate|lozenge|\bcaramel\b|\bmochi\b|macaroon', n): return ('Edible', 'HIGH')
    if re.search(r'chews?\b|jellies?\b|\bdiscos\b|\belixir\b|quick\s*kicks?\b|sparkling\s+water|\bsoda\b|\bbeverage\b|\bdrink\b|\bcapsule|\btablet\b|syrup|baked\s+bites', n): return ('Edible', 'HIGH')
    if re.search(r'\d+mg\b', n): return ('Edible', 'HIGH')
    if re.search(r'\bwana\b|\bsmokiez\b|\bdixie\b|\bkeef\b', n): return ('Edible', 'HIGH')
    if re.search(r'infused\s+(honey|butter|oil)', n): return ('Edible', 'HIGH')
    if re.search(r'\d+\s*:\s*\d+', n): return ('Edible', 'HIGH')
    if re.search(r'\b(cbg|cbn|cbd)\b', n): return ('Edible', 'MEDIUM')
    if re.search(r'topical|lotion|balm|\bpatch\b|salve|moisturizer', n): return ('Topical', 'HIGH')
    if re.search(r'\bgel\b|\bspray\b', n): return ('Topical', 'MEDIUM')
    return ('Flower', 'HIGH')

for s in strains:
    cat, conf = classify_detail(s['name'])
    if conf == 'MEDIUM':
        print(f"  [{cat}]  {s['name']}")
