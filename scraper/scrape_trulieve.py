"""
scraper/scrape_trulieve.py

Scraper for Trulieve Maryland dispensaries.
Trulieve uses a proprietary Next.js + GraphQL stack with SSR.
Product data is embedded in __NEXT_DATA__ on the page.

Strategy: Fetch the category/flower page with storeId param and extract
__NEXT_DATA__ JSON from the HTML. No browser needed for basic extraction,
but we use Playwright to handle potential age gates and JS rendering.

Trulieve MD locations and their storeId codes:
  Rockville       → MDROKB2
  Halethorpe      → store code 342 / halethorpe
  Lutherville     → store code 344 / lutherville_timonium_md

Run:
    python -m scraper.scrape_trulieve
    python -m scraper.scrape_trulieve --test

Output:  data/raw/trulieve_<slug>.json
         data/raw/trulieve_run_<timestamp>.json
"""

import asyncio
import json
import re
import sys
import time
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright, Page

# ── Paths ────────────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent.parent
RAW_DIR = BASE / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR = BASE / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# ── Logging ──────────────────────────────────────────────────────────────────
_fmt = logging.Formatter("%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%H:%M:%S")
_sh = logging.StreamHandler(sys.stdout)
_sh.setFormatter(_fmt)
if hasattr(_sh.stream, "reconfigure"):
    try: _sh.stream.reconfigure(encoding="utf-8")
    except Exception: pass
_fh = logging.FileHandler(LOG_DIR / "scrape_trulieve.log", encoding="utf-8")
_fh.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_sh, _fh])
log = logging.getLogger(__name__)

# ── Trulieve MD locations ────────────────────────────────────────────────────
TRULIEVE_LOCATIONS = [
    {
        "name": "Trulieve - Rockville",
        "slug": "trulieve-rockville",
        "store_id": "MDROKB2",
        "url": "https://www.trulieve.com/category/flower?storeId=MDROKB2",
    },
    {
        "name": "Trulieve - Halethorpe",
        "slug": "trulieve-halethorpe",
        "store_id": "MDHALT1",
        "url": "https://www.trulieve.com/category/flower?storeId=MDHALT1",
    },
    {
        "name": "Trulieve - Lutherville",
        "slug": "trulieve-lutherville",
        "store_id": "MDLUTH1",
        "url": "https://www.trulieve.com/category/flower?storeId=MDLUTH1",
    },
]

# Alternative store IDs to try if the first doesn't work
ALT_STORE_IDS = {
    "trulieve-halethorpe": ["MDHALT1", "MDHAL1", "342"],
    "trulieve-lutherville": ["MDLUTH1", "MDLUT1", "344"],
}

AGE_GATE_DOB = {"month": "05", "day": "27", "year": "1997"}
PAGE_TIMEOUT = 60_000


# ── Age gate ─────────────────────────────────────────────────────────────────

async def handle_age_gate(page: Page) -> bool:
    # Button-style
    for text in ["I'm 21 or older", "I am 21+", "Enter", "Yes", "I'm 21", "Verify", "I am at least 21"]:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click(timeout=3_000)
                await page.wait_for_timeout(1_000)
                return True
        except Exception:
            pass

    # DOB form
    try:
        month_input = page.locator('input[placeholder="MM"], input[name="month"]')
        if await month_input.count() > 0:
            await month_input.first.fill(AGE_GATE_DOB["month"])
            await page.locator('input[placeholder="DD"], input[name="day"]').first.fill(AGE_GATE_DOB["day"])
            await page.locator('input[placeholder="YYYY"], input[name="year"]').first.fill(AGE_GATE_DOB["year"])
            submit = page.locator('button[type="submit"]')
            if await submit.count() > 0:
                await submit.first.click(timeout=3_000)
                await page.wait_for_timeout(1_000)
                return True
    except Exception:
        pass
    return False


# ── Extract __NEXT_DATA__ ────────────────────────────────────────────────────

def _extract_next_data(html: str) -> dict | None:
    """Extract __NEXT_DATA__ JSON from page HTML."""
    m = re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    return None


