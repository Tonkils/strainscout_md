# Data Accuracy Verification

Run the StrainScout data accuracy verification suite and report findings.

## When to Run
- After every pipeline build (post `build_catalog` step)
- As part of the orchestrator's daily quality check
- When investigating data quality issues

## Steps

1. **Run the verification report:**
   ```bash
   python -m tests.verify_data --json
   ```

2. **Parse the JSON output** and check the `overall_grade`:
   - **Grade A** (≥90%): Data quality is excellent. No action needed.
   - **Grade B** (≥70%): Data quality is acceptable. Review action_items for improvements.
   - **Grade C** (≥50%): Data quality needs attention. Address action_items before publishing.
   - **Grade F** (<50%): Data quality is poor. Do NOT publish. Investigate immediately.

3. **Check critical sections:**
   - `category_accuracy`: If miscategorized_count > 0, products are in the wrong category. The `details` array lists each one with `name`, `current` category, and `suggested` category.
   - `field_completeness`: If brand_coverage < 90% or price_coverage < 75%, flag for investigation.
   - `data_freshness`: If data is > 7 days old, the scraping pipeline needs to run.

4. **Address action items** in priority order:
   - Items starting with "FIX:" are high priority — data errors visible to users
   - Items starting with "REFRESH:" mean the pipeline needs to run
   - Items starting with "IMPROVE:" are lower priority enrichment opportunities

5. **Run the unittest suite** for detailed diagnostics:
   ```bash
   python -m unittest discover tests/ -v -k "test_data_accuracy or test_product_cards or test_dispensary_links"
   ```

6. **Save the report** for trend tracking:
   ```bash
   python -m tests.verify_data --json --out data/output/accuracy_report_$(date +%Y-%m-%d).json
   ```

## Product Card Requirements

Each product category should display specific fields on its card:

| Category | Required Fields | Desired (parsed from name) |
|----------|----------------|---------------------------|
| Flower | name, brand, price, dispensaries, THC%, CBD%, terpenes, date scraped | strain, weight |
| Edible | name, brand, price, dispensaries, THC% (mg/serving), CBD%, terpenes, date scraped | quantity, type (Gummy/Liquid) |
| Concentrate | name, brand, price, dispensaries, THC%, CBD%, terpenes, date scraped | strain, amount, type (badder/wax/RSO) |
| Vape | name, brand, price, dispensaries, THC%, CBD%, terpenes, date scraped | weight |
| Pre-Roll | name, brand, price, dispensaries, THC%, CBD%, terpenes, date scraped | strain, quantity, type (pack/single) |

## Key Files
- `tests/verify_data.py` — JSON report generator
- `tests/test_data_accuracy.py` — Core accuracy tests (category, freshness, names, completeness)
- `tests/test_product_cards.py` — Category-specific card field validation
- `tests/test_dispensary_links.py` — Dispensary link verification
- `tests/conftest.py` — Shared fixtures, parsers, ground truth data
