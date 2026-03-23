#!/usr/bin/env python3
"""
StrainScout MD — Master Pipeline Orchestrator

Runs all pipeline steps in order:
  1. parse_raw     — Parse raw Weedmaps scrape files
  2. enrich_leafly — Enrich with Leafly type/terpenes/effects data
  3. deduplicate   — Merge duplicate strain entries
  4. build_catalog — Assemble final production JSON
  5. upload_s3     — Upload to AWS S3 (optional, skipped if no credentials)

Usage:
    python run_all.py               # Run full pipeline
    python run_all.py --skip-upload # Run pipeline without S3 upload
    python run_all.py --from=3      # Start from step 3 (deduplicate)
"""

import sys
import os
import time
import argparse
import traceback
from datetime import datetime, timezone
from pathlib import Path

# Fix Windows console encoding for Unicode output
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE = Path(__file__).resolve().parent

# Add project root to path so we can import pipeline modules
sys.path.insert(0, str(BASE))


def run_step(step_num: int, name: str, module_path: str, skip_upload: bool = False) -> bool:
    """Run a single pipeline step. Returns True on success."""
    if step_num == 5 and skip_upload:
        print(f"\n{'='*70}")
        print(f"STEP {step_num}: {name} — SKIPPED (--skip-upload)")
        print(f"{'='*70}")
        return True

    print(f"\n{'#'*70}")
    print(f"# STEP {step_num}: {name}")
    print(f"{'#'*70}\n")

    start = time.time()
    try:
        # Dynamic import
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


def main():
    parser = argparse.ArgumentParser(description="StrainScout MD Pipeline")
    parser.add_argument("--skip-upload", action="store_true",
                        help="Skip S3 upload step")
    parser.add_argument("--from", dest="from_step", type=int, default=1,
                        help="Start from this step number (1-5)")
    args = parser.parse_args()

    steps = [
        (1, "Parse Raw Scrape Data",       "pipeline.parse_raw"),
        (2, "Enrich with Leafly Data",      "pipeline.enrich_leafly"),
        (3, "Deduplicate Strains",          "pipeline.deduplicate"),
        (4, "Build Production Catalog",     "pipeline.build_catalog"),
        (5, "Upload to S3",                 "publish.upload_s3"),
    ]

    print("=" * 70)
    print("  StrainScout MD — Data Pipeline")
    print(f"  Started: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 70)

    total_start = time.time()
    results = {}

    for step_num, name, module in steps:
        if step_num < args.from_step:
            print(f"\nSkipping step {step_num}: {name}")
            results[step_num] = "skipped"
            continue

        success = run_step(step_num, name, module, skip_upload=args.skip_upload)
        results[step_num] = "success" if success else "failed"

        if not success and step_num < 5:
            # Pipeline steps 1-4 are critical; step 5 (upload) is optional
            print(f"\n{'!'*70}")
            print(f"! PIPELINE HALTED at step {step_num}: {name}")
            print(f"{'!'*70}")
            break

    total_elapsed = time.time() - total_start

    # Summary
    print(f"\n{'='*70}")
    print("  PIPELINE SUMMARY")
    print(f"{'='*70}")
    print(f"  Total time: {total_elapsed:.1f}s")
    for step_num, name, _ in steps:
        status = results.get(step_num, "not_run")
        icon = {"success": "✓", "failed": "✗", "skipped": "—"}.get(status, "?")
        print(f"  {icon} Step {step_num}: {name} [{status}]")

    # Check for critical failures
    failed = [n for n, s in results.items() if s == "failed" and n <= 4]
    if failed:
        print(f"\n  ✗ Pipeline FAILED at step(s): {failed}")
        return 1

    print(f"\n  ✓ Pipeline completed successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
