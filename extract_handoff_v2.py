#!/usr/bin/env python3
"""
Extract source code files from Manus handoff markdown documents.
V2: Better parsing — splits on ## headers and extracts each code block.
"""

import re
import os
from pathlib import Path

BASE = Path(__file__).resolve().parent
MANUS_DIR = BASE / "Manus MD Files"
WEB_DIR = BASE / "web"

SKIP_PATTERNS = ["_core/", "components/ui/"]

HANDOFF_FILES = [
    "handoff_01_server_layer.md",
    "handoff_02_schema_and_config.md",
    "handoff_03_frontend_core.md",
    "handoff_04_frontend_components.md",
    "handoff_05_frontend_pages_1.md",
    "handoff_06_frontend_pages_2.md",
    "handoff_07_test_files.md",
    "StrainScout MD — Complete Source Code Handoff for Claude (1).md",
    "StrainScout MD — Complete Source Code Handoff for Claude.md",
]


def extract_from_markdown(md_path: Path) -> list[tuple[str, str]]:
    """Split markdown by ## headers, find filepath in header, extract first code block."""
    with open(md_path, encoding="utf-8") as f:
        content = f.read()

    files = []

    # Split into sections by ## headers
    sections = re.split(r'^(##\s+)', content, flags=re.MULTILINE)

    # Reconstruct sections
    full_sections = []
    for i in range(1, len(sections), 2):
        if i + 1 < len(sections):
            full_sections.append(sections[i] + sections[i + 1])

    for section in full_sections:
        # Look for filepath in the section header
        # Pattern: ## N. `filepath`
        m = re.match(r'##\s+\d+\.\s+`([^`]+\.(?:ts|tsx|js|jsx|json|css|html|mjs))`', section)
        if not m:
            # Also try: ## filepath or ## `filepath`
            m = re.match(r'##\s+`?([^\n`]+\.(?:ts|tsx|js|jsx|json|css|html|mjs))`?', section)

        if not m:
            continue

        filepath = m.group(1).strip()

        # Skip _core and ui
        if any(skip in filepath for skip in SKIP_PATTERNS):
            continue

        # Find the first code block in this section
        code_match = re.search(r'```\w*\n(.*?)\n```', section, re.DOTALL)
        if not code_match:
            continue

        code = code_match.group(1)

        # Sanity check: code should be substantial
        if len(code.strip()) < 10:
            continue

        files.append((filepath, code))

    return files


def main():
    print("=" * 70)
    print("EXTRACTING SOURCE CODE FROM MANUS HANDOFF DOCS (v2)")
    print("=" * 70)

    all_files = {}  # filepath -> code (dedup, keep largest)

    for filename in HANDOFF_FILES:
        md_path = MANUS_DIR / filename
        if not md_path.exists():
            print(f"SKIP (not found): {filename}")
            continue

        files = extract_from_markdown(md_path)
        print(f"{filename}: {len(files)} files")
        for fp, code in files:
            if fp in all_files:
                if len(code) > len(all_files[fp]):
                    print(f"  UPDATE: {fp} ({len(all_files[fp])} → {len(code)} chars)")
                    all_files[fp] = code
                else:
                    print(f"  SKIP (dup): {fp}")
            else:
                all_files[fp] = code
                print(f"  NEW: {fp} ({len(code)} chars)")

    print(f"\nTotal unique files: {len(all_files)}")

    # Write files
    written = 0
    for filepath, code in sorted(all_files.items()):
        out_path = WEB_DIR / filepath
        out_path.parent.mkdir(parents=True, exist_ok=True)

        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(code)
            if not code.endswith("\n"):
                f.write("\n")

        written += 1

    print(f"\nWritten {written} files to {WEB_DIR}")

    # Show directory tree
    print("\nProject structure:")
    for filepath in sorted(all_files.keys()):
        print(f"  {filepath}")


if __name__ == "__main__":
    main()
