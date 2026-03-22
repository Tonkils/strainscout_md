# Cannabis Strain Data Quality Grading Rubric

## Purpose

This rubric grades the completeness and reliability of each strain entry in the Maryland cannabis catalog. Every strain receives a letter grade (A through F) based on how many data fields are present and how trustworthy the sources are. This allows the web app to communicate data confidence to users and helps prioritize which strains need further enrichment.

---

## Grading Fields (20 Points Maximum)

Each field contributes points when present and validated:

| Field | Points | Description |
| :--- | :--- | :--- |
| **Strain Name** | 1 | Name of the strain (required for entry to exist) |
| **Grower/Brand** | 2 | Which Maryland cultivator or brand produces it |
| **Product Type** | 1 | Flower, concentrate, edible, vape, pre-roll, etc. |
| **THC %** | 2 | Total THC percentage (or range) |
| **CBD %** | 1 | Total CBD percentage (or range) |
| **Terpene Profile** | 2 | At least 2 dominant terpenes identified |
| **Indica/Sativa/Hybrid** | 1 | Classification type |
| **Genetic Lineage** | 2 | Parent strains identified (e.g., "OG Kush x Durban Poison") |
| **Effect Profile** | 2 | At least 3 user-reported effects (e.g., relaxed, euphoric, creative) |
| **Price** | 1 | At least one price point from a Maryland dispensary |
| **Dispensary Availability** | 2 | At least one Maryland dispensary confirmed carrying it |
| **Flavor/Aroma** | 1 | At least 2 flavor/aroma descriptors |
| **Medical Uses** | 1 | At least 1 medical use case reported |
| **Source Reliability** | 1 | Data comes from dispensary menu, lab test, or Leafly (not just user-generated) |

---

## Letter Grade Scale

| Grade | Points | Label | Meaning |
| :--- | :--- | :--- | :--- |
| **A** | 17-20 | Excellent | Comprehensive data — ready for app display with high confidence |
| **B** | 13-16 | Good | Strong data with minor gaps — suitable for app display |
| **C** | 9-12 | Fair | Core data present but missing enrichment — usable with caveats |
| **D** | 5-8 | Poor | Minimal data — strain name + 1-2 fields only; needs enrichment |
| **F** | 0-4 | Insufficient | Strain name only or unverified — not ready for app display |

---

## Source Reliability Tiers

Data sources are ranked by trustworthiness:

| Tier | Source Type | Reliability |
| :--- | :--- | :--- |
| **Tier 1** | Dispensary menu (Dutchie, iHeartJane, Weedmaps) | Highest — real-time inventory with lab-tested THC% |
| **Tier 2** | Leafly strain database | High — crowdsourced but large sample sizes for effects/genetics |
| **Tier 3** | Grower/brand website | High — authoritative for genetics and product info |
| **Tier 4** | Allbud, Wikileaf, Seedfinder | Medium — community-contributed, may have errors |
| **Tier 5** | Social media / user reviews | Low — anecdotal, unverified |

---

## Mood Matching Readiness

For the web app's mood-matching feature, a strain must have at minimum:
- Effect profile (at least 3 effects) — **required**
- Indica/Sativa/Hybrid classification — **required**
- At least 1 Maryland dispensary availability — **required**
- Price — **strongly preferred**

Strains that meet all four criteria are flagged as **"Mood Match Ready"**. Strains missing any of the first three are flagged as **"Not Mood Matchable"** until enriched.

---

## Quality Improvement Priorities

When enriching the catalog, prioritize in this order:
1. Strains with Grade D or F that are currently sold at multiple Maryland dispensaries (high demand, low data)
2. Strains missing effect profiles (blocks mood matching)
3. Strains missing genetic lineage (blocks "similar strains" recommendations)
4. Strains missing terpene data (blocks advanced flavor/effect matching)
