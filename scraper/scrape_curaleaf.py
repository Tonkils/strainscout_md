"""
scraper/scrape_curaleaf.py

Playwright-based scraper for Curaleaf Maryland dispensaries.
Curaleaf uses SweedPOS with React Router — product data is embedded in
window.__sw_qc (dehydrated query cache) and also in schema.org JSON-LD.

Curaleaf MD locations:
  Reisterstown → store 114, slug curaleaf-md-reisterstown
  Columbia     → store 111, slug curaleaf-md-columbia
  Frederick    → slug curaleaf-md-frederick
  Gaithersburg → slug curaleaf-md-gaithersburg

Strategy:
  1. Navigate to flower menu page
  2. Handle age gate (state selector + 21+ verification)
  3. Extract product data from page text / JSON-LD / __sw_qc
  4. Paginate through all pages

Run:
    python -m scraper.scrape_curaleaf
    python -m scraper.scrape_curaleaf --test
    python -m scraper.scrape_curaleaf --headed

Output:  data/raw/curaleaf_<slug>.json
         data/raw/curaleaf_run_<timestamp>.json
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
_fh = logging.FileHandler(LOG_DIR / "scrape_curaleaf.log", encoding="utf-8")
_fh.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_sh, _fh])
log = logging.getLogger(__name__)

# ── Curaleaf MD locations ────────────────────────────────────────────────────
CURALEAF_LOCATIONS = [
    {
        "name": "Curaleaf - Reisterstown",
        "slug": "curaleaf-reisterstown",
        "url_slug": "curaleaf-md-reisterstown",
    },
    {
        "name": "Curaleaf - Columbia",
        "slug": "curaleaf-columbia",
        "url_slug": "curaleaf-md-columbia",
    },
    {
        "name": "Curaleaf - Frederick",
        "slug": "curaleaf-frederick",
        "url_slug": "curaleaf-md-frederick",
    },
    {
        "name": "Curaleaf - Gaithersburg",
        "slug": "curaleaf-gaithersburg",
        "url_slug": "curaleaf-md-gaithersburg",
    },
]

PAGE_TIMEOUT = 60_000
INTER_PAGE_DELAY = 3.0


# ── Age gate handler ────────────────────────────────────────────────────────

async def handle_curaleaf_age_gate(page: Page) -> bool:
    """Handle Curaleaf's age gate — state selector + 21+ confirmation."""
    try:
        # Check if we're on the age gate / state selector page
        await page.wait_for_timeout(2_000)

        # Look for "Maryland" state link or button
        md_link = page.locator('a:has-text("Maryland"), button:has-text("Maryland")')
        if await md_link.count() > 0:
            await md_link.first.click(timeout=5_000)
            log.info("  Selected Maryland on state selector")
            await page.wait_for_timeout(2_000)

        # Look for 21+ confirmation
        for text in ["Yes", "I'm 21", "I am 21+", "Enter", "I'm 21 or older", "I am at least 21"]:
            try:
                btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
                if await btn.count() > 0:
                    await btn.first.click(timeout=3_000)
                    await page.wait_for_timeout(1_500)
                    return True
            except Exception:
                pass

        # Try clicking any prominent CTA button
        try:
            cta = page.locator('[class*="age-gate"] button, [class*="AgeGate"] button, [data-testid*="age"] button')
            if await cta.count() > 0:
                await cta.first.click(timeout=3_000)
                await page.wait_for_timeout(1_500)
                return True
        except Exception:
            pass

    except Exception as e:
        log.debug("  Age gate handling: %s", e)

    return False


# ── Extract products from JSON-LD ────────────────────────────────────────────

def _extract_jsonld_products(html: str) -> list[dict]:
    """Extract products from schema.org JSON-LD embedded in the page."""
    products = []
    # Find all JSON-LD script blocks
    for m in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(m.group(1))
            if isinstance(data, dict) and data.get("@type") == "ItemList":
                for item in data.get("itemListElement", []):
                    prod = item.get("item", {})
                    if not prod:
                        continue
                    name = prod.get("name", "").strip()
                    if not name:
                        continue
                    offers = prod.get("offers", {})
                    price = ""
                    if isinstance(offers, dict):
                        price = str(offers.get("price", ""))
                    elif isinstance(offers, list) and offers:
                        price = str(offers[0].get("price", ""))

                    products.append({
                        "id": str(prod.get("sku", prod.get("productID", ""))),
                        "name": name,
                        "brand": "",
                        "strain_type": "",
                        "thc_pct": "",
                        "price_eighth": price.replace("$", "").strip(),
                        "product_type": "flower",
                    })
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("@type") in ("Product", "IndividualProduct"):
                        name = item.get("name", "").strip()
                        if name:
                            offers = item.get("offers", {})
                            price = ""
                            if isinstance(offers, dict):
                                price = str(offers.get("price", ""))
                            products.append({
                                "id": str(item.get("sku", "")),
                                "name": name,
                                "brand": str(item.get("brand", {}).get("name", "") if isinstance(item.get("brand"), dict) else item.get("brand", "")),
                                "strain_type": "",
                                "thc_pct": "",
                                "price_eighth": price.replace("$", "").strip(),
                                "product_type": "flower",
                            })
        except json.JSONDecodeError:
            continue
    return products


