"""
scraper/scrape_sweedpos.py

Playwright-based scraper for dispensaries using the SweedPOS e-commerce platform.
SweedPOS serves product data from sweedpos.com / sweedpos.s3.amazonaws.com domains.

Known SweedPOS dispensaries in MD:
  - Enlightened Dispensary Abingdon (shop.revcanna.com)
  - gLeaf Rockville (gleaf.com)
  - gLeaf Frederick (gleaf.com)

Strategy:
  1. Navigate to each store's online menu page
  2. Handle age gate
  3. Intercept JSON responses from sweedpos domains
  4. Extract flower products with prices
  5. DOM fallback if API interception fails

Run:
    python -m scraper.scrape_sweedpos
    python -m scraper.scrape_sweedpos --test
    python -m scraper.scrape_sweedpos --headed

Output:  data/raw/sweedpos_<slug>.json
         data/raw/sweedpos_run_<timestamp>.json
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
_fh = logging.FileHandler(LOG_DIR / "scrape_sweedpos.log", encoding="utf-8")
_fh.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_sh, _fh])
log = logging.getLogger(__name__)

# ── SweedPOS dispensary locations ────────────────────────────────────────────

SWEEDPOS_LOCATIONS = [
    {
        "name": "Enlightened Dispensary - Abingdon",
        "slug": "enlightened-abingdon",
        "url": "https://shop.revcanna.com/abingdon/recreational",
    },
    {
        "name": "gLeaf - Rockville",
        "slug": "gleaf-rockville",
        "url": "https://www.gleaf.com/stores/maryland/rockville",
    },
    {
        "name": "gLeaf - Frederick",
        "slug": "gleaf-frederick",
        "url": "https://www.gleaf.com/stores/maryland/frederick",
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
                 "I am at least 21", "I am 21 years", "21+", "ENTER", "I Agree"]:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click(timeout=3_000)
                await page.wait_for_timeout(1_000)
                return True
        except Exception:
            pass

    # Generic link/anchor style
    for text in ["Enter", "Yes", "21+", "I Agree"]:
        try:
            link = page.get_by_role("link", name=re.compile(text, re.IGNORECASE))
            if await link.count() > 0:
                await link.first.click(timeout=3_000)
                await page.wait_for_timeout(1_000)
                return True
        except Exception:
            pass

    return False


# ── SweedPOS API response detection ─────────────────────────────────────────

def _is_sweedpos_api(url: str) -> bool:
    """Match SweedPOS API / product data URLs."""
    url_lower = url.lower()
    return any(kw in url_lower for kw in [
        "sweedpos.com", "sweedpos.s3.amazonaws.com",
        "static-production.sweedpos", "media.sweedpos",
        "/api/v1/menu", "/api/v1/product", "/api/v2/menu",
        "/api/v2/product", "/api/store", "/api/menu",
        "inventory", "catalog",
    ])


def _parse_sweedpos_products(data, slug: str) -> list[dict]:
    """Extract flower products from SweedPOS JSON response."""
    products = []

    def _extract(obj: dict) -> dict | None:
        name = (obj.get("name") or obj.get("productName") or
                obj.get("product_name") or obj.get("title") or "").strip()
        if not name:
            return None

        # Category filter — only flower
        category = (obj.get("category") or obj.get("type") or
                    obj.get("product_type") or obj.get("category_name") or "").lower()
        subcategory = (obj.get("subcategory") or obj.get("sub_category") or "").lower()

        if category:
            is_flower = any(kw in category for kw in ["flower", "bud", "buds"])
            if not is_flower and category not in ("", "all"):
                return None
        if subcategory and "flower" not in subcategory and "bud" not in subcategory:
            # If there's a subcategory and it's not flower, skip
            pass  # still allow if category matched

        brand = obj.get("brand") or obj.get("brand_name") or obj.get("brandName") or ""
        if isinstance(brand, dict):
            brand = brand.get("name", "")

        strain_type = (obj.get("strain_type") or obj.get("strainType") or
                       obj.get("classification") or obj.get("subspecies") or "")

        thc = ""
        thc_val = obj.get("thc") or obj.get("thc_percentage") or obj.get("potency_thc") or obj.get("thcContent") or ""
        if thc_val:
            thc = str(thc_val).replace("%", "").strip()

        # Price extraction
        price = ""
        price_val = obj.get("price") or obj.get("unit_price") or obj.get("basePrice") or ""
        if price_val:
            price = str(price_val).replace("$", "").strip()

        # Weight-based pricing
        weights = (obj.get("weights") or obj.get("pricing") or
                   obj.get("variants") or obj.get("priceBreaks") or [])
        if isinstance(weights, list):
            for w in weights:
                if not isinstance(w, dict):
                    continue
                wt = str(w.get("weight", "") or w.get("size", "") or
                         w.get("label", "") or w.get("name", "")).lower()
                if "3.5" in wt or "eighth" in wt or "1/8" in wt:
                    wprice = w.get("price") or w.get("unit_price") or ""
                    if wprice:
                        price = str(wprice).replace("$", "").strip()
                        break

        return {
            "id": str(obj.get("id") or obj.get("product_id") or obj.get("productId") or ""),
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
    """Extract products from visible SweedPOS page content."""
    products = []
    try:
        # SweedPOS typical selectors
        for selector in [
            '.product-card', '[class*="ProductCard"]', '[class*="product-item"]',
            '[class*="menu-item"]', '[class*="catalog-item"]',
            'a[href*="/product/"]', 'a[href*="/menu/"]',
            '[data-product]', '[data-item]',
            '.sc-product', '.menu-product',
        ]:
            cards = page.locator(selector)
            count = await cards.count()
            if count > 2:
                log.info("    DOM: found %d elements via %s", count, selector)
                for i in range(min(count, 200)):
                    try:
                        card = cards.nth(i)
                        text = await card.inner_text(timeout=2_000)
                        lines = [l.strip() for l in text.split("\n") if l.strip()]
                        if not lines:
                            continue
                        name = lines[0]

                        # Filter for flower-related items
                        full_text = " ".join(lines).lower()
                        if any(kw in full_text for kw in ["edible", "vape", "cartridge",
                                "concentrate", "tincture", "topical", "accessori", "pre-roll"]):
                            continue

                        price = ""
                        thc = ""
                        strain_type = ""
                        brand = ""
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
                            "brand": brand,
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
        log.warning("    DOM extraction failed: %s", e)
    return products


# ── Scrape single location ───────────────────────────────────────────────────

async def scrape_location(page: Page, loc: dict) -> dict:
    slug = loc["slug"]
    name = loc["name"]
    url = loc["url"]
    log.info("Scraping %s  (%s)", name, url)

    captured_products = []
    api_responses = []
    api_urls = []

    async def on_response(response: Response):
        try:
            if response.status == 200:
                rurl = response.url
                ct = response.headers.get("content-type", "")
                if "json" in ct or "javascript" in ct:
                    if _is_sweedpos_api(rurl) or "product" in rurl.lower() or "menu" in rurl.lower():
                        body = await response.json()
                        api_responses.append(body)
                        api_urls.append(rurl)
        except Exception:
            pass

    page.on("response", on_response)

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        await page.wait_for_timeout(3_000)
        await handle_age_gate(page)
        await page.wait_for_timeout(2_000)

        # Try clicking "Shop" or "Menu" or "Order" link if on a landing page
        for link_text in ["Shop", "Order", "Menu", "View Menu", "Shop Now",
                          "Order Online", "Browse Menu", "Flower"]:
            try:
                link = page.get_by_role("link", name=re.compile(link_text, re.IGNORECASE))
                if await link.count() > 0:
                    href = await link.first.get_attribute("href")
                    if href and ("/menu" in href.lower() or "/shop" in href.lower() or
                                 "/order" in href.lower() or "flower" in href.lower() or
                                 "/recreational" in href.lower()):
                        log.info("    Clicking '%s' → %s", link_text, href)
                        await link.first.click(timeout=5_000)
                        await page.wait_for_timeout(3_000)
                        await handle_age_gate(page)
                        await page.wait_for_timeout(2_000)
                        break
            except Exception:
                continue

        # Try clicking Flower category filter
        for filter_text in ["Flower", "Buds", "flower"]:
            try:
                btn = page.locator(f'a:has-text("{filter_text}"), button:has-text("{filter_text}"), [data-category*="flower"]')
                if await btn.count() > 0:
                    await btn.first.click(timeout=3_000)
                    await page.wait_for_timeout(2_000)
                    break
            except Exception:
                continue

        # Scroll to trigger lazy loading
        for _ in range(5):
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(1_000)

        # Parse API responses
        for i, resp_data in enumerate(api_responses):
            items = _parse_sweedpos_products(resp_data, slug)
            if items:
                log.info("    +%d products from API response %d (%s)",
                         len(items), i, api_urls[i][:80] if i < len(api_urls) else "?")
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
            log.info("    No API data, trying DOM extraction")
            captured_products = await _extract_from_dom(page)

        method = "api" if api_responses and captured_products else "dom" if captured_products else "none"
        log.info("  %s: %d flower products  (method: %s, api_responses: %d)",
                 slug, len(captured_products), method, len(api_responses))

    except Exception as e:
        log.error("  %s: ERROR — %s", slug, e)
        method = "error"
    finally:
        page.remove_listener("response", on_response)

    result = {
        "slug": slug,
        "dispensary": name,
        "dispensary_name": name,
        "url": url,
        "platform": "sweedpos",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": captured_products,
        "method": method,
    }

    out_path = RAW_DIR / f"sweedpos_{slug}.json"
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
        "platform": "sweedpos",
        "elapsed_seconds": round(elapsed),
        "dispensaries_total": len(results),
        "dispensaries_with_data": with_data,
        "dispensaries_empty": len(results) - with_data - errors,
        "dispensaries_error": errors,
        "total_products": total_products,
        "results": [
            {"slug": r["slug"], "name": r["dispensary"], "products": len(r["products"]), "method": r["method"]}
            for r in results
        ],
    }

    summary_path = RAW_DIR / f"sweedpos_run_{run_ts}.json"
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
    parser = argparse.ArgumentParser(description="Scrape SweedPOS dispensaries")
    parser.add_argument("--test", action="store_true", help="Scrape only 1 location")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    parser.add_argument("--slugs", type=str, help="Comma-separated slugs to scrape")
    args = parser.parse_args()

    locations = SWEEDPOS_LOCATIONS
    if args.slugs:
        slug_set = set(s.strip() for s in args.slugs.split(","))
        locations = [l for l in locations if l["slug"] in slug_set]
        if not locations:
            log.error("No matching locations for slugs: %s", args.slugs)
            sys.exit(1)
    elif args.test:
        locations = locations[:1]

    log.info("SweedPOS scraper starting — %d locations", len(locations))
    asyncio.run(run(locations, headed=args.headed))


if __name__ == "__main__":
    main()
