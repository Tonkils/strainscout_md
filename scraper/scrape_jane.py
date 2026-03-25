"""
scraper/scrape_jane.py

Playwright-based scraper for iHeartJane dispensary menus.

Strategy:
  1. Intercept iHeartJane API responses (JSON) — fast & reliable
  2. Fall back to DOM parsing if API interception yields nothing

iHeartJane menus are at:
  https://www.iheartjane.com/stores/<id>/<slug>/menu/featured

Run all iHeartJane dispensaries:
    python -m scraper.scrape_jane

Test mode:
    python -m scraper.scrape_jane --test

Output:  data/raw/jane_<slug>.json  (one file per dispensary)
         data/raw/jane_run_<timestamp>.json  (run summary)
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
_file_handler = logging.FileHandler(LOG_DIR / "scrape_jane.log", encoding="utf-8")
_file_handler.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_stdout_handler, _file_handler])
log = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
AGE_GATE_DOB = {"month": "05", "day": "27", "year": "1997"}
MENU_TIMEOUT = 20_000
PAGE_TIMEOUT = 60_000
INTER_PAGE_DELAY = 3.0


# ── Age-gate handler ─────────────────────────────────────────────────────────

async def handle_age_gate(page: Page) -> bool:
    """Dismiss iHeartJane age verification."""
    for text in ["I'm 21 or older", "I am 21+", "Enter", "Yes", "I'm 21", "I am at least 21"]:
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


# ── API interception ─────────────────────────────────────────────────────────

def _is_jane_api(url: str) -> bool:
    """Return True if URL looks like a Jane API call with product data."""
    return ("iheartjane.com" in url or "jane.com" in url) and \
           ("api" in url.lower() or "products" in url.lower() or "menu" in url.lower())


def _parse_jane_products(data, slug: str) -> list[dict]:
    """Extract flower products from Jane API response."""
    products = []

    def _extract_product(obj: dict) -> dict | None:
        from scraper.category_map import normalize_category

        name = (obj.get("name") or obj.get("product_name") or "").strip()
        if not name:
            return None

        # Capture authoritative category from Jane's kind field
        kind = (obj.get("kind") or obj.get("product_type") or obj.get("category") or "").lower()
        root_subtype = (obj.get("root_subtype") or obj.get("root_type") or "").lower()
        raw_category = kind or root_subtype or ""
        product_category = normalize_category(raw_category, "jane") if raw_category else "Flower"

        brand = (obj.get("brand") or obj.get("brand_name") or "")
        if isinstance(brand, dict):
            brand = brand.get("name", "")

        strain_type = obj.get("category_type", "") or obj.get("strain_type", "") or ""

        # THC
        thc = ""
        thc_val = obj.get("percent_thc") or obj.get("thc_potency") or obj.get("thc")
        if thc_val:
            try:
                thc = str(round(float(thc_val), 2))
            except (ValueError, TypeError):
                thc = str(thc_val).replace("%", "").strip()

        # Price — look for eighth/3.5g
        price = ""
        # Check bucket prices
        bucket_prices = obj.get("bucket_prices") or obj.get("prices") or []
        if isinstance(bucket_prices, list):
            for bp in bucket_prices:
                if not isinstance(bp, dict):
                    continue
                amt = str(bp.get("amount", "") or bp.get("weight", "")).lower()
                if "3.5" in amt or "eighth" in amt or "1/8" in amt:
                    price = str(bp.get("price", ""))
                    break
            if not price and bucket_prices:
                # fallback: cheapest bucket
                priced = [bp for bp in bucket_prices if isinstance(bp, dict) and bp.get("price")]
                if priced:
                    cheapest = min(priced, key=lambda x: float(x.get("price", 999)))
                    price = str(cheapest.get("price", ""))

        # Top-level price fallback
        if not price:
            for key in ("price", "special_price", "default_price"):
                val = obj.get(key)
                if val:
                    try:
                        if float(str(val).replace("$", "")) > 0:
                            price = str(val)
                            break
                    except (ValueError, TypeError):
                        pass

        return {
            "id": str(obj.get("id", obj.get("product_id", ""))),
            "name": name,
            "brand": str(brand).strip(),
            "strain_type": strain_type.strip(),
            "thc_pct": thc,
            "price_eighth": price.replace("$", "").strip(),
            "product_category": product_category,
            "product_type": product_category,  # backwards compat
        }

    def _walk(obj, depth=0):
        if depth > 10:
            return
        if isinstance(obj, list):
            for item in obj:
                if isinstance(item, dict):
                    prod = _extract_product(item)
                    if prod:
                        products.append(prod)
                    else:
                        _walk(item, depth + 1)
                elif isinstance(item, list):
                    _walk(item, depth + 1)
        elif isinstance(obj, dict):
            # Check if this object itself is a product
            prod = _extract_product(obj)
            if prod:
                products.append(prod)
            else:
                for v in obj.values():
                    if isinstance(v, (dict, list)):
                        _walk(v, depth + 1)

    if isinstance(data, (dict, list)):
        _walk(data)

    return products


# ── DOM fallback ─────────────────────────────────────────────────────────────

async def _scrape_dom(page: Page, slug: str) -> list[dict]:
    """Fallback: scrape products from iHeartJane DOM."""
    products = []
    try:
        cards = page.locator('[data-testid*="product"], [class*="ProductCard"], [class*="product-card"], .menu-product')
        count = await cards.count()
        log.info("  DOM fallback: found %d product elements", count)

        for i in range(min(count, 200)):
            try:
                card = cards.nth(i)
                text = await card.inner_text(timeout=2_000)
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                if len(lines) >= 1:
                    name = lines[0]
                    price = ""
                    thc = ""
                    for line in lines:
                        pm = re.search(r"\$(\d+(?:\.\d{2})?)", line)
                        if pm:
                            price = pm.group(1)
                        tm = re.search(r"(\d+(?:\.\d+)?)\s*%?\s*THC", line, re.I)
                        if tm:
                            thc = tm.group(1)
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


# ── Main scraping logic ──────────────────────────────────────────────────────

async def scrape_dispensary(page: Page, url: str, name: str, slug: str) -> dict:
    """Scrape a single iHeartJane dispensary."""
    log.info("Scraping %s  (%s)", name, url)

    captured_products = []
    api_responses = []

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
        await page.wait_for_timeout(1_500)

        # Wait for products
        try:
            await page.wait_for_selector(
                '[data-testid*="product"], [class*="ProductCard"], .menu-product',
                timeout=MENU_TIMEOUT,
            )
        except Exception:
            log.debug("  No product elements found via selector")

        await page.wait_for_timeout(2_000)

        # Scroll to trigger lazy loading
        for _ in range(3):
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(1_000)

        # Try to click "Flower" filter if visible
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

        # DOM fallback
        if not captured_products:
            log.info("  API interception empty, trying DOM fallback")
            captured_products = await _scrape_dom(page, slug)

        method = "api" if api_responses else "dom" if captured_products else "none"
        log.info("  %s: %d products  (method: %s)", slug, len(captured_products), method)

    except Exception as e:
        log.error("  %s: ERROR - %s", slug, e)
        method = "error"
    finally:
        page.remove_listener("response", on_response)

    result = {
        "slug": slug,
        "name": name,
        "url": url,
        "platform": "iheartjane",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": captured_products,
        "method": method,
    }

    out_path = RAW_DIR / f"jane_{slug}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    return result


# ── Orchestrator ─────────────────────────────────────────────────────────────

async def run(targets: list[dict], headed: bool = False):
    """Run scraper on a list of target dicts with 'url', 'name', 'slug'."""
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

        for i, target in enumerate(targets):
            log.info("[%d/%d] %s", i + 1, len(targets), target["name"])
            result = await scrape_dispensary(page, target["url"], target["name"], target["slug"])
            results.append(result)
            if i < len(targets) - 1:
                await asyncio.sleep(INTER_PAGE_DELAY)

        await browser.close()

    elapsed = time.time() - start

    with_data = sum(1 for r in results if r["products"])
    total_products = sum(len(r["products"]) for r in results)
    errors = sum(1 for r in results if r["method"] == "error")

    summary = {
        "run_timestamp": run_ts,
        "platform": "iheartjane",
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

    summary_path = RAW_DIR / f"jane_run_{run_ts}.json"
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


def get_targets() -> list[dict]:
    """Load iHeartJane targets from scraping_targets.json."""
    from scraper.targets import get_all_targets
    all_targets = get_all_targets()
    jane_targets = []
    for t in all_targets:
        for url in t.get("urls", []):
            if "iheartjane.com" in url.lower() or "jane.com" in url.lower():
                # Extract slug from URL
                m = re.search(r"/stores/(\d+/[^/]+)", url)
                slug = m.group(1).replace("/", "-") if m else t["name"].lower().replace(" ", "-")
                jane_targets.append({
                    "name": t["name"],
                    "url": url,
                    "slug": slug,
                })
                break
    return jane_targets


def main():
    parser = argparse.ArgumentParser(description="Scrape iHeartJane dispensary menus")
    parser.add_argument("--test", action="store_true", help="Scrape only 1 dispensary")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    args = parser.parse_args()

    targets = get_targets()
    if args.test:
        targets = targets[:1]

    log.info("iHeartJane scraper starting - %d dispensaries", len(targets))
    asyncio.run(run(targets, headed=args.headed))


if __name__ == "__main__":
    main()