# ── Extract products from __sw_qc cache ──────────────────────────────────────

def _extract_swqc_products(html: str) -> list[dict]:
    """Extract products from Curaleaf's SweedPOS dehydrated query cache."""
    products = []
    m = re.search(r'window\.__sw_qc\s*=\s*({.*?});\s*</script>', html, re.DOTALL)
    if not m:
        return products

    try:
        cache = json.loads(m.group(1))
        queries = cache.get("queries", [])
        for q in queries:
            state = q.get("state", {})
            data = state.get("data", {})
            if not isinstance(data, dict):
                continue

            # Look for product arrays in the dehydrated data
            def _walk(obj, depth=0):
                if depth > 8:
                    return
                if isinstance(obj, list):
                    for item in obj:
                        if isinstance(item, dict) and (item.get("name") or item.get("productName")):
                            parsed = _parse_curaleaf_product(item)
                            if parsed:
                                products.append(parsed)
                        elif isinstance(item, (dict, list)):
                            _walk(item, depth + 1)
                elif isinstance(obj, dict):
                    for v in obj.values():
                        if isinstance(v, (dict, list)):
                            _walk(v, depth + 1)

            _walk(data)
    except json.JSONDecodeError:
        pass

    return products


def _parse_curaleaf_product(obj: dict) -> dict | None:
    """Parse a single Curaleaf product from SweedPOS cache."""
    name = (obj.get("name") or obj.get("productName") or "").strip()
    if not name:
        return None

    brand = obj.get("brand", "") or obj.get("brandName", "")
    if isinstance(brand, dict):
        brand = brand.get("name", "")

    strain_type = obj.get("strainType", "") or obj.get("strain_type", "") or obj.get("lineage", "")

    thc = ""
    thc_val = obj.get("thc") or obj.get("thcContent") or obj.get("potencyThc") or ""
    if isinstance(thc_val, dict):
        thc = str(thc_val.get("formatted", thc_val.get("value", "")))
    elif thc_val:
        thc = str(thc_val).replace("%", "").strip()

    price = ""
    price_val = obj.get("price") or obj.get("displayPrice") or obj.get("salePrice") or ""
    if price_val:
        price = str(price_val).replace("$", "").strip()

    # Check variants/sizes for eighth price
    variants = obj.get("variants") or obj.get("sizes") or []
    for v in variants:
        if not isinstance(v, dict):
            continue
        size = str(v.get("size", "") or v.get("label", "") or v.get("option", "")).lower()
        if "3.5" in size or "eighth" in size:
            vprice = v.get("price") or v.get("salePrice") or ""
            if vprice:
                price = str(vprice).replace("$", "").strip()
                break

    return {
        "id": str(obj.get("id") or obj.get("productId") or obj.get("sku", "")),
        "name": name,
        "brand": str(brand).strip(),
        "strain_type": str(strain_type).strip(),
        "thc_pct": thc,
        "price_eighth": price,
        "product_type": "flower",
    }


# ── DOM text extraction fallback ─────────────────────────────────────────────

