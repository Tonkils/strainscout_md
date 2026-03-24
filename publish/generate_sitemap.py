#!/usr/bin/env python3
"""
generate_sitemap.py — Pre-build sitemap generator for StrainScout MD

Reads the latest catalog JSON from data/output/ and generates:
  - web_2/public/sitemap.xml   (comprehensive XML sitemap)
  - web_2/public/robots.txt    (production robots.txt)

Run before `next build`:
    python -m publish.generate_sitemap
    cd web_2 && npm run build

Static pages included:
  / /compare /cheapest /map /alerts /market /dispensaries
  /strain/[id]       — one URL per strain
  /dispensary/[slug] — one URL per dispensary
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE / "data" / "output"
PUBLIC_DIR = BASE / "web_2" / "public"

SITE_URL = "https://strainscoutmd.com"

STATIC_PAGES = [
    ("/",             "1.0",  "daily"),
    ("/compare",      "0.9",  "daily"),
    ("/cheapest",     "0.9",  "daily"),
    ("/map",          "0.8",  "weekly"),
    ("/alerts",       "0.6",  "monthly"),
    ("/market",       "0.8",  "weekly"),
    ("/dispensaries", "0.8",  "weekly"),
]


def slugify(name: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", name.lower()))


def load_latest_catalog() -> list[dict]:
    catalogs = list(OUTPUT_DIR.glob("strainscout_catalog_v*.min.json"))
    if not catalogs:
        # Fall back to public/data/ (already-deployed copy)
        fallback = BASE / "web_2" / "public" / "data" / "strainscout_catalog_v10.min.json"
        if fallback.exists():
            return json.loads(fallback.read_text(encoding="utf-8"))
        print("ERROR: No catalog JSON found. Run the scraper pipeline first.", file=sys.stderr)
        sys.exit(1)

    def version_key(p: Path) -> int:
        m = re.search(r"_v(\d+)", p.name)
        return int(m.group(1)) if m else 0

    catalogs.sort(key=version_key)
    latest = catalogs[-1]
    print(f"  Using catalog: {latest.name}")
    return json.loads(latest.read_text(encoding="utf-8"))


def build_sitemap(strains: list[dict]) -> str:
    today = date.today().isoformat()
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']

    def url(loc: str, priority: str, changefreq: str, lastmod: str = today) -> list[str]:
        return [
            "  <url>",
            f"    <loc>{SITE_URL}{loc}</loc>",
            f"    <lastmod>{lastmod}</lastmod>",
            f"    <changefreq>{changefreq}</changefreq>",
            f"    <priority>{priority}</priority>",
            "  </url>",
        ]

    for path, priority, changefreq in STATIC_PAGES:
        lines.extend(url(path, priority, changefreq))

    # Strain pages
    dispensaries_seen: set[str] = set()
    for strain in strains:
        strain_id = strain.get("id", "")
        if not strain_id:
            continue
        last_verified = strain.get("last_verified") or today
        if len(last_verified) > 10:
            last_verified = last_verified[:10]
        lines.extend(url(f"/strain/{strain_id}", "0.7", "weekly", last_verified))

        for disp in strain.get("dispensaries", []):
            dispensaries_seen.add(disp)

    # Dispensary pages
    for disp_name in sorted(dispensaries_seen):
        slug = slugify(disp_name)
        if slug:
            lines.extend(url(f"/dispensary/{slug}", "0.6", "weekly"))

    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def build_robots() -> str:
    return f"""User-agent: *
Allow: /

Sitemap: {SITE_URL}/sitemap.xml
"""


def main():
    print("=" * 60)
    print("SITEMAP GENERATOR")
    print("=" * 60)

    strains = load_latest_catalog()
    print(f"  Loaded {len(strains)} strains")

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    sitemap = build_sitemap(strains)
    sitemap_path = PUBLIC_DIR / "sitemap.xml"
    sitemap_path.write_text(sitemap, encoding="utf-8")

    # Count URLs
    url_count = sitemap.count("<url>")
    print(f"  sitemap.xml written: {url_count} URLs -> {sitemap_path}")

    robots = build_robots()
    robots_path = PUBLIC_DIR / "robots.txt"
    robots_path.write_text(robots, encoding="utf-8")
    print(f"  robots.txt written -> {robots_path}")

    print("\nDone. Run 'cd web_2 && npm run build' next.")


if __name__ == "__main__":
    main()