def _parse_trulieve_item(item: dict) -> dict | None:
    """Parse a single Trulieve __NEXT_DATA__ product item."""
    name = (item.get("name") or "").strip()
    if not name:
        return None

    # Brand from custom_attributes_product
    brand = ""
    custom = item.get("custom_attributes_product") or {}
    if isinstance(custom, dict):
        brand = custom.get("brand_name") or custom.get("brand") or ""

    # Strain type
    strain_type = ""
    if isinstance(custom, dict):
        strain_type = custom.get("strain_type") or ""

    # THC
    thc = ""
    if isinstance(custom, dict):
        thc = str(custom.get("thc_percentage") or custom.get("thc") or "")

    # Price from price_range
    price = ""
    price_range = item.get("price_range") or {}
    if isinstance(price_range, dict):
        min_price = price_range.get("minimum_price") or {}
        if isinstance(min_price, dict):
            final = min_price.get("final_price") or min_price.get("regular_price") or {}
            if isinstance(final, dict):
                price = str(final.get("value", ""))

    # Terpenes
    terpenes = {}
    if isinstance(custom, dict):
        for k, v in custom.items():
            if "terpene" in k.lower() or "terp" in k.lower():
                if isinstance(v, (int, float)) and v > 0:
                    terpenes[k] = round(float(v), 3)

    # Filter: only actual flower (not pre-rolls, ground, etc.)
    # We keep all since the category page is already filtered to flower
    return {
        "id": str(item.get("id") or item.get("sku", "")),
        "name": name,
        "brand": str(brand).strip(),
        "strain_type": str(strain_type).strip(),
        "thc_pct": str(thc).replace("%", "").strip(),
        "price_eighth": str(price).replace("$", "").strip(),
        "product_type": "flower",
    }


def _parse_trulieve_products(next_data: dict) -> list[dict]:
    """Extract flower products from Trulieve __NEXT_DATA__."""
    products = []

    def _walk(obj, depth=0):
        if depth > 12:
            return
        if isinstance(obj, list):
            for item in obj:
                _walk(item, depth + 1)
        elif isinstance(obj, dict):
            # Check if this is a product
            name = obj.get("name") or obj.get("productName") or ""
            sku = obj.get("sku") or obj.get("id") or ""
            has_variants = "variants" in obj or "configurable_options" in obj or "items" in obj

            # Trulieve products have terpene data and THC percentages
            if name and (obj.get("__typename") == "ConfigurableProduct" or
                        obj.get("type_id") == "configurable" or
                        "thc" in str(obj.keys()).lower() or
                        obj.get("strain_type") or
                        obj.get("category_name", "").lower() == "flower"):
                parsed = _parse_single(obj)
                if parsed:
                    products.append(parsed)
            else:
                for v in obj.values():
                    if isinstance(v, (dict, list)):
                        _walk(v, depth + 1)

    _walk(next_data)
    return products