async def _extract_from_dom(page: Page) -> list[dict]:
    """Extract products from Curaleaf's ProductCard elements.

    Each card's inner text looks like:
      0\\nSativa\\nDark Heart\\nFlower by Grassroots\\nDelphi Diesel Smalls\\nTHC: 27.08%\\nCBD: 0.66%\\n3.5g\\n30% Off!\\n$31.50\\n$45.00
    """
    products = []
    try:
        cards = page.locator('[class*="ProductCard"]')
        count = await cards.count()
        log.info("  DOM: found %d ProductCard elements", count)

        for i in range(min(count, 200)):
            try:
                card = cards.nth(i)
                text = await card.inner_text(timeout=2_000)
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                if len(lines) < 3:
                    continue

                # Parse structured card text
                name = ""
                brand = ""
                strain_type = ""
                thc = ""
                price = ""

                for line in lines:
                    # Strain type
                    if line in ("Indica", "Sativa", "Hybrid"):
                        strain_type = line
                        continue
                    # THC line: "THC: 27.08%" or "THC: 23.01 - 31.52%"
                    tm = re.match(r"THC:\s*([\d.]+)", line)
                    if tm:
                        thc = tm.group(1)
                        continue
                    # CBD line
                    if line.startswith("CBD:"):
                        continue
                    # Price line: "$31.50"
                    pm = re.match(r"\$(\d+(?:\.\d{2})?)", line)
                    if pm:
                        if not price:  # First price = sale price
                            price = pm.group(1)
                        continue
                    # Discount line
                    if "Off!" in line or "off" in line.lower():
                        continue
                    # Size line: "3.5g", "7g", "14g"
                    if re.match(r"^\d+(?:\.\d+)?g$", line):
                        continue
                    # Quality line: "Dark Heart", "Everyday", etc.
                    if line in ("Dark Heart", "Everyday", "Reserve", "Select", "Premium"):
                        continue
                    # Brand line: "Flower by Grassroots" → brand = "Grassroots"
                    bm = re.match(r"(?:Flower|flower)\s+by\s+(.+)", line)
                    if bm:
                        brand = bm.group(1).strip()
                        continue
                    # Skip numeric-only lines (cart count, etc.)
                    if re.match(r"^\d+$", line):
                        continue
                    # What remains is likely the product name
                    if not name:
                        name = line

                if name:
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
    except Exception as e:
        log.warning("  DOM extraction failed: %s", e)

    return products


# ── Scrape single location ───────────────────────────────────────────────────

async def scrape_location(page: Page, loc: dict) -> dict:
    slug = loc["slug"]
    name = loc["name"]
    url_slug = loc["url_slug"]
    url = f"https://curaleaf.com/shop/maryland/{url_slug}/recreational/menu/flower-542"
    log.info("Scraping %s  (%s)", name, url)

    all_products = []
    method = "none"

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        await page.wait_for_timeout(3_000)

        # Handle age gate if present
        await handle_curaleaf_age_gate(page)
        await page.wait_for_timeout(3_000)

        # Check if we got redirected to state selector — try navigating again
        current_url = page.url
        if "flower" not in current_url:
            log.info("  Redirected to %s, navigating to flower menu again", current_url[:60])
            await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
            await page.wait_for_timeout(3_000)

        # Scroll to load content
        for _ in range(5):
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(1_000)

        html = await page.content()

        # Method 1: Try JSON-LD
        jsonld_products = _extract_jsonld_products(html)
        if jsonld_products:
            all_products.extend(jsonld_products)
            method = "jsonld"
            log.info("  JSON-LD: found %d products", len(jsonld_products))

        # Method 2: Try __sw_qc cache
        swqc_products = _extract_swqc_products(html)
        if swqc_products:
            all_products.extend(swqc_products)
            if method == "none":
                method = "swqc"
            else:
                method += "+swqc"
            log.info("  SweedPOS cache: found %d products", len(swqc_products))

        # Method 3: DOM fallback
        if not all_products:
            dom_products = await _extract_from_dom(page)
            if dom_products:
                all_products.extend(dom_products)
                method = "dom"
                log.info("  DOM extraction: found %d products", len(dom_products))

        # Deduplicate
        seen = set()
        unique = []
        for p in all_products:
            key = p["name"].lower()
            if key not in seen:
                seen.add(key)
                unique.append(p)
        all_products = unique

        log.info("  %s: %d unique flower products  (method: %s)", slug, len(all_products), method)

    except Exception as e:
        log.error("  %s: ERROR — %s", slug, e)
        method = "error"

    result = {
        "slug": slug,
        "name": name,
        "url": url,
        "platform": "curaleaf",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": all_products,
        "method": method,
    }

    out_path = RAW_DIR / f"curaleaf_{slug}.json"
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
        "platform": "curaleaf",
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

    summary_path = RAW_DIR / f"curaleaf_run_{run_ts}.json"
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
    parser = argparse.ArgumentParser(description="Scrape Curaleaf MD dispensaries")
    parser.add_argument("--test", action="store_true", help="Scrape only 1 location")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    parser.add_argument("--slugs", type=str, help="Comma-separated slugs to scrape")
    args = parser.parse_args()

    locations = CURALEAF_LOCATIONS
    if args.slugs:
        slug_set = set(s.strip() for s in args.slugs.split(","))
        locations = [l for l in locations if l["slug"] in slug_set]
        if not locations:
            log.error("No matching locations for slugs: %s", args.slugs)
            sys.exit(1)
    elif args.test:
        locations = locations[:1]

    log.info("Curaleaf scraper starting — %d locations", len(locations))
    asyncio.run(run(locations, headed=args.headed))


if __name__ == "__main__":
    main()
