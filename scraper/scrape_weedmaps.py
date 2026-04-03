"""
scraper/scrape_weedmaps.py

Playwright-based scraper for Weedmaps dispensary menus.

Strategy:
  1. Intercept Weedmaps internal API responses (JSON) — fast & reliable
  2. Fall back to DOM parsing if API interception yields nothing

Run all 57 dispensaries:
    python -m scraper.scrape_weedmaps

Test mode (2–3 dispensaries):
    python -m scraper.scrape_weedmaps --test
    python -m scraper.scrape_weedmaps --slugs culta,elevated-dispo

Output:  data/raw/weedmaps_<slug>.json  (one file per dispensary)
         data/raw/weedmaps_run_<timestamp>.json  (run summary)
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
from scraper.utils import async_retry

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
# Force UTF-8 on Windows stdout to avoid cp1252 encode errors
if hasattr(_stdout_handler.stream, "reconfigure"):
    try:
        _stdout_handler.stream.reconfigure(encoding="utf-8")
    except Exception:
        pass
_file_handler = logging.FileHandler(LOG_DIR / "scrape_weedmaps.log", encoding="utf-8")
_file_handler.setFormatter(_fmt)
logging.basicConfig(level=logging.INFO, handlers=[_stdout_handler, _file_handler])
log = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
WEEDMAPS_BASE = "https://weedmaps.com/dispensaries"
AGE_GATE_DOB = {"month": "05", "day": "27", "year": "1997"}

# How long to wait for the menu to load after age gate (ms)
MENU_TIMEOUT = 15_000
# Max time per dispensary (ms) before giving up
PAGE_TIMEOUT = 60_000
# Pause between dispensaries (seconds) — be polite
INTER_PAGE_DELAY = 2.5


# ── Age-gate handler ─────────────────────────────────────────────────────────

async def handle_age_gate(page: Page) -> bool:
    """
    Dismiss Weedmaps age-verification modal.
    Returns True if a gate was found and dismissed.
    """
    # Strategy 1: "I'm 21 or older" / "Enter Site" style button
    for text in ["I'm 21 or older", "I am 21+", "Enter Site", "Yes, I'm 21"]:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click(timeout=3_000)
                log.debug("Age gate dismissed via button: %s", text)
                await page.wait_for_timeout(800)
                return True
        except Exception:
            pass

    # Strategy 2: Date-of-birth form (month / day / year inputs)
    try:
        month_input = page.locator('input[placeholder="MM"], input[name="month"]')
        if await month_input.count() > 0:
            await month_input.first.fill(AGE_GATE_DOB["month"])
            day_input = page.locator('input[placeholder="DD"], input[name="day"]')
            await day_input.first.fill(AGE_GATE_DOB["day"])
            year_input = page.locator('input[placeholder="YYYY"], input[name="year"]')
            await year_input.first.fill(AGE_GATE_DOB["year"])
            submit = page.locator('button[type="submit"]')
            await submit.first.click(timeout=3_000)
            log.debug("Age gate dismissed via DOB form")
            await page.wait_for_timeout(800)
            return True
    except Exception:
        pass

    # Strategy 3: Look for any dialog/modal "Submit" or "Confirm" button
    try:
        btn = page.locator('[role="dialog"] button, [aria-modal="true"] button')
        count = await btn.count()
        if count > 0:
            await btn.first.click(timeout=3_000)
            log.debug("Age gate dismissed via modal button fallback")
            await page.wait_for_timeout(800)
            return True
    except Exception:
        pass

    return False


# ── API interception ─────────────────────────────────────────────────────────

def _is_menu_api(url: str) -> bool:
    """Return True if this URL looks like a Weedmaps menu_items API call."""
    return "menu_items" in url and "api-g.weedmaps.com" in url


def _parse_discovery_item(item: dict) -> dict | None:
    """
    Parse one item from discovery/v1 API format.
    { id, name, edge_category, category, metrics, prices, ... }
    """
    from scraper.category_map import normalize_category

    # edge_category.slug = authoritative product category ("flower", "pre-roll", etc.)
    edge_cat = item.get("edge_category") or {}
    raw_category = (edge_cat.get("slug") or "").lower() if isinstance(edge_cat, dict) else ""
    product_category = normalize_category(raw_category, "weedmaps") if raw_category else "Flower"

    name = (item.get("name") or "").strip()
    if not name:
        return None

    # Strain type comes from category.name (Indica/Sativa/Hybrid)
    cat = item.get("category") or {}
    strain_type = (cat.get("name") or "").strip() if isinstance(cat, dict) else ""

    # THC from metrics.aggregates.thc (most reliable)
    thc = ""
    metrics = item.get("metrics") or {}
    if isinstance(metrics, dict):
        agg = metrics.get("aggregates") or {}
        if isinstance(agg, dict) and agg.get("thc") is not None:
            thc = str(round(float(agg["thc"]), 2))
        if not thc:
            for cb in metrics.get("cannabinoids") or []:
                if isinstance(cb, dict) and cb.get("code") == "thc" and cb.get("value") is not None:
                    thc = str(round(float(cb["value"]), 2))
                    break

    # Price: prices.ounce is a list of tiers; find the 1/8 oz tier first
    price = ""
    prices = item.get("prices") or {}
    if isinstance(prices, dict):
        ounce_tiers = prices.get("ounce") or []
        for tier in ounce_tiers:
            if not isinstance(tier, dict):
                continue
            # units "1/8" or label "1/8 oz"
            if tier.get("units") == "1/8" or "1/8" in str(tier.get("label", "")):
                price = str(tier.get("price", ""))
                break
        if not price and ounce_tiers:
            # fallback: smallest tier by price
            valid = [t for t in ounce_tiers if isinstance(t, dict) and t.get("price")]
            if valid:
                cheapest = min(valid, key=lambda t: float(t.get("price", 999)))
                price = str(cheapest.get("price", ""))
    # Also check top-level price field
    if not price:
        top_price = item.get("price") or {}
        if isinstance(top_price, dict) and top_price.get("price") is not None:
            price = str(top_price["price"])

    return {
        "id": str(item.get("id", "")),
        "name": name,
        "brand": "",          # not in discovery/v1; enriched from wm/v1
        "strain_type": strain_type,
        "thc_pct": thc,
        "price_eighth": price,
        "product_category": product_category,
        "product_type": product_category,  # backwards compat
    }


def _parse_jsonapi_item(item: dict) -> dict | None:
    """
    Parse one item from wm/v1 JSONAPI format.
    { id, type, attributes: { name, brand_name, prices: {price_eighth}, ... } }
    """
    attrs = item.get("attributes") or {}
    if not isinstance(attrs, dict):
        return None

    from scraper.category_map import normalize_category

    # Capture authoritative category from parent_category slug or category_name
    parent_cat_raw = attrs.get("parent_category") or {}
    if isinstance(parent_cat_raw, dict):
        raw_category = (parent_cat_raw.get("slug") or parent_cat_raw.get("name") or "").lower()
    else:
        raw_category = str(parent_cat_raw).lower()
    if not raw_category:
        raw_category = (attrs.get("category_name") or "").lower()
    product_category = normalize_category(raw_category, "weedmaps") if raw_category else "Flower"

    name = (attrs.get("name") or "").strip()
    if not name:
        return None

    brand = (attrs.get("brand_name") or "").strip()

    # THC from cannabinoids — can be a dict {"thc": "19.4"} or a list
    thc = ""
    cannabinoids = attrs.get("cannabinoids")
    if isinstance(cannabinoids, dict):
        val = cannabinoids.get("thc")
        if val is not None:
            try:
                thc = str(round(float(val), 2))
            except (ValueError, TypeError):
                pass
    elif isinstance(cannabinoids, list):
        for cb in cannabinoids:
            if isinstance(cb, dict) and cb.get("cannabinoid_type", "").lower() == "thc":
                val = cb.get("value")
                if val is not None:
                    try:
                        thc = str(round(float(val), 2))
                    except (ValueError, TypeError):
                        pass
                break

    # Price: prices.price_eighth is the 1/8 oz price directly
    price = ""
    prices = attrs.get("prices") or {}
    if isinstance(prices, dict):
        pe = prices.get("price_eighth")
        if pe is not None and float(pe) > 0:
            price = str(pe)

    return {
        "id": str(item.get("id", "")),
        "name": name,
        "brand": brand,
        "strain_type": attrs.get("genetics", ""),
        "thc_pct": thc,
        "price_eighth": price,
        "product_category": product_category,
        "product_type": product_category,  # backwards compat
    }


def _parse_api_response(data: dict | list, slug: str) -> list[dict]:
    """
    Extract flower products from Weedmaps API response.
    Handles two formats:
      - discovery/v1: {meta, data: {menu_items: [...]}}
      - wm/v1 JSONAPI: {data: [{id, type, attributes, ...}]}
    Returns a list of normalised product dicts.
    """
    try:
        if not isinstance(data, dict):
            return []

        inner = data.get("data")

        # discovery/v1 format: data.data.menu_items is a list
        if isinstance(inner, dict) and "menu_items" in inner:
            raw_items = inner["menu_items"] or []
            results = []
            for item in raw_items:
                if isinstance(item, dict):
                    parsed = _parse_discovery_item(item)
                    if parsed:
                        results.append(parsed)
            return results

        # wm/v1 JSONAPI format: data.data is a list of {id, type, attributes}
        if isinstance(inner, list) and inner and isinstance(inner[0], dict) and "attributes" in inner[0]:
            results = []
            for item in inner:
                parsed = _parse_jsonapi_item(item)
                if parsed:
                    results.append(parsed)
            return results

    except Exception as exc:
        log.debug("_parse_api_response error: %s", exc)

    return []


# ── DOM fallback parser ───────────────────────────────────────────────────────

async def _dom_extract_products(page: Page) -> list[dict]:
    """
    Last-resort: extract product data from the rendered DOM.
    Weedmaps product cards vary in structure; we try several selector patterns.
    """
    products = []

    # Wait for at least one product card to appear
    try:
        await page.wait_for_selector(
            '[data-testid="product-card"], [class*="ProductCard"], [class*="product-card"], '
            '[class*="listing-item"], [class*="menu-item"]',
            timeout=10_000,
        )
    except Exception:
        log.debug("DOM: no product cards found")
        return products

    cards = await page.query_selector_all(
        '[data-testid="product-card"], [class*="ProductCard"], [class*="product-card"], '
        '[class*="listing-item"], [class*="menu-item"]'
    )
    log.debug("DOM: found %d product card elements", len(cards))

    for card in cards:
        try:
            # Name — usually in a heading or strong element inside the card
            name_el = await card.query_selector(
                'h3, h4, [class*="name"], [class*="title"], [data-testid*="name"]'
            )
            name = (await name_el.inner_text()).strip() if name_el else ""

            # Brand
            brand_el = await card.query_selector(
                '[class*="brand"], [class*="Brand"], [data-testid*="brand"]'
            )
            brand = (await brand_el.inner_text()).strip() if brand_el else ""

            # THC %
            thc_el = await card.query_selector(
                '[class*="thc"], [class*="THC"], [data-testid*="thc"]'
            )
            thc = ""
            if thc_el:
                thc_raw = await thc_el.inner_text()
                m = re.search(r"(\d+\.?\d*)\s*%", thc_raw)
                thc = m.group(1) if m else thc_raw.replace("%", "").strip()

            # Price
            price_el = await card.query_selector(
                '[class*="price"], [class*="Price"], [data-testid*="price"]'
            )
            price = ""
            if price_el:
                price_raw = await price_el.inner_text()
                m = re.search(r"\$(\d+\.?\d*)", price_raw)
                price = m.group(1) if m else price_raw.replace("$", "").strip()

            if not name:
                continue

            products.append({
                "name": name,
                "brand": brand,
                "thc_pct": thc,
                "price_eighth": price,
                "category": "flower",
                "raw": {},
            })
        except Exception as exc:
            log.debug("DOM card parse error: %s", exc)
            continue

    return products


# ── Core scrape logic ─────────────────────────────────────────────────────────

@async_retry(max_attempts=3, delay=2.0, backoff=2.0, exceptions=(Exception,))
async def scrape_dispensary(
    page: Page, slug: str, name: str, *, timeout: int = PAGE_TIMEOUT
) -> dict:
    """
    Scrape a single Weedmaps dispensary.
    Returns a result dict with products list and metadata.
    """
    url = f"{WEEDMAPS_BASE}/{slug}"
    log.info("Scraping  %s  (%s)", name, slug)

    # Collected API payloads keyed by URL
    api_data: list[dict] = []

    async def capture_response(response: Response):
        if _is_menu_api(response.url):
            try:
                body = await response.json()
                api_data.append({"url": response.url, "body": body})
                log.info("  API hit: %s", response.url[:100])
            except Exception:
                pass
        # Log all XHR/fetch to weedmaps.com so we can identify the right endpoints
        elif "weedmaps.com" in response.url and response.request.resource_type in ("xhr", "fetch"):
            log.debug("  XHR: %s", response.url[:120])

    page.on("response", capture_response)

    result = {
        "slug": slug,
        "name": name,
        "url": url,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "products": [],
        "product_count": 0,
        "method": "unknown",
        "error": None,
    }

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=timeout)

        # Dismiss age gate if present
        await page.wait_for_timeout(1_500)
        await handle_age_gate(page)
        await page.wait_for_timeout(1_000)

        # Navigate to Flower category
        # Try URL approach first (most reliable)
        flower_url = f"{WEEDMAPS_BASE}/{slug}/menu"
        try:
            await page.goto(flower_url, wait_until="domcontentloaded", timeout=10_000)
            await page.wait_for_timeout(1_000)
            await handle_age_gate(page)  # gate may reappear on menu page
        except Exception:
            pass  # stay on main page

        # Try clicking "Flower" tab/filter
        try:
            flower_btn = page.get_by_role("link", name=re.compile("^flower$", re.IGNORECASE))
            if await flower_btn.count() == 0:
                flower_btn = page.get_by_text(re.compile("^flower$", re.IGNORECASE))
            if await flower_btn.count() > 0:
                await flower_btn.first.click(timeout=5_000)
                await page.wait_for_timeout(2_000)
                log.debug("Clicked Flower tab")
        except Exception:
            pass

        # Wait for content (non-fatal — API data captured live via response handler)
        try:
            await page.wait_for_load_state("networkidle", timeout=MENU_TIMEOUT)
        except Exception:
            pass  # page may never reach networkidle; that's fine
        await page.wait_for_timeout(1_500)

        # Scroll to trigger lazy-loading
        prev_height = 0
        for _ in range(15):  # max 15 scroll steps
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(800)
            height = await page.evaluate("document.body.scrollHeight")
            if height == prev_height:
                break
            prev_height = height

        # ── Method 1: API interception ────────────────────────────────────────
        # Separate discovery/v1 items (full data, no brand) from
        # wm/v1 JSONAPI items (has brand_name, used to enrich discovery items).
        by_id: dict[str, dict] = {}   # id -> product dict from discovery/v1
        brand_by_id: dict[str, str] = {}  # id -> brand from wm/v1

        for entry in api_data:
            parsed = _parse_api_response(entry["body"], slug)
            if not parsed:
                continue
            log.debug("API parse: +%d items from %s", len(parsed), entry["url"][:80])
            for p in parsed:
                item_id = p.get("id", "")
                if p.get("brand"):
                    # wm/v1 JSONAPI items have brand; record for enrichment
                    brand_by_id[item_id] = p["brand"]
                    # Also store if not already seen from discovery
                    if item_id not in by_id:
                        by_id[item_id] = p
                else:
                    # discovery/v1 items — prefer these (richer price/thc data)
                    by_id[item_id] = p

        # Enrich discovery items with brand from wm/v1
        for item_id, brand in brand_by_id.items():
            if item_id in by_id and not by_id[item_id].get("brand"):
                by_id[item_id]["brand"] = brand

        all_products = list(by_id.values())

        if all_products:
            result["method"] = "api_intercept"
        else:
            # ── Method 2: DOM fallback ────────────────────────────────────────
            log.info("  No API data captured, falling back to DOM parser")
            all_products = await _dom_extract_products(page)
            result["method"] = "dom" if all_products else "none"

        # Deduplicate by name (case-insensitive) in case same item appears twice
        seen: set[str] = set()
        deduped = []
        for p in all_products:
            key = p["name"].lower().strip()
            if key not in seen:
                seen.add(key)
                deduped.append(p)

        result["products"] = deduped
        result["product_count"] = len(deduped)
        log.info("  %d flower products  (method: %s)", len(deduped), result["method"])

    except Exception as exc:
        result["error"] = str(exc)
        log.warning("  ERROR scraping %s: %s", slug, exc)

    finally:
        page.remove_listener("response", capture_response)

    return result


# ── Save helpers ──────────────────────────────────────────────────────────────

def save_dispensary_result(result: dict) -> Path:
    out_path = RAW_DIR / f"weedmaps_{result['slug']}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    return out_path


# ── Main runner ───────────────────────────────────────────────────────────────

async def run(targets: list[dict], *, headless: bool = True) -> dict:
    """
    Scrape all targets and return a run summary dict.

    targets: list of dispensary dicts with at least 'name' and 'weedmaps' keys
    """
    run_start = time.time()
    run_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    log.info("=" * 60)
    log.info("Weedmaps scrape run  |  %d dispensaries  |  headless=%s", len(targets), headless)
    log.info("=" * 60)

    all_results = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=headless,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )
        # Fresh context + page per dispensary: isolates cookies, localStorage,
        # and response listeners so a bad/rate-limited page can't affect later ones.
        _ctx_kwargs = dict(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
            timezone_id="America/New_York",
        )

        for i, target in enumerate(targets):
            slug = target["weedmaps"]
            name = target.get("name", slug)

            context = await browser.new_context(**_ctx_kwargs)
            page = await context.new_page()
            try:
                result = await scrape_dispensary(page, slug, name)
            finally:
                await context.close()

            all_results.append(result)

            # Save individual result immediately
            save_dispensary_result(result)

            # Pause between dispensaries (except after last)
            if i < len(targets) - 1:
                await asyncio.sleep(INTER_PAGE_DELAY)

        await browser.close()

    # ── Run summary ───────────────────────────────────────────────────────────
    elapsed = time.time() - run_start
    succeeded = [r for r in all_results if not r["error"] and r["product_count"] > 0]
    failed = [r for r in all_results if r["error"]]
    empty = [r for r in all_results if not r["error"] and r["product_count"] == 0]
    total_products = sum(r["product_count"] for r in all_results)

    summary = {
        "run_timestamp": run_ts,
        "elapsed_seconds": round(elapsed, 1),
        "total_dispensaries": len(targets),
        "succeeded": len(succeeded),
        "empty": len(empty),
        "failed": len(failed),
        "total_products": total_products,
        "results": [
            {
                "slug": r["slug"],
                "name": r["name"],
                "product_count": r["product_count"],
                "method": r["method"],
                "error": r["error"],
            }
            for r in all_results
        ],
    }

    summary_path = RAW_DIR / f"weedmaps_run_{run_ts}.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    log.info("")
    log.info("=" * 60)
    log.info("Run complete  |  %.0fs elapsed", elapsed)
    log.info("  Dispensaries : %d total", len(targets))
    log.info("  With data    : %d", len(succeeded))
    log.info("  Empty        : %d", len(empty))
    log.info("  Errors       : %d", len(failed))
    log.info("  Products     : %d", total_products)
    log.info("  Summary      : %s", summary_path)
    log.info("=" * 60)

    if failed:
        log.warning("Failed dispensaries:")
        for r in failed:
            log.warning("  %s  —  %s", r["slug"], r["error"])

    if empty:
        log.info("Empty (no products found):")
        for r in empty:
            log.info("  %s  (method: %s)", r["slug"], r["method"])

    return summary


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args():
    p = argparse.ArgumentParser(description="Scrape Weedmaps dispensary menus")
    mode = p.add_mutually_exclusive_group()
    mode.add_argument(
        "--test",
        action="store_true",
        help="Test mode: scrape first 3 Weedmaps dispensaries only",
    )
    mode.add_argument(
        "--slugs",
        metavar="SLUG1,SLUG2",
        help="Comma-separated list of specific Weedmaps slugs to scrape",
    )
    p.add_argument(
        "--headed",
        action="store_true",
        help="Show browser window (useful for debugging age gates)",
    )
    return p.parse_args()


def main():
    args = _parse_args()

    # Import here to avoid circular imports when running as a module
    from scraper.targets import get_weedmaps_targets
    all_targets = get_weedmaps_targets()

    if args.slugs:
        wanted = {s.strip() for s in args.slugs.split(",")}
        # Match against existing targets first
        targets = [t for t in all_targets if t["weedmaps"] in wanted]
        matched_slugs = {t["weedmaps"] for t in targets}
        # For slugs not in the targets file, create ad-hoc target entries
        for slug in wanted - matched_slugs:
            # Generate a display name from the slug
            display_name = slug.replace("-", " ").title()
            targets.append({
                "name": display_name,
                "city": "",
                "weedmaps": slug,
                "urls": [f"https://weedmaps.com/dispensaries/{slug}"],
            })
        if not targets:
            log.error("No slugs provided")
            sys.exit(1)
    elif args.test:
        targets = all_targets[:3]
        log.info("TEST MODE — scraping %d dispensaries: %s",
                 len(targets), [t["weedmaps"] for t in targets])
    else:
        targets = all_targets

    asyncio.run(run(targets, headless=not args.headed))


if __name__ == "__main__":
    main()