def _parse_single(obj: dict) -> dict | None:
    name = (obj.get("name") or obj.get("productName") or "").strip()
    if not name:
        return None

    # Filter: only flower
    cat = (obj.get("category_name") or obj.get("category") or "").lower()
    type_id = (obj.get("type_id") or "").lower()

    # Brand — Trulieve stores brand in various places
    brand = ""
    brand_obj = obj.get("brand") or obj.get("brand_name") or ""
    if isinstance(brand_obj, dict):
        brand = brand_obj.get("name", "")
    elif isinstance(brand_obj, str):
        brand = brand_obj

    # Strain type
    strain_type = obj.get("strain_type") or obj.get("strainType") or ""

    # THC
    thc = ""
    # Look in configurable_options for THC percentage
    config_opts = obj.get("configurable_options") or []
    for opt in config_opts:
        if not isinstance(opt, dict):
            continue
        label = (opt.get("label") or opt.get("attribute_code") or "").lower()
        if "thc" in label:
            values = opt.get("values") or []
            if values and isinstance(values[0], dict):
                thc = str(values[0].get("label", ""))
            elif values:
                thc = str(values[0])
            break

    if not thc:
        thc_val = obj.get("thc_percentage") or obj.get("thc") or obj.get("potency_thc") or ""
        if thc_val:
            thc = str(thc_val)

    # Price
    price = ""
    price_range = obj.get("price_range") or {}
    if isinstance(price_range, dict):
        min_price = price_range.get("minimum_price") or price_range.get("min") or {}
        if isinstance(min_price, dict):
            final = min_price.get("final_price") or min_price.get("regular_price") or {}
            if isinstance(final, dict):
                price = str(final.get("value", ""))
            elif final:
                price = str(final)

    if not price:
        price = str(obj.get("price") or obj.get("special_price") or "")

    # Terpenes
    terpenes = {}
    terp_data = obj.get("terpene_profile") or obj.get("terpenes") or {}
    if isinstance(terp_data, dict):
        for k, v in terp_data.items():
            if isinstance(v, (int, float)) and v > 0:
                terpenes[k] = round(float(v), 3)

    result = {
        "id": str(obj.get("sku") or obj.get("id") or obj.get("uid", "")),
        "name": name,
        "brand": brand.strip(),
        "strain_type": strain_type.strip(),
        "thc_pct": str(thc).replace("%", "").strip(),
        "price_eighth": str(price).replace("$", "").strip(),
        "product_type": "flower",
    }
    if terpenes:
        result["terpenes"] = terpenes

    return result


# ── Scrape single location (with pagination) ────────────────────────────────

async def scrape_location(page: Page, loc: dict) -> dict:
    slug = loc["slug"]
    name = loc["name"]
    store_id = loc["store_id"]
    base_url = f"https://www.trulieve.com/category/flower?storeId={store_id}"
    log.info("Scraping %s  (%s)", name, base_url)

    all_products = []
    method = "none"
    max_load_more_clicks = 50  # Safety limit (~800 products max)

    try:
        url = base_url
        log.info("  Loading: %s", url)

        await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        await page.wait_for_timeout(3_000)
        await handle_age_gate(page)
        await page.wait_for_timeout(1_000)

        # First, extract initial SSR data
        html = await page.content()
        next_data = _extract_next_data(html)

        if next_data:
            props = next_data.get("props", {}).get("pageProps", {})
            cat_data = props.get("categoryData", {})
            items = cat_data.get("products", {}).get("items", [])

            for item in items:
                parsed = _parse_trulieve_item(item)
                if parsed:
                    all_products.append(parsed)

            log.info("  SSR initial: %d items", len(items))
            method = "ssr"

        # Now click "Load More" button repeatedly to get all products
        load_more_clicks = 0
        while load_more_clicks < max_load_more_clicks:
            try:
                load_more = page.locator('button:has-text("Load More"), button:has-text("Show More"), [data-testid="load-more"]')
                if await load_more.count() == 0:
                    log.info("  No more 'Load More' button found after %d clicks", load_more_clicks)
                    break

                # Scroll to the button first
                await load_more.first.scroll_into_view_if_needed(timeout=3_000)
                await load_more.first.click(timeout=5_000)
                load_more_clicks += 1
                await page.wait_for_timeout(2_000)

                # Re-extract page content after loading more
                if load_more_clicks % 5 == 0:
                    log.info("  Clicked 'Load More' %d times...", load_more_clicks)

            except Exception as e:
                log.info("  Load More stopped: %s", str(e)[:80])
                break

        # After all Load More clicks, extract all visible products from the DOM
        if load_more_clicks > 0:
            log.info("  Extracting products from DOM after %d Load More clicks...", load_more_clicks)
            # Get all product cards from the page
            dom_products = await page.evaluate("""() => {
                const products = [];
                // Look for product cards with data attributes or structured content
                const cards = document.querySelectorAll('[data-testid*="product"], [class*="ProductCard"], [class*="product-card"], article');
                cards.forEach(card => {
                    const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="Name"], [class*="title"]');
                    const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
                    const thcEl = card.querySelector('[class*="thc"], [class*="THC"], [class*="potency"]');

                    if (nameEl) {
                        const name = nameEl.textContent.trim();
                        const price = priceEl ? priceEl.textContent.trim() : '';
                        const thc = thcEl ? thcEl.textContent.trim() : '';
                        if (name && name.length > 2) {
                            products.push({ name, price, thc });
                        }
                    }
                });
                return products;
            }""")

            if dom_products:
                log.info("  DOM extraction: %d product cards found", len(dom_products))
                for dp in dom_products:
                    price_match = re.search(r'\$(\d+(?:\.\d{2})?)', dp.get('price', ''))
                    thc_match = re.search(r'(\d+(?:\.\d+)?)\s*%', dp.get('thc', ''))
                    all_products.append({
                        "id": f"dom-{len(all_products)}",
                        "name": dp['name'],
                        "brand": "",
                        "strain_type": "",
                        "thc_pct": thc_match.group(1) if thc_match else "",
                        "price_eighth": price_match.group(1) if price_match else "",
                        "product_type": "flower",
                    })
                method = "ssr+dom"

        # Deduplicate
        seen = set()
        unique = []
        for p in all_products:
            key = p["name"].lower()
            if key not in seen:
                seen.add(key)
                unique.append(p)
        all_products = unique

        log.info("  %s: %d unique flower products  (method: %s, load_more_clicks: %d)",
                 slug, len(all_products), method, load_more_clicks)

    except Exception as e:
        log.error("  %s: ERROR — %s", slug, e)
        method = "error"

    result = {
        "slug": slug,
        "name": name,
        "url": base_url,
        "platform": "trulieve",
        "store_id": store_id,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": all_products,
        "method": method,
    }

    out_path = RAW_DIR / f"trulieve_{slug}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    return result


