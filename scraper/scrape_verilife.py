"""
scraper/scrape_verilife.py

Scraper for Verilife Maryland dispensaries.
Verilife uses Jane Boost (iHeartJane embedded) — we call the Jane API directly.

Verilife MD locations and their Jane store IDs:
  Westminster (rec)   → storeId 5449
  Silver Spring (rec) → storeId 5656
  New Market (rec)    → storeId 5448

Run:
    python -m scraper.scrape_verilife
    python -m scraper.scrape_verilife --test

Output:  data/raw/jane_verilife-<location>.json  (one file per dispensary)
         data/raw/jane_verilife_run_<timestamp>.json  (run summary)
"""

import asyncio
import json
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
_fh = logging.FileHandler(LOG_DIR / "scrape_verilife.log", encoding="utf-8")
_fh.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_sh, _fh])
log = logging.getLogger(__name__)

# ── Verilife MD locations ────────────────────────────────────────────────────
VERILIFE_LOCATIONS = [
    {
        "name": "Verilife Westminster",
        "slug": "verilife-westminster",
        "jane_store_id": 5449,
        "url": "https://www.verilife.com/md/menu/westminster-recreational",
    },
    {
        "name": "Verilife Silver Spring",
        "slug": "verilife-silver-spring",
        "jane_store_id": 5656,
        "url": "https://www.verilife.com/md/menu/silver-spring-recreational",
    },
    {
        "name": "Verilife New Market",
        "slug": "verilife-new-market",
        "jane_store_id": 5448,
        "url": "https://www.verilife.com/md/menu/new-market-recreational",
    },
]

AGE_GATE_DOB = {"month": "05", "day": "27", "year": "1997"}
PAGE_TIMEOUT = 60_000
INTER_PAGE_DELAY = 3.0


# ── Jane API product parser (reused from scrape_jane.py) ────────────────────

def _is_jane_api(url: str) -> bool:
    return ("iheartjane.com" in url or "jane.com" in url) and \
           ("api" in url.lower() or "products" in url.lower() or "menu" in url.lower() or "stores" in url.lower())


def _parse_jane_products(data, slug: str) -> list[dict]:
    products = []

    def _extract(obj: dict) -> dict | None:
        name = (obj.get("name") or obj.get("product_name") or "").strip()
        if not name:
            return None
        kind = (obj.get("kind") or obj.get("product_type") or obj.get("category") or "").lower()
        root_subtype = (obj.get("root_subtype") or obj.get("root_type") or "").lower()
        if kind and kind not in ("flower", "buds", "bud", "pre-packaged-flower"):
            if root_subtype not in ("flower", "buds"):
                return None

        brand = obj.get("brand") or obj.get("brand_name") or ""
        if isinstance(brand, dict):
            brand = brand.get("name", "")

        strain_type = obj.get("category_type", "") or obj.get("strain_type", "") or ""

        thc = ""
        thc_val = obj.get("percent_thc") or obj.get("thc_potency") or obj.get("thc")
        if thc_val:
            try: thc = str(round(float(thc_val), 2))
            except: thc = str(thc_val).replace("%", "").strip()

        price = ""
        bucket_prices = obj.get("bucket_prices") or obj.get("prices") or []
        if isinstance(bucket_prices, list):
            for bp in bucket_prices:
                if not isinstance(bp, dict): continue
                amt = str(bp.get("amount", "") or bp.get("weight", "")).lower()
                if "3.5" in amt or "eighth" in amt or "1/8" in amt:
                    price = str(bp.get("price", ""))
                    break
            if not price and bucket_prices:
                priced = [bp for bp in bucket_prices if isinstance(bp, dict) and bp.get("price")]
                if priced:
                    cheapest = min(priced, key=lambda x: float(x.get("price", 999)))
                    price = str(cheapest.get("price", ""))
        if not price:
            for key in ("price", "special_price", "default_price"):
                val = obj.get(key)
                if val:
                    try:
                        if float(str(val).replace("$", "")) > 0:
                            price = str(val)
                            break
                    except: pass

        return {
            "id": str(obj.get("id", obj.get("product_id", ""))),
            "name": name,
            "brand": str(brand).strip(),
            "strain_type": strain_type.strip(),
            "thc_pct": thc,
            "price_eighth": price.replace("$", "").strip(),
            "product_type": "flower",
        }

    def _walk(obj, depth=0):
        if depth > 10: return
        if isinstance(obj, list):
            for item in obj:
                if isinstance(item, dict):
                    prod = _extract(item)
                    if prod: products.append(prod)
                    else: _walk(item, depth + 1)
                elif isinstance(item, list):
                    _walk(item, depth + 1)
        elif isinstance(obj, dict):
            prod = _extract(obj)
            if prod: products.append(prod)
            else:
                for v in obj.values():
                    if isinstance(v, (dict, list)):
                        _walk(v, depth + 1)

    _walk(data)
    return products


