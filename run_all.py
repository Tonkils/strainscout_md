#!/usr/bin/env python3
"""
StrainScout MD — Master Pipeline Orchestrator

Runs all pipeline steps in order:
  Phase 1: SCRAPE (optional, use --scrape)
    1a. Weedmaps scraper (~57 dispensaries)
    1b. Dutchie white-label scraper (~16 dispensaries)
    1c. Jane/iHeartJane scraper (~9 dispensaries)
    1d. Ascend/Dutchie API scraper (4 dispensaries)
    1e. Trulieve SSR scraper (3 dispensaries)
    1f. Curaleaf scraper (4 dispensaries)
    1g. Zen Leaf/Sweed scraper (4 dispensaries)
    1h. SweedPOS scraper (3 dispensaries)
    1i. Verilife/Jane scraper (3 dispensaries)

  Phase 2: PROCESS (always runs)
    2. parse_raw     — Parse raw scrape files from ALL platforms
    3. enrich_leafly — Enrich with Leafly type/terpenes/effects
    4. deduplicate   — Merge duplicate strain entries
    5. build_catalog — Assemble final production JSON

  Phase 3: PUBLISH (optional, use --publish)
    6. upload_ionos  — Upload catalog to IONOS webspace via SFTP

Usage:
    python run_all.py                     # Process pipeline only (steps 2-5)
    python run_all.py --scrape            # Scrape + process (steps 1-5)
    python run_all.py --publish           # Process + publish (steps 2-6)
    python run_all.py --scrape --publish  # Full pipeline (steps 1-6)
    python run_all.py --from=3            # Start from step 3
    python run_all.py --scrape-only       # Run scrapers only, no processing
"""

import sys
import os
import time
import asyncio
import argparse
import traceback
from datetime import datetime, timezone
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))


# ── Scraper runners ──────────────────────────────────────────────────────────

SCRAPERS = [
    ("Weedmaps",              "scraper.scrape_weedmaps"),
    ("Dutchie White-label",   "scraper.scrape_dutchie_whitelabel"),
    ("Jane/iHeartJane",       "scraper.scrape_jane"),
    ("Ascend (Dutchie API)",  "scraper.scrape_ascend"),
    ("Trulieve",              "scraper.scrape_trulieve"),
    ("Curaleaf",              "scraper.scrape_curaleaf"),
    ("Zen Leaf (Sweed)",      "scraper.scrape_zenleaf"),
    ("SweedPOS",              "scraper.scrape_sweedpos"),
]


async def run_scraper(name: str, module: str) -> dict:
    """Run a single scraper as a subprocess. Returns result dict."""
    start = time.time()

    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-B", "-X", "utf8", "-m", module,
            cwd=str(BASE),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=1800)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            elapsed = time.time() - start
            print(f"  {name}: TIMEOUT after {elapsed:.0f}s")
            return {"name": name, "status": "timeout", "dispensaries": 0, "products": 0, "elapsed": round(elapsed)}

        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
        elapsed = time.time() - start

        # Extract product count from output
        products = 0
        dispensaries = 0
        for line in stdout.split("\n"):
            if "Products" in line and ":" in line:
                try:
                    products = int(line.split(":")[-1].strip())
                except ValueError:
                    pass
            if "With data" in line and ":" in line:
                try:
                    dispensaries = int(line.split(":")[-1].strip())
                except ValueError:
                    pass

        status = "success" if proc.returncode == 0 else "error"
        print(f"  ✓ {name}: {dispensaries} dispensaries, {products} products ({elapsed:.0f}s) [{status}]")

        if proc.returncode != 0 and stderr:
            # Print last 3 lines of stderr for debugging
            err_lines = [l for l in stderr.strip().split("\n") if l.strip()]
            for line in err_lines[-3:]:
                print(f"    STDERR [{name}]: {line}")

        return {
            "name": name,
            "status": status,
            "dispensaries": dispensaries,
            "products": products,
            "elapsed": round(elapsed),
        }

    except Exception as e:
        elapsed = time.time() - start
        print(f"  {name}: ERROR — {e}")
        return {"name": name, "status": "error", "dispensaries": 0, "products": 0, "elapsed": round(elapsed)}


async def run_all_scrapers() -> list[dict]:
    """Run all scrapers in parallel."""
    print(f"\n{'#'*70}")
    print(f"# PHASE 1: SCRAPE ALL SOURCES (parallel)")
    print(f"{'#'*70}")

    tasks = []
    skipped = []
    for name, module in SCRAPERS:
        try:
            __import__(module.rsplit(".", 1)[0])
            tasks.append(run_scraper(name, module))
        except ImportError:
            print(f"\n  → {name} — SKIPPED (module not found: {module})")
            skipped.append({"name": name, "status": "skipped", "dispensaries": 0, "products": 0, "elapsed": 0})

    print(f"\n  Launching {len(tasks)} scrapers in parallel...\n")
    results = list(await asyncio.gather(*tasks)) + skipped

    # Summary
    total_disps = sum(r["dispensaries"] for r in results)
    total_prods = sum(r["products"] for r in results)
    wall_time = max((r["elapsed"] for r in results), default=0)
    successes = sum(1 for r in results if r["status"] == "success")

    print(f"\n  Scrape Summary: {successes}/{len(results)} scrapers succeeded")
    print(f"  Total: {total_disps} dispensaries, {total_prods} products in {wall_time}s (wall clock)")

    return results


