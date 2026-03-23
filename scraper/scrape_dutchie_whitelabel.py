"""
scraper/scrape_dutchie_whitelabel.py

Generic Playwright scraper for dispensaries using Dutchie white-label embeds.
These dispensaries host Dutchie menus on their own domains (not dutchie.com).
We visit each site and intercept GraphQL responses containing product data.

Works for: Green Point Wellness, Nirvana, The Forest, The Living Room,
           Summit/Mission, KOAN, Far & Dotter, Mana Supply, etc.

Strategy:
  1. Navigate to the dispensary's menu page
  2. Handle age gate (DOB or button)
  3. Intercept ALL graphql responses for product data (filteredProducts, etc.)
  4. Scroll to trigger pagination
  5. Parse Dutchie product objects

Run:
    python -m scraper.scrape_dutchie_whitelabel
    python -m scraper.scrape_dutchie_whitelabel --test
    python -m scraper.scrape_dutchie_whitelabel --headed

Output:  data/raw/dutchie_wl_<slug>.json
         data/raw/dutchie_wl_run_<timestamp>.json
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

from playwright.async_api import async_playwright, Page, Response

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
_fh = logging.FileHandler(LOG_DIR / "scrape_dutchie_wl.log", encoding="utf-8")
_fh.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_sh, _fh])
log = logging.getLogger(__name__)

# ── White-label Dutchie dispensaries ─────────────────────────────────────────
# Each entry: name, slug (for output file), menu_url (the actual page to visit)

WHITELABEL_LOCATIONS = [
    {
        "name": "Green Point Wellness - Linthicum",
        "slug": "gpw-linthicum",
        "menu_url": "https://www.gpwellness.com/linthicum-menu",
    },
    {
        "name": "Green Point Wellness - Laurel",
        "slug": "gpw-laurel",
        "menu_url": "https://www.gpwellness.com/laurel-menu",
    },
    {
        "name": "Green Point Wellness - Millersville",
        "slug": "gpw-millersville",
        "menu_url": "https://www.gpwellness.com/millersville-menu",
    },
    {
        "name": "The Edge (Green Point Wellness)",
        "slug": "the-edge-edgewater",
        "menu_url": "https://www.gpwellness.com/edgewater-menu",
    },
    {
        "name": "Nirvana Cannabis - Baltimore",
        "slug": "nirvana-baltimore",
        "menu_url": "https://nirvanacannabis.com/baltimore/",
    },
    {
        "name": "Nirvana Cannabis - Rosedale",
        "slug": "nirvana-rosedale",
        "menu_url": "https://nirvanacannabis.com/rosedale/",
    },
    {
        "name": "The Forest - Baltimore",
        "slug": "forest-baltimore",
        "menu_url": "https://theforestdispensary.com/stores/the-forest-baltimore/shop/flower",
    },
    {
        "name": "The Living Room",
        "slug": "the-living-room",
        "menu_url": "https://thelvrm.com/order",
    },
    {
        "name": "Summit Wellness (Mission Catonsville)",
        "slug": "summit-catonsville",
        "menu_url": "https://summitdispensary.com/",
    },
    {
        "name": "KOAN Cannabis",
        "slug": "koan-hagerstown",
        "menu_url": "https://koandispensary.com/",
    },
    {
        "name": "Far & Dotter - Elkton",
        "slug": "fardotter-elkton",
        "menu_url": "https://fardotter.com/dispensaries/elkton-md/",
    },
    # ── Batch 2+3 additions ──
    {
        "name": "Cookies - Baltimore",
        "slug": "cookies-baltimore",
        "menu_url": "https://noxx.com/location/cookies-baltimore/",
    },
    {
        "name": "Greenlight Therapeutics",
        "slug": "greenlight-therapeutics",
        "menu_url": "https://www.greenlighttherapeutics.com/",
    },
    {
        "name": "Chesacanna",
        "slug": "chesacanna",
        "menu_url": "https://menu.chesacanna.com/stores/chesacanna1",
    },
    {
        "name": "Kent Reserve",
        "slug": "kent-reserve",
        "menu_url": "https://kentreserve.com/shop/",
    },
    {
        "name": "The Forest - Canton",
        "slug": "forest-canton",
        "menu_url": "https://theforestdispensary.com/stores/the-forest-canton/",
    },
    # ── Rise / GTI (Dutchie-powered, needs headed mode) ──
    {
        "name": "Rise Dispensary - Bethesda",
        "slug": "rise-bethesda",
        "menu_url": "https://risecannabis.com/dispensaries/maryland/bethesda/5476/recreational-menu/",
    },
    {
        "name": "Rise Dispensary - Hagerstown",
        "slug": "rise-hagerstown",
        "menu_url": "https://risecannabis.com/dispensaries/maryland/hagerstown/5421/recreational-menu/",
    },
    {
        "name": "Rise Dispensary - Joppa",
        "slug": "rise-joppa",
        "menu_url": "https://risecannabis.com/dispensaries/maryland/joppa/5480/recreational-menu/",
    },
    # ── gLeaf (Dutchie-powered) ──
    {
        "name": "gLeaf - Rockville",
        "slug": "gleaf-rockville",
        "menu_url": "https://www.gleaf.com/stores/maryland/rockville/shop/recreational/menu",
    },
    {
        "name": "gLeaf - Frederick",
        "slug": "gleaf-frederick",
        "menu_url": "https://www.gleaf.com/stores/maryland/frederick/shop/recreational/menu",
    },
]

AGE_GATE_DOB = {"month": "05", "day": "27", "year": "1997"}
PAGE_TIMEOUT = 60_000
INTER_PAGE_DELAY = 3.0


# ── Age gate ─────────────────────────────────────────────────────────────────

async def handle_age_gate(page: Page) -> bool:
    # DOB form
    try:
        month_input = page.locator('input[placeholder="MM"], input[name="month"], input[aria-label*="month" i]')
        if await month_input.count() > 0:
            await month_input.first.fill(AGE_GATE_DOB["month"])
            await page.locator('input[placeholder="DD"], input[name="day"], input[aria-label*="day" i]').first.fill(AGE_GATE_DOB["day"])
            await page.locator('input[placeholder="YYYY"], input[name="year"], input[aria-label*="year" i]').first.fill(AGE_GATE_DOB["year"])
            submit = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Enter"), button:has-text("Verify")')
            if await submit.count() > 0:
                await submit.first.click(timeout=5_000)
                await page.wait_for_timeout(1_500)
                return True
    except Exception:
        pass

    # Button-style
    for text in ["I'm 21 or older", "I am 21+", "Enter", "Yes", "I'm 21", "Verify",
                 "I am at least 21", "I am 21 years", "21+", "ENTER"]:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click(timeout=3_000)
                await page.wait_for_timeout(1_000)
                return True
        except Exception:
            pass

    # Generic modal dismiss
    try:
        modal_btn = page.locator('[role="dialog"] button, [aria-modal="true"] button, .modal button')
        if await modal_btn.count() > 0:
            await modal_btn.first.click(timeout=3_000)
            await page.wait_for_timeout(1_000)
            return True
    except Exception:
        pass

    return False


# ── Product parser ───────────────────────────────────────────────────────────

def _parse_product(obj: dict) -> dict | None:
    """Parse a single Dutchie product object (white-label format).

    Handles both formats:
      - Standard Dutchie: name, strainType, potencyThc, variants
      - Ascend-style: Name, Options, Prices, THCContent
    """
    name = (obj.get("Name") or obj.get("name") or "").strip()
    if not name:
        return None

    # Filter: only flower
    obj_type = (obj.get("type") or obj.get("Type") or obj.get("category") or "").lower()
    if obj_type and "flower" not in obj_type and "bud" not in obj_type:
        if not obj.get("strainType") and not obj.get("StrainType"):
            return None

    # Brand
    brand = obj.get("brand") or obj.get("Brand") or {}
    if isinstance(brand, dict):
        brand_name = brand.get("name") or brand.get("Name") or ""
    else:
        brand_name = str(brand)
    if not brand_name:
        brand_name = obj.get("brandName") or obj.get("BrandName") or ""

    # Strain type
    strain_type = obj.get("strainType") or obj.get("StrainType") or obj.get("strain_type") or ""

    # THC
    thc = ""
    for thc_key in ("potencyThc", "PotencyThc", "THCContent", "thcContent"):
        thc_val = obj.get(thc_key)
        if thc_val:
            if isinstance(thc_val, dict):
                rng = thc_val.get("range", [])
                if rng and rng[0]:
                    thc = str(rng[0])
                else:
                    thc = str(thc_val.get("formatted", ""))
            else:
                thc = str(thc_val)
            break

    # Price — try multiple field patterns
    price = ""

    # Pattern 1: Prices + Options arrays (Ascend-style)
    prices_list = obj.get("Prices") or obj.get("recPrices") or obj.get("prices") or []
    options_list = obj.get("Options") or obj.get("options") or []
    if prices_list and options_list:
        for opt, pr in zip(options_list, prices_list):
            opt_lower = str(opt).lower()
            if "3.5" in opt_lower or "eighth" in opt_lower or "1/8" in opt_lower:
                price = str(pr)
                break
        if not price and prices_list:
            try:
                price = str(min(float(p) for p in prices_list if p))
            except (ValueError, TypeError):
                price = str(prices_list[0]) if prices_list else ""

    # Pattern 2: variants array (standard Dutchie)
    if not price:
        variants = obj.get("variants") or obj.get("Variants") or []
        for v in variants:
            if not isinstance(v, dict):
                continue
            opt = (v.get("option") or v.get("Option") or "").lower()
            if "3.5" in opt or "eighth" in opt or "1/8" in opt:
                price = str(v.get("specialPrice") or v.get("price") or v.get("Price") or "")
                break
        if not price and variants:
            priced = [v for v in variants if isinstance(v, dict) and (v.get("price") or v.get("Price"))]
            if priced:
                try:
                    cheapest = min(priced, key=lambda v: float(v.get("price") or v.get("Price") or 999))
                    price = str(cheapest.get("specialPrice") or cheapest.get("price") or cheapest.get("Price") or "")
                except (ValueError, TypeError):
                    pass

    return {
        "id": str(obj.get("id") or obj.get("_id") or obj.get("Id") or ""),
        "name": name,
        "brand": str(brand_name).strip(),
        "strain_type": str(strain_type).strip(),
        "thc_pct": str(thc).replace("%", "").strip(),
        "price_eighth": str(price).replace("$", "").strip(),
        "product_type": "flower",
    }


# ── Scrape single location ───────────────────────────────────────────────────

async def scrape_location(page: Page, loc: dict) -> dict:
    slug = loc["slug"]
    name = loc["name"]
    url = loc["menu_url"]
    log.info("Scraping %s  (%s)", name, url)

    raw_products = []

    async def on_response(response: Response):
        try:
            rurl = response.url
            # Catch GraphQL from any domain (main page, dutchie.com iframe, etc.)
            is_graphql = "graphql" in rurl.lower()
            is_dutchie_api = "dutchie.com" in rurl and "api" in rurl.lower()
            is_menu_data = "menu" in rurl.lower() and "dutchie" in rurl

            if response.status == 200 and (is_graphql or is_dutchie_api):
                ct = response.headers.get("content-type", "")
                if "json" in ct:
                    try:
                        body = await response.json()
                    except Exception:
                        return
                    data = body.get("data", {}) if isinstance(body, dict) else {}
                    if not isinstance(data, dict):
                        return

                    # Check multiple known Dutchie query result keys
                    for key in ("filteredProducts", "FilteredProducts",
                                "getPersonalizedProductsV2", "menu",
                                "consumerDispensary"):
                        container = data.get(key)
                        if isinstance(container, dict):
                            prods = container.get("products", [])
                            if prods:
                                raw_products.extend(prods)
                                log.info("    +%d products via %s", len(prods), key)
                        elif isinstance(container, list):
                            # Some queries return products directly as a list
                            for item in container:
                                if isinstance(item, dict) and (item.get("name") or item.get("Name")):
                                    raw_products.append(item)
                            if container:
                                log.info("    +%d items via %s (list)", len(container), key)
        except Exception:
            pass

    page.on("response", on_response)

    method = "none"
    parsed_products = []

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        await page.wait_for_timeout(3_000)

        await handle_age_gate(page)
        await page.wait_for_timeout(3_000)

        # Try to click "Flower" category if visible
        try:
            for flower_text in ["Flower", "FLOWER", "flower"]:
                flower_btn = page.locator(f'a:has-text("{flower_text}"), button:has-text("{flower_text}")')
                if await flower_btn.count() > 0:
                    await flower_btn.first.click(timeout=5_000)
                    log.info("  Clicked Flower category")
                    await page.wait_for_timeout(3_000)
                    break
        except Exception:
            pass

        # Scroll extensively to trigger lazy-loading / pagination
        for i in range(12):
            await page.evaluate("window.scrollBy(0, 1000)")
            await page.wait_for_timeout(1_200)

        # Parse captured products
        for obj in raw_products:
            if isinstance(obj, dict):
                parsed = _parse_product(obj)
                if parsed:
                    parsed_products.append(parsed)

        # Deduplicate
        seen = set()
        unique = []
        for p in parsed_products:
            key = p["name"].lower()
            if key not in seen:
                seen.add(key)
                unique.append(p)
        parsed_products = unique

        if parsed_products:
            method = "api"

        log.info("  %s: %d flower products  (method: %s, raw: %d)",
                 slug, len(parsed_products), method, len(raw_products))

    except Exception as e:
        log.error("  %s: ERROR — %s", slug, e)
        method = "error"
    finally:
        page.remove_listener("response", on_response)

    result = {
        "slug": slug,
        "name": name,
        "url": url,
        "platform": "dutchie-whitelabel",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": parsed_products,
        "method": method,
    }

    out_path = RAW_DIR / f"dutchie_wl_{slug}.json"
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
                await asyncio.sleep(INTER_PAGE_DELAY)

        await browser.close()

    elapsed = time.time() - start
    with_data = sum(1 for r in results if r["products"])
    total_products = sum(len(r["products"]) for r in results)
    errors = sum(1 for r in results if r["method"] == "error")

    summary = {
        "run_timestamp": run_ts,
        "platform": "dutchie-whitelabel",
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

    summary_path = RAW_DIR / f"dutchie_wl_run_{run_ts}.json"
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

    empty = [r for r in results if not r["products"] and r["method"] != "error"]
    if empty:
        log.info("Empty (no products found):")
        for r in empty:
            log.info("  %s  (method: %s)", r["slug"], r["method"])

    return summary


def main():
    parser = argparse.ArgumentParser(description="Scrape Dutchie white-label dispensaries")
    parser.add_argument("--test", action="store_true", help="Scrape only 2 locations")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    parser.add_argument("--slugs", type=str, help="Comma-separated slugs to scrape")
    args = parser.parse_args()

    locations = WHITELABEL_LOCATIONS
    if args.slugs:
        slug_set = set(s.strip() for s in args.slugs.split(","))
        locations = [l for l in locations if l["slug"] in slug_set]
        if not locations:
            log.error("No matching locations for slugs: %s", args.slugs)
            sys.exit(1)
    elif args.test:
        locations = locations[:2]

    log.info("Dutchie white-label scraper starting — %d locations", len(locations))
    asyncio.run(run(locations, headed=args.headed))


if __name__ == "__main__":
    main()
