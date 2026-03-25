"""
scraper/scrape_dutchie.py

Playwright-based scraper for Dutchie embedded dispensary menus.

Strategy:
  1. Intercept Dutchie GraphQL API responses — fast & reliable
  2. Fall back to DOM parsing if API interception yields nothing

Dutchie menus are typically embedded at:
  https://dutchie.com/dispensary/<slug>/products/flower

Run all Dutchie dispensaries:
    python -m scraper.scrape_dutchie

Test mode:
    python -m scraper.scrape_dutchie --test
    python -m scraper.scrape_dutchie --slugs remedy-baltimore,waave

Output:  data/raw/dutchie_<slug>.json  (one file per dispensary)
         data/raw/dutchie_run_<timestamp>.json  (run summary)
"""

import asyncio
import json
import os
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
_stdout_handler = logging.StreamHandler(sys.stdout)
_stdout_handler.setFormatter(_fmt)
if hasattr(_stdout_handler.stream, "reconfigure"):
    try:
        _stdout_handler.stream.reconfigure(encoding="utf-8")
    except Exception:
        pass
_file_handler = logging.FileHandler(LOG_DIR / "scrape_dutchie.log", encoding="utf-8")
_file_handler.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_stdout_handler, _file_handler])
log = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
DUTCHIE_BASE = "https://dutchie.com/dispensary"
AGE_GATE_DOB = {"month": "05", "day": "27", "year": "1997"}

MENU_TIMEOUT = 20_000
PAGE_TIMEOUT = 60_000
INTER_PAGE_DELAY = 3.0


# ── Age-gate handler ─────────────────────────────────────────────────────────

async def handle_age_gate(page: Page) -> bool:
    """Dismiss Dutchie age-verification modal."""
    # Button-style gates
    for text in ["I'm 21 or older", "I am 21+", "Enter", "Yes", "I'm 21"]:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click(timeout=3_000)
                log.debug("Age gate dismissed via button: %s", text)
                await page.wait_for_timeout(1_000)
                return True
        except Exception:
            pass

    # Date-of-birth form
    try:
        month_input = page.locator('input[placeholder="MM"], input[name="month"], input[aria-label*="month" i]')
        if await month_input.count() > 0:
            await month_input.first.fill(AGE_GATE_DOB["month"])
            day_input = page.locator('input[placeholder="DD"], input[name="day"], input[aria-label*="day" i]')
            await day_input.first.fill(AGE_GATE_DOB["day"])
            year_input = page.locator('input[placeholder="YYYY"], input[name="year"], input[aria-label*="year" i]')
            await year_input.first.fill(AGE_GATE_DOB["year"])
            submit = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Enter")')
            if await submit.count() > 0:
                await submit.first.click(timeout=3_000)
                log.debug("Age gate dismissed via DOB form")
                await page.wait_for_timeout(1_000)
                return True
    except Exception:
        pass

    # Generic modal button
    try:
        btn = page.locator('[role="dialog"] button, [aria-modal="true"] button')
        if await btn.count() > 0:
            await btn.first.click(timeout=3_000)
            await page.wait_for_timeout(1_000)
            return True
    except Exception:
        pass

    return False


# ── API interception ─────────────────────────────────────────────────────────

def _is_dutchie_api(url: str) -> bool:
    """Return True if this URL looks like a Dutchie API/GraphQL call with menu data."""
    return ("dutchie.com" in url and "graphql" in url.lower()) or \
           ("dutchie.com" in url and "api" in url.lower()) or \
           ("plus.dutchie.com" in url)


def _parse_graphql_products(data: dict, slug: str) -> list[dict]:
    """Extract all products from Dutchie GraphQL response, capturing authoritative category."""
    products = []

    def _walk(obj, depth=0):
        """Recursively walk JSON looking for product objects."""
        if depth > 8:
            return
        if isinstance(obj, list):
            for item in obj:
                _walk(item, depth + 1)
        elif isinstance(obj, dict):
            name = obj.get("name", "")
            # A product has a name AND either a type/category field or a strainType
            if name and (obj.get("type") or obj.get("category") or "strainType" in obj):
                parsed = _parse_product(obj)
                if parsed:
                    products.append(parsed)
            else:
                for v in obj.values():
                    if isinstance(v, (dict, list)):
                        _walk(v, depth + 1)

    _walk(data)
    return products