# ── Pipeline step runner ─────────────────────────────────────────────────────

def run_pipeline_step(step_num: int, name: str, module_path: str) -> bool:
    """Run a single pipeline step. Returns True on success."""
    print(f"\n{'#'*70}")
    print(f"# STEP {step_num}: {name}")
    print(f"{'#'*70}\n")

    start = time.time()
    try:
        parts = module_path.split(".")
        mod = __import__(module_path, fromlist=[parts[-1]])
        mod.main()
        elapsed = time.time() - start
        print(f"\n✓ Step {step_num} completed in {elapsed:.1f}s")
        return True
    except Exception as e:
        elapsed = time.time() - start
        print(f"\n✗ Step {step_num} FAILED after {elapsed:.1f}s: {e}")
        traceback.print_exc()
        return False


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="StrainScout MD — Full Pipeline")
    parser.add_argument("--scrape", action="store_true",
                        help="Run all scrapers before processing")
    parser.add_argument("--scrape-only", action="store_true",
                        help="Run scrapers only, skip processing and publishing")
    parser.add_argument("--publish", action="store_true",
                        help="Upload catalog to IONOS after processing")
    parser.add_argument("--from", dest="from_step", type=int, default=2,
                        help="Start from this processing step (2-5)")
    args = parser.parse_args()

    print("=" * 70)
    print("  StrainScout MD — Data Pipeline")
    print(f"  Started: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  Mode: {'scrape + ' if args.scrape else ''}process{' + publish' if args.publish else ''}")
    print("=" * 70)

    total_start = time.time()
    results = {}

    # ── Phase 1: Scrape ──
    if args.scrape or args.scrape_only:
        scrape_results = asyncio.run(run_all_scrapers())
        results["scrape"] = scrape_results

        if args.scrape_only:
            total_elapsed = time.time() - total_start
            print(f"\n{'='*70}")
            print(f"  Scrape-only mode complete in {total_elapsed:.0f}s")
            print(f"{'='*70}")
            return 0

    # ── Phase 2: Process ──
    pipeline_steps = [
        (2, "Parse Raw Scrape Data",       "pipeline.parse_raw"),
        (3, "Enrich with Leafly Data",      "pipeline.enrich_leafly"),
        (4, "Deduplicate Strains",          "pipeline.deduplicate"),
        (5, "Build Production Catalog",     "pipeline.build_catalog"),
    ]

    for step_num, name, module in pipeline_steps:
        if step_num < args.from_step:
            print(f"\nSkipping step {step_num}: {name}")
            results[step_num] = "skipped"
            continue

        success = run_pipeline_step(step_num, name, module)
        results[step_num] = "success" if success else "failed"

        if not success:
            print(f"\n{'!'*70}")
            print(f"! PIPELINE HALTED at step {step_num}: {name}")
            print(f"{'!'*70}")
            break

    # ── Phase 3: Publish ──
    if args.publish and results.get(5) == "success":
        success = run_pipeline_step(6, "Upload to IONOS", "publish.upload_ionos")
        results[6] = "success" if success else "failed"

    # ── Summary ──
    total_elapsed = time.time() - total_start

    print(f"\n{'='*70}")
    print("  PIPELINE SUMMARY")
    print(f"{'='*70}")
    print(f"  Total time: {total_elapsed:.0f}s ({total_elapsed/60:.1f}m)")

    if "scrape" in results:
        scrape_r = results["scrape"]
        ok = sum(1 for r in scrape_r if r["status"] == "success")
        prods = sum(r["products"] for r in scrape_r)
        print(f"  Phase 1 (Scrape): {ok}/{len(scrape_r)} scrapers, {prods} products")

    for step_num, name, _ in pipeline_steps:
        status = results.get(step_num, "not_run")
        icon = {"success": "✓", "failed": "✗", "skipped": "—"}.get(status, "?")
        print(f"  {icon} Step {step_num}: {name} [{status}]")

    if 6 in results:
        icon = "✓" if results[6] == "success" else "✗"
        print(f"  {icon} Step 6: Upload to IONOS [{results[6]}]")

    # Check for failures
    failed = [n for n, s in results.items() if isinstance(n, int) and s == "failed"]
    if failed:
        print(f"\n  ✗ Pipeline had failures at step(s): {failed}")
        return 1

    print(f"\n  ✓ Pipeline completed successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
