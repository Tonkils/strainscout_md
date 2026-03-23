"""
scraper/scrape_ascend.py

Playwright-based scraper for Ascend Cannabis dispensaries in Maryland.
Ascend uses Dutchie's white-label platform — we intercept Dutchie GraphQL
responses from the browser, same pattern as scrape_dutchie.py.

Ascend MD store URLs:
  https://letsascend.com/stores/aberdeen-maryland
  https://letsascend.com/stores/crofton-maryland
  https://letsascend.com/stores/ellicott-city-maryland
  https://letsascend.com/stores/laurel-maryland

Run:
    python -m scraper.scrape_ascend
    python -m scraper.scrape_ascend --test
    python -m scraper.scrape_ascend --headed

Output:  data/raw/dutchie_ascend-<location>.json
         data/raw/dutchie_ascend_run_<timestamp>.json
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
_fh = logging.FileHandler(LOG_DIR / "scrape_ascend.log", encoding="utf-8")
_fh.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_sh, _fh])
log = logging.getLogger(__name__)

# ── Ascend MD locations ──────────────────────────────────────────────────────
ASCEND_LOCATIONS = [
    {
        "name": "Ascend Cannabis Dispensary - Aberdeen",
        "slug": "ascend-aberdeen",
        "url": "https://letsascend.com/stores/aberdeen-maryland",
    },
    {
        "name": "Ascend Cannabis Dispensary - Crofton",
        "slug": "ascend-crofton",
        "url": "https://letsascend.com/stores/crofton-maryland",
    },
    {
        "name": "Ascend Cannabis Dispensary - Ellicott City",
        "slug": "ascend-ellicott-city",
        "url": "https://letsascend.com/stores/ellicott-city-maryland",
    },
    {
        "name": "Ascend Cannabis Dispensary - Laurel",
        "slug": "ascend-laurel",
        "url": "https://letsascend.com/stores/laurel-maryland",
    },
]

AGE_GATE_DOB = {"month": "05", "day": "27", "year": "1997"}
PAGE_TIMEOUT = 60_000
MENU_TIMEOUT = 20_000
INTER_PAGE_DELAY = 3.0


# ── Age gate ─────────────────────────────────────────────────────────────────

async def handle_age_gate(page: Page) -> bool:
    # DOB form (Ascend/Dutchie uses month/day/year inputs)
    try:
        month_input = page.locator('input[placeholder="MM"], input[name="month"], input[aria-label*="month" i]')
        if await month_input.count() > 0:
            await month_input.first.fill(AGE_GATE_DOB["month"])
            await page.locator('input[placeholder="DD"], input[name="day"], input[aria-label*="day" i]').first.fill(AGE_GATE_DOB["day"])
            await page.locator('input[placeholder="YYYY"], input[name="year"], input[aria-label*="year" i]').first.fill(AGE_GATE_DOB["year"])
            submit = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Enter"), button:has-text("Verify")')
            if await submit.count() > 0:
                await submit.first.click(timeout=3_000)
                await page.wait_for_timeout(1_500)
                return True
    except Exception:
        pass

    # Button-style
    for text in ["I'm 21 or older", "I am 21+", "Enter", "Yes", "I'm 21"]:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click(timeout=3_000)
                await page.wait_for_timeout(1_000)
                return True
        except Exception:
            pass
    return False


# ── Dutchie API interception ────────────────────────────────────────────────

def _is_dutchie_api(url: str) -> bool:
    """Match Dutchie GraphQL calls — Ascend uses letsascend.com/api-4/graphql."""
    return ("graphql" in url.lower() and
            ("dutchie" in url or "letsascend.com" in url or "ascend" in url))


def _parse_single(obj: dict) -> dict | None:
    """Parse a single Dutchie/Ascend product object into our standard format.

    Ascend's Dutchie fields use capital-case: Name, Options, Prices, etc.
    """
    # Name: Dutchie uses "Name" (capital) or "name"
    name = (obj.get("Name") or obj.get("name") or "").strip()
    if not name:
        return None

    # Filter: only flower products
    obj_type = (obj.get("type") or obj.get("category") or "").lower()
    if obj_type and "flower" not in obj_type and "bud" not in obj_type:
        if not obj.get("strainType"):
            return None

    brand = obj.get("brand") or {}
    brand_name = brand.get("name", "") if isinstance(brand, dict) else str(brand)
    if not brand_name:
        brand_name = obj.get("brandName", "")

    strain_type = obj.get("strainType", "") or obj.get("strain_type", "") or ""

    # THC from THCContent or potencyThc
    thc = ""
    thc_content = obj.get("THCContent") or obj.get("potencyThc") or {}
    if isinstance(thc_content, dict):
        rng = thc_content.get("range", [])
        if rng and rng[0]:
            thc = str(rng[0])
        else:
            thc = str(thc_content.get("formatted", ""))
    elif thc_content:
        thc = str(thc_content)

    # Price from Prices/Options or variants
    price = ""
    # Ascend uses "Prices" (list) and "Options" (list) where Options[i] matches Prices[i]
    prices_list = obj.get("Prices") or obj.get("recPrices") or []
    options_list = obj.get("Options") or []
    if prices_list and options_list:
        for opt, pr in zip(options_list, prices_list):
            opt_lower = str(opt).lower()
            if "3.5" in opt_lower or "eighth" in opt_lower or "1/8" in opt_lower:
                price = str(pr)
                break
        if not price and prices_list:
            # Fallback: cheapest price
            try:
                price = str(min(float(p) for p in prices_list if p))
            except (ValueError, TypeError):
                price = str(prices_list[0]) if prices_list else ""

    # Also try "variants" (standard Dutchie)
    if not price:
        variants = obj.get("variants") or obj.get("Variants") or []
        for v in variants:
            if not isinstance(v, dict):
                continue
            opt = (v.get("option") or "").lower()
            if "3.5" in opt or "eighth" in opt or "1/8" in opt:
                price = str(v.get("specialPrice") or v.get("price", ""))
                break
        if not price and variants:
            priced = [v for v in variants if isinstance(v, dict) and v.get("price")]
            if priced:
                try:
                    cheapest = min(priced, key=lambda v: float(v.get("price", 999)))
                    price = str(cheapest.get("specialPrice") or cheapest.get("price", ""))
                except (ValueError, TypeError):
                    pass

    return {
        "id": str(obj.get("id") or obj.get("_id", "")),
        "name": name,
        "brand": brand_name.strip(),
        "strain_type": strain_type.strip(),
        "thc_pct": str(thc).replace("%", "").strip(),
        "price_eighth": str(price).replace("$", "").strip(),
        "product_type": "flower",
    }


# ── DOM fallback ─────────────────────────────────────────────────────────────

async def _scrape_dom(page: Page) -> list[dict]:
    products = []
    try:
        cards = page.locator('[data-testid="product-card"], .product-card, [class*="ProductCard"], [class*="product-list"] > div')
        count = await cards.count()
        log.info("  DOM fallback: found %d product elements", count)

        for i in range(min(count, 200)):
            try:
                card = cards.nth(i)
                text = await card.inner_text(timeout=2_000)
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                if lines:
                    name = lines[0]
                    price = ""
                    thc = ""
                    for line in lines:
                        pm = re.search(r"\$(\d+(?:\.\d{2})?)", line)
                        if pm: price = pm.group(1)
                        tm = re.search(r"(\d+(?:\.\d+)?)\s*%?\s*THC", line, re.I)
                        if tm: thc = tm.group(1)
                    products.append({
                        "id": f"dom-{i}",
                        "name": name,
                        "brand": "",
                        "strain_type": "",
                        "thc_pct": thc,
                        "price_eighth": price,
                        "product_type": "flower",
                    })
            except Exception:
                continue
    except Exception as e:
        log.warning("  DOM fallback failed: %s", e)
    return products


# ── Scrape single location ───────────────────────────────────────────────────

async def scrape_location(page: Page, loc: dict) -> dict:
    slug = loc["slug"]
    name = loc["name"]
    url = loc["url"]
    log.info("Scraping %s  (%s)", name, url)

    captured_products = []
    api_responses = []

    async def on_response(response: Response):
        try:
            url = response.url
            if response.status == 200 and "graphql" in url.lower():
                ct = response.headers.get("content-type", "")
                if "json" in ct:
                    try:
                        body = await response.json()
                    except Exception as je:
                        log.warning("  JSON parse failed for %s: %s", url[:60], je)
                        return
                    # Extract filteredProducts directly
                    data = body.get("data", {}) if isinstance(body, dict) else {}
                    fp = data.get("filteredProducts", {}) if isinstance(data, dict) else {}
                    prods = fp.get("products", []) if isinstance(fp, dict) else []
                    if prods:
                        api_responses.extend(prods)
                        log.info("  Captured %d products from %s", len(prods), url[:80])
                    # Also check getPersonalizedProductsV2
                    pp = data.get("getPersonalizedProductsV2", {}) if isinstance(data, dict) else {}
                    pprods = pp.get("products", []) if isinstance(pp, dict) else []
                    if pprods:
                        api_responses.extend(pprods)
                        log.info("  Captured %d personalized products", len(pprods))
        except Exception as e:
            log.warning("  Response handler error: %s", e)

    page.on("response", on_response)

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        await page.wait_for_timeout(2_000)
        await handle_age_gate(page)
        await page.wait_for_timeout(2_000)

        # Wait for products
        try:
            await page.wait_for_selector(
                '[data-testid="product-card"], .product-card, [class*="ProductCard"], [class*="product-list"]',
                timeout=MENU_TIMEOUT,
            )
        except Exception:
            log.debug("  No product cards found via selector")

        await page.wait_for_timeout(5_000)

        # Scroll to trigger lazy loading — Dutchie paginates heavily
        for _ in range(10):
            await page.evaluate("window.scrollBy(0, 1000)")
            await page.wait_for_timeout(1_500)

        # Parse API responses — api_responses contains raw product objects
        for prod_obj in api_responses:
            if isinstance(prod_obj, dict):
                parsed = _parse_single(prod_obj)
                if parsed:
                    captured_products.append(parsed)

        # Deduplicate
        seen = set()
        unique = []
        for p in captured_products:
            key = p["name"].lower()
            if key not in seen:
                seen.add(key)
                unique.append(p)
        captured_products = unique

        # DOM fallback
        if not captured_products:
            log.info("  No API data captured, falling back to DOM parser")
            captured_products = await _scrape_dom(page)

        method = "api" if api_responses and captured_products else "dom" if captured_products else "none"
        log.info("  %s: %d flower products  (method: %s)", slug, len(captured_products), method)

    except Exception as e:
        log.error("  %s: ERROR — %s", slug, e)
        method = "error"
    finally:
        page.remove_listener("response", on_response)

    result = {
        "slug": slug,
        "name": name,
        "url": url,
        "platform": "dutchie",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": captured_products,
        "method": method,
    }

    out_path = RAW_DIR / f"dutchie_{slug}.json"
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
        "platform": "dutchie-ascend",
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

    summary_path = RAW_DIR / f"dutchie_ascend_run_{run_ts}.json"
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
    parser = argparse.ArgumentParser(description="Scrape Ascend MD dispensaries (Dutchie)")
    parser.add_argument("--test", action="store_true", help="Scrape only 1 location")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    args = parser.parse_args()

    locations = ASCEND_LOCATIONS
    if args.test:
        locations = locations[:1]

    log.info("Ascend (Dutchie) scraper starting — %d locations", len(locations))
    asyncio.run(run(locations, headed=args.headed))


if __name__ == "__main__":
    main()