def _parse_product(obj: dict) -> dict | None:
    """Parse a single Dutchie product object."""
    from scraper.category_map import normalize_category

    name = (obj.get("name") or "").strip()
    if not name:
        return None

    brand = (obj.get("brand", {}) or {})
    if isinstance(brand, dict):
        brand_name = brand.get("name", "")
    else:
        brand_name = str(brand)

    # Capture authoritative category from Dutchie's type field
    raw_category = obj.get("type", "") or obj.get("category", "") or ""
    product_category = normalize_category(str(raw_category), "dutchie") if raw_category else "Flower"

    strain_type = obj.get("strainType", "") or obj.get("strain_type", "") or ""

    # THC
    thc = ""
    potency_thc = obj.get("potencyThc", {})
    if isinstance(potency_thc, dict):
        thc = str(potency_thc.get("formatted", potency_thc.get("value", "")))
    elif potency_thc:
        thc = str(potency_thc)
    if not thc:
        thc = str(obj.get("thcContent", "") or obj.get("THCContent", ""))

    # Price — look for eighth/3.5g price
    price = ""
    variants = obj.get("variants", []) or obj.get("Variants", []) or []
    for v in variants:
        if not isinstance(v, dict):
            continue
        opt = (v.get("option", "") or "").lower()
        if "3.5" in opt or "eighth" in opt or "1/8" in opt:
            price = str(v.get("price", ""))
            break
    if not price and variants:
        # fallback: smallest variant
        priced = [v for v in variants if isinstance(v, dict) and v.get("price")]
        if priced:
            cheapest = min(priced, key=lambda v: float(v.get("price", 999)))
            price = str(cheapest.get("price", ""))

    # Also check top-level price fields
    if not price:
        for key in ("price", "Price", "priceRec", "priceMed"):
            val = obj.get(key)
            if val and float(str(val).replace("$", "").replace(",", "") or 0) > 0:
                price = str(val)
                break

    return {
        "id": str(obj.get("id", obj.get("_id", ""))),
        "name": name,
        "brand": brand_name.strip(),
        "strain_type": strain_type.strip(),
        "thc_pct": thc.replace("%", "").strip(),
        "price_eighth": price.replace("$", "").strip(),
        "product_category": product_category,
        "product_type": product_category,  # backwards compat
    }


# ── DOM fallback ─────────────────────────────────────────────────────────────

async def _scrape_dom(page: Page, slug: str) -> list[dict]:
    """Fallback: scrape flower products from Dutchie DOM."""
    products = []
    try:
        # Look for product cards
        cards = page.locator('[data-testid="product-card"], .product-card, [class*="ProductCard"], [class*="product-card"]')
        count = await cards.count()
        log.info("  DOM fallback: found %d product cards", count)

        for i in range(min(count, 200)):
            try:
                card = cards.nth(i)
                text = await card.inner_text(timeout=2_000)
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                if len(lines) >= 2:
                    name = lines[0]
                    # Try to find price (looks like $XX.XX)
                    price = ""
                    for line in lines:
                        m = re.search(r"\$(\d+(?:\.\d{2})?)", line)
                        if m:
                            price = m.group(1)
                            break
                    products.append({
                        "id": f"dom-{i}",
                        "name": name,
                        "brand": "",
                        "strain_type": "",
                        "thc_pct": "",
                        "price_eighth": price,
                        "product_type": "flower",
                    })
            except Exception:
                continue
    except Exception as e:
        log.warning("  DOM fallback failed: %s", e)

    return products


# ── Main scraping logic ──────────────────────────────────────────────────────