# ── Orchestrator ─────────────────────────────────────────────────────────────

async def run(locations: list[dict], headed: bool = False):
    start = time.time()
    run_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    results = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=not headed)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        for i, loc in enumerate(locations):
            log.info("[%d/%d] %s", i + 1, len(locations), loc["name"])
            result = await scrape_location(page, loc)
            results.append(result)
            if i < len(locations) - 1:
                await asyncio.sleep(3.0)

        await browser.close()

    elapsed = time.time() - start
    with_data = sum(1 for r in results if r["products"])
    total_products = sum(len(r["products"]) for r in results)
    errors = sum(1 for r in results if r["method"] == "error")

    summary = {
        "run_timestamp": run_ts,
        "platform": "trulieve",
        "elapsed_seconds": round(elapsed),
        "dispensaries_total": len(results),
        "dispensaries_with_data": with_data,
        "dispensaries_empty": len(results) - with_data - errors,
        "dispensaries_error": errors,
        "total_products": total_products,
        "results": [
            {"slug": r["slug"], "name": r["name"], "products": len(r["products"]), "method": r["method"]}
            for r in results
        ],
    }

    summary_path = RAW_DIR / f"trulieve_run_{run_ts}.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    log.info("")
    log.info("=" * 60)
    log.info("Run complete  |  %ds elapsed", round(elapsed))
    log.info("  Dispensaries : %d total", len(results))
    log.info("  With data    : %d", with_data)
    log.info("  Empty        : %d", len(results) - with_data - errors)
    log.info("  Errors       : %d", errors)
    log.info("  Products     : %d", total_products)
    log.info("  Summary      : %s", summary_path)
    log.info("=" * 60)

    return summary


def main():
    parser = argparse.ArgumentParser(description="Scrape Trulieve MD dispensaries")
    parser.add_argument("--test", action="store_true", help="Scrape only 1 location")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    args = parser.parse_args()

    locations = TRULIEVE_LOCATIONS
    if args.test:
        locations = locations[:1]

    log.info("Trulieve scraper starting — %d locations", len(locations))
    asyncio.run(run(locations, headed=args.headed))


if __name__ == "__main__":
    main()