# ── Age gate ─────────────────────────────────────────────────────────────────

async def handle_age_gate(page: Page) -> bool:
    import re
    # DOB form (Verilife uses birthdate input)
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
    for text in ["I'm 21 or older", "I am 21+", "Enter", "Yes", "I'm 21", "Verify"]:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click(timeout=3_000)
                await page.wait_for_timeout(1_000)
                return True
        except Exception:
            pass
    return False


# ── Scrape a single Verilife location ────────────────────────────────────────

async def scrape_location(page: Page, loc: dict) -> dict:
    slug = loc["slug"]
    url = loc["url"]
    name = loc["name"]
    log.info("Scraping %s  (%s)", name, url)

    api_responses = []
    captured_products = []

    async def on_response(response: Response):
        try:
            if _is_jane_api(response.url) and response.status == 200:
                ct = response.headers.get("content-type", "")
                if "json" in ct:
                    body = await response.json()
                    api_responses.append(body)
        except Exception:
            pass

    page.on("response", on_response)

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        await page.wait_for_timeout(2_000)
        await handle_age_gate(page)
        await page.wait_for_timeout(2_000)

        # Wait for Jane embed to load
        try:
            await page.wait_for_selector(
                '[data-testid*="product"], [class*="ProductCard"], [class*="product-card"], .menu-product, iframe[src*="jane"]',
                timeout=20_000,
            )
        except Exception:
            log.debug("  No product elements found, checking API responses")

        # Scroll to trigger lazy loading
        for _ in range(5):
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(1_000)

        # Try clicking "Flower" filter if visible
        try:
            flower_btn = page.locator('button:has-text("Flower"), a:has-text("Flower"), [data-testid*="flower"]')
            if await flower_btn.count() > 0:
                await flower_btn.first.click(timeout=3_000)
                await page.wait_for_timeout(2_000)
        except Exception:
            pass

        # Parse API responses
        for resp_data in api_responses:
            items = _parse_jane_products(resp_data, slug)
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

        method = "api" if api_responses and captured_products else "none"
        log.info("  %s: %d products  (method: %s)", slug, len(captured_products), method)

    except Exception as e:
        log.error("  %s: ERROR — %s", slug, e)
        method = "error"
    finally:
        page.remove_listener("response", on_response)

    result = {
        "slug": slug,
        "name": name,
        "url": url,
        "platform": "iheartjane",
        "jane_store_id": loc["jane_store_id"],
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": captured_products,
        "method": method,
    }

    out_path = RAW_DIR / f"jane_{slug}.json"
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
        "platform": "iheartjane-verilife",
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

    summary_path = RAW_DIR / f"jane_verilife_run_{run_ts}.json"
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

    # Log empty dispensaries
    empty = [r for r in results if not r["products"] and r["method"] != "error"]
    if empty:
        log.info("Empty (no products found):")
        for r in empty:
            log.info("  %s  (method: %s)", r["slug"], r["method"])

    return summary


def main():
    parser = argparse.ArgumentParser(description="Scrape Verilife MD dispensaries (Jane Boost)")
    parser.add_argument("--test", action="store_true", help="Scrape only 1 location")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    args = parser.parse_args()

    locations = VERILIFE_LOCATIONS
    if args.test:
        locations = locations[:1]

    log.info("Verilife (Jane Boost) scraper starting — %d locations", len(locations))
    asyncio.run(run(locations, headed=args.headed))


if __name__ == "__main__":
    main()