async def scrape_dispensary(page: Page, slug: str, name: str) -> dict:
    """Scrape a single Dutchie dispensary. Returns a result dict."""
    url = f"{DUTCHIE_BASE}/{slug}/products/flower"
    log.info("Scraping %s  (%s)", name, url)

    captured_products = []
    api_responses = []

    async def on_response(response: Response):
        try:
            if _is_dutchie_api(response.url) and response.status == 200:
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

        # Handle age gate
        await handle_age_gate(page)
        await page.wait_for_timeout(1_500)

        # Wait for products to load
        try:
            await page.wait_for_selector(
                '[data-testid="product-card"], .product-card, [class*="ProductCard"], [class*="product-list"]',
                timeout=MENU_TIMEOUT,
            )
        except Exception:
            log.debug("  No product cards found via selector, checking API responses")

        await page.wait_for_timeout(2_000)

        # Scroll to trigger lazy loading
        for _ in range(3):
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(1_000)

        # Parse API responses
        for resp_data in api_responses:
            items = _parse_graphql_products(resp_data, slug)
            captured_products.extend(items)

        # Deduplicate by name
        seen = set()
        unique = []
        for p in captured_products:
            key = p["name"].lower()
            if key not in seen:
                seen.add(key)
                unique.append(p)
        captured_products = unique

        # DOM fallback if API gave nothing
        if not captured_products:
            log.info("  API interception empty, trying DOM fallback")
            captured_products = await _scrape_dom(page, slug)

        method = "api" if api_responses else "dom" if captured_products else "none"
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
        "platform": "dutchie",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": captured_products,
        "method": method,
    }

    # Save per-dispensary file
    out_path = RAW_DIR / f"dutchie_{slug}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    return result


# ── Orchestrator ─────────────────────────────────────────────────────────────

async def run(slugs: list[tuple[str, str]], headed: bool = False):
    """Run the scraper on a list of (slug, name) tuples."""
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

        for i, (slug, name) in enumerate(slugs):
            log.info("[%d/%d] %s", i + 1, len(slugs), name)
            result = await scrape_dispensary(page, slug, name)
            results.append(result)

            if i < len(slugs) - 1:
                await asyncio.sleep(INTER_PAGE_DELAY)

        await browser.close()

    elapsed = time.time() - start

    # Run summary
    with_data = sum(1 for r in results if r["products"])
    total_products = sum(len(r["products"]) for r in results)
    errors = sum(1 for r in results if r["method"] == "error")

    summary = {
        "run_timestamp": run_ts,
        "platform": "dutchie",
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

    summary_path = RAW_DIR / f"dutchie_run_{run_ts}.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    log.info("Run complete  |  %ds elapsed", round(elapsed))
    log.info("  Dispensaries : %d total", len(results))
    log.info("  With data    : %d", with_data)
    log.info("  Empty        : %d", len(results) - with_data - errors)
    log.info("  Errors       : %d", errors)
    log.info("  Products     : %d", total_products)
    log.info("  Summary      : %s", summary_path)

    return summary


def get_targets() -> list[tuple[str, str]]:
    """Load Dutchie targets from scraping_targets.json."""
    from scraper.targets import get_dutchie_targets
    targets = get_dutchie_targets()
    return [(t["dutchie"], t["name"]) for t in targets]


def main():
    parser = argparse.ArgumentParser(description="Scrape Dutchie dispensary menus")
    parser.add_argument("--test", action="store_true", help="Scrape only 2 dispensaries")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    parser.add_argument("--slugs", type=str, help="Comma-separated slugs to scrape")
    args = parser.parse_args()

    if args.slugs:
        slugs = [(s.strip(), s.strip()) for s in args.slugs.split(",")]
    elif args.test:
        all_targets = get_targets()
        slugs = all_targets[:2]
    else:
        slugs = get_targets()

    log.info("Dutchie scraper starting — %d dispensaries", len(slugs))
    asyncio.run(run(slugs, headed=args.headed))


if __name__ == "__main__":
    main()
