#!/usr/bin/env python3
"""
pipeline/validate.py — Schema validation at each pipeline stage boundary.

Each validator takes the loaded JSON dict, returns a list of error strings.
Empty list = valid.  Call abort_if_invalid() to halt with a clear message.

No external dependencies — stdlib only.
"""

import sys


class ValidationError(Exception):
    """Raised when a pipeline file fails schema validation."""


def _require_keys(d: dict, keys: list, context: str) -> list:
    return [f"{context}: missing required key '{k}'" for k in keys if k not in d]


# ── Per-stage validators ──────────────────────────────────────────────────────

def validate_raw_file(data: dict, path: str = "") -> list:
    """
    Validate a single raw scrape file (data/raw/<platform>_<slug>.json).
    Called per-file in parse_raw; keeps scrape bugs from silently propagating.
    """
    label = path or "raw file"
    errors = _require_keys(data, ["slug", "products"], label)
    if errors:
        return errors

    products = data.get("products")
    if not isinstance(products, list):
        return [f"{label}: 'products' must be a list, got {type(products).__name__}"]

    # Spot-check first 5 products — full scan would be too slow on large files
    for i, p in enumerate(products[:5]):
        if not isinstance(p, dict):
            errors.append(f"{label}: products[{i}] must be a dict, got {type(p).__name__}")
        elif not p.get("name"):
            errors.append(f"{label}: products[{i}] missing 'name' field")

    return errors


def validate_parsed(data: dict) -> list:
    """
    Validate parse_raw output (data/processed/parsed_strains.json).
    This is the input to enrich_leafly.
    """
    errors = _require_keys(data, ["metadata", "records"], "parsed_strains.json")
    if errors:
        return errors

    records = data["records"]
    if not isinstance(records, list):
        return [f"parsed_strains.json: 'records' must be a list, got {type(records).__name__}"]
    if not records:
        return ["parsed_strains.json: 'records' is empty — did parse_raw produce no output?"]

    required = ["strain_name", "dispensary", "source_platform", "product_category"]
    for i, r in enumerate(records[:10]):
        if not isinstance(r, dict):
            errors.append(f"records[{i}]: must be a dict")
            continue
        for k in required:
            if k not in r:
                errors.append(f"records[{i}]: missing required field '{k}'")
        if "strain_name" in r and not isinstance(r["strain_name"], str):
            errors.append(f"records[{i}]: 'strain_name' must be a string")

    return errors


def validate_enriched(data: dict) -> list:
    """
    Validate enrich_leafly output (data/processed/enriched_strains.json).
    This is the input to deduplicate.
    """
    errors = _require_keys(data, ["metadata", "records"], "enriched_strains.json")
    if errors:
        return errors

    records = data["records"]
    if not isinstance(records, list):
        return [f"enriched_strains.json: 'records' must be a list, got {type(records).__name__}"]
    if not records:
        return ["enriched_strains.json: 'records' is empty"]

    required = ["strain_name", "dispensary", "product_category"]
    list_fields = ["terpenes", "effects", "flavors"]
    for i, r in enumerate(records[:10]):
        if not isinstance(r, dict):
            errors.append(f"records[{i}]: must be a dict")
            continue
        for k in required:
            if k not in r:
                errors.append(f"records[{i}]: missing required field '{k}'")
        for lf in list_fields:
            if lf in r and not isinstance(r[lf], list):
                errors.append(
                    f"records[{i}]: '{lf}' must be a list, got {type(r[lf]).__name__}"
                )

    return errors


def validate_deduped(data: dict) -> list:
    """
    Validate deduplicate output (data/processed/deduped_strains.json).
    This is the input to build_catalog.
    """
    errors = _require_keys(data, ["metadata", "strains"], "deduped_strains.json")
    if errors:
        return errors

    strains = data["strains"]
    if not isinstance(strains, list):
        return [f"deduped_strains.json: 'strains' must be a list, got {type(strains).__name__}"]
    if not strains:
        return ["deduped_strains.json: 'strains' is empty"]

    required = ["id", "name", "type", "product_category", "prices", "dispensaries"]
    list_fields = ["terpenes", "effects", "flavors", "prices", "dispensaries"]
    for i, s in enumerate(strains[:10]):
        if not isinstance(s, dict):
            errors.append(f"strains[{i}]: must be a dict")
            continue
        label = s.get("name", f"index {i}")
        for k in required:
            if k not in s:
                errors.append(f"strains['{label}']: missing required field '{k}'")
        for lf in list_fields:
            if lf in s and not isinstance(s[lf], list):
                errors.append(
                    f"strains['{label}']: '{lf}' must be a list, got {type(s[lf]).__name__}"
                )

    return errors


# ── Helper ────────────────────────────────────────────────────────────────────

def abort_if_invalid(errors: list, step_name: str) -> None:
    """Print all validation errors and sys.exit(1) if any exist."""
    if not errors:
        return
    print(f"\n{'!'*70}")
    print(f"! VALIDATION FAILED — {step_name}")
    print(f"{'!'*70}")
    for err in errors:
        print(f"  ✗ {err}")
    print(f"\n  Fix the upstream step and re-run.")
    print(f"{'!'*70}\n")
    sys.exit(1)
