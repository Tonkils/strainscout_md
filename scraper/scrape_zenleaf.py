"""
scraper/scrape_zenleaf.py

Playwright-based scraper for Zen Leaf (Verano) Maryland dispensaries.
Zen Leaf uses the Sweed platform for online menus.

Strategy:
  1. Navigate to each location's menu page
  2. Handle age gate
  3. Intercept Sweed API responses OR extract from DOM
  4. Sweed menus are often embedded via iframe

Zen Leaf MD locations:
  Elkridge, Germantown, Pasadena, Towson

Run:
    python -m scraper.scrape_zenleaf
    python -m scraper.scrape_zenleaf --test
    python -m scraper.scrape_zenleaf --headed

Output:  data/raw/zenleaf_<slug>.json
         data/raw/zenleaf_run_<timestamp>.json
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
_fh = logging.FileHandler(LOG_DIR / "scrape_zenleaf.log", encoding="utf-8")
_fh.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_sh, _fh])
log = logging.getLogger(__name__)

# ── Zen Leaf MD locations ────────────────────────────────────────────────────
ZENLEAF_LOCATIONS = [
    {
        "name": "Zen Leaf - Elkridge",
        "slug": "zenleaf-elkridge",
        "url": "https://zenleafdispensaries.com/locations/elkridge/menu/recreational",
    },
    {
        "name": "Zen Leaf - Germantown",
        "slug": "zenleaf-germantown",
        "url": "https://zenleafdispensaries.com/locations/germantown/menu/recreational",
    },
    {
        "name": "Zen Leaf - Pasadena",
        "slug": "zenleaf-pasadena",
        "url": "https://zenleafdispensaries.com/locations/pasadena/menu/recreational",
    },
    {
        "name": "Zen Leaf - Towson",
        "slug": "zenleaf-towson",
        "url": "https://zenleafdispensaries.com/locations/towson/menu/recreational",
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
                await submit.first.click(timeout=3_000)
                await page.wait_for_timeout(1_500)
                return True
    except Exception:
        pass

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
    return False


# ── Sweed API interception ───────────────────────────────────────────────────

def _is_sweed_api(url: str) -> bool:
    """Match Sweed menu API calls."""
    return ("sweed" in url.lower() and ("api" in url.lower() or "menu" in url.lower() or "product" in url.lower())) or \
           ("zenleafdispensaries.com" in url and "api" in url.lower())


def _parse_sweed_products(data, slug: str) -> list[dict]:
    """Extract flower products from Sweed API response."""
    products = []

    def _extract(obj: dict) -> dict | None:
        name = (obj.get("name") or obj.get("productName") or obj.get("product_name") or "").strip()
        if not name:
            return None

        category = (obj.get("category") or obj.get("type") or obj.get("product_type") or "").lower()
        if category and "flower" not in category and "bud" not in category:
            return None

        brand = obj.get("brand") or obj.get("brand_name") or ""
        if isinstance(brand, dict):
            brand = brand.get("name", "")

        strain_type = obj.get("strain_type") or obj.get("strainType") or obj.get("classification") or ""
        thc = str(obj.get("thc") or obj.get("thc_percentage") or obj.get("potency_thc") or "").replace("%", "").strip()

        price = ""
        price_val = obj.get("price") or obj.get("unit_price") or ""
        if price_val:
            price = str(price_val).replace("$", "").strip()

        # Check for weight-based pricing
        weights = obj.get("weights") or obj.get("pricing") or obj.get("variants") or []
        if isinstance(weights, list):
            for w in weights:
                if not isinstance(w, dict):
                    continue
                wt = str(w.get("weight", "") or w.get("size", "") or w.get("label", "")).lower()
                if "3.5" in wt or "eighth" in wt or "1/8" in wt:
                    wprice = w.get("price") or w.get("unit_price") or ""
                    if wprice:
                        price = str(wprice).replace("$", "").strip()
                        break

        return {
            "id": str(obj.get("id") or obj.get("product_id") or ""),
            "name": name,
            "brand": str(brand).strip(),
            "strain_type": str(strain_type).strip(),
            "thc_pct": thc,
            "price_eighth": price,
            "product_type": "flower",
        }

    def _walk(obj, depth=0):
        if depth > 10:
            return
        if isinstance(obj, list):
            for item in obj:
                if isinstance(item, dict):
                    prod = _extract(item)
                    if prod:
                        products.append(prod)
                    else:
                        _walk(item, depth + 1)
                elif isinstance(item, list):
                    _walk(item, depth + 1)
        elif isinstance(obj, dict):
            prod = _extract(obj)
            if prod:
                products.append(prod)
            else:
                for v in obj.values():
                    if isinstance(v, (dict, list)):
                        _walk(v, depth + 1)

    _walk(data)
    return products


# ── DOM extraction ───────────────────────────────────────────────────────────

async def _extract_from_dom(page: Page) -> list[dict]:
    """Extract products from visible page content."""
    products = []
    try:
        # Look for product cards or links
        for selector in ['[class*="product"]', '[class*="menu-item"]', 'a[href*="product"]', '[data-product]']:
            cards = page.locator(selector)
            count = await cards.count()
            if count > 0:
                log.info("  DOM: found %d elements via %s", count, selector)
                for i in range(min(count, 200)):
                    try:
                        card = cards.nth(i)
                        text = await card.inner_text(timeout=2_000)
                        lines = [l.strip() for l in text.split("\n") if l.strip()]
                        if not lines:
                            continue
                        name = lines[0]
                        price = ""
                        thc = ""
                        strain_type = ""
                        for line in lines:
                            pm = re.search(r"\$(\d+(?:\.\d{2})?)", line)
                            if pm:
                                price = pm.group(1)
                            tm = re.search(r"(\d+(?:\.\d+)?)\s*%?\s*THC", line, re.I)
                            if tm:
                                thc = tm.group(1)
                            for st in ("Indica", "Sativa", "Hybrid"):
                                if st.lower() in line.lower():
                                    strain_type = st
                        products.append({
                            "id": f"dom-{i}",
                            "name": name,
                            "brand": "",
                            "strain_type": strain_type,
                            "thc_pct": thc,
                            "price_eighth": price,
                            "product_type": "flower",
                        })
                    except Exception:
                        continue
                if products:
                    break
    except Exception as e:
        log.warning("  DOM extraction failed: %s", e)
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
            if response.status == 200:
                rurl = response.url
                ct = response.headers.get("content-type", "")
                if "json" in ct and (_is_sweed_api(rurl) or "product" in rurl.lower() or "menu" in rurl.lower()):
                    body = await response.json()
                    api_responses.append(body)
        except Exception:
            pass

    page.on("response", on_response)

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        await page.wait_for_timeout(3_000)
        await handle_age_gate(page)
        await page.wait_for_timeout(3_000)

        # Check for Sweed iframe
        iframe_locator = page.locator('iframe[src*="sweed"], iframe[src*="menu"], iframe[src*="order"]')
        iframe_count = await iframe_locator.count()
        if iframe_count > 0:
            log.info("  Found Sweed iframe, switching context")
            iframe = page.frame_locator('iframe[src*="sweed"], iframe[src*="menu"], iframe[src*="order"]').first
            # Try to interact with iframe content
            await page.wait_for_timeout(5_000)

        # Scroll to trigger lazy loading
        for _ in range(5):
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(1_000)

        # Parse API responses
        for resp_data in api_responses:
            items = _parse_sweed_products(resp_data, slug)
            captured_products.extend(items)

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
            log.info("  No API data captured, trying DOM extraction")
            captured_products = await _extract_from_dom(page)

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
        "platform": "sweed",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": captured_products,
        "method": method,
    }

    out_path = RAW_DIR / f"zenleaf_{slug}.json"
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
        "platform": "zenleaf-sweed",
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

    summary_path = RAW_DIR / f"zenleaf_run_{run_ts}.json"
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
    parser = argparse.ArgumentParser(description="Scrape Zen Leaf MD dispensaries (Sweed)")
    parser.add_argument("--test", action="store_true", help="Scrape only 1 location")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    args = parser.parse_args()

    locations = ZENLEAF_LOCATIONS
    if args.test:
        locations = locations[:1]

    log.info("Zen Leaf (Sweed) scraper starting — %d locations", len(locations))
    asyncio.run(run(locations, headed=args.headed))


if __name__ == "__main__":
    main()
