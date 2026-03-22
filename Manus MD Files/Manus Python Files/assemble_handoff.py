#!/usr/bin/env python3
"""
Assemble all StrainScout MD source files into handoff documents for Claude.
Reads the parallel-processed JSON results and the manually-read files,
then writes organized markdown documents with full file contents.
"""

import json
import os

PROJECT_ROOT = "/home/ubuntu/strainscout-md"

# Define the document structure - files grouped by layer
DOCUMENTS = {
    "01_server_layer": {
        "title": "StrainScout MD — Server Layer Source Code",
        "description": "All server-side source files: tRPC routers, database helpers, market data engine, alert engine, profanity filter, sitemap, and storage.",
        "files": [
            "server/routers.ts",
            "server/db.ts",
            "server/marketData.ts",
            "server/alertTriggerEngine.ts",
            "server/profanityFilter.ts",
            "server/sitemap.ts",
            "server/storage.ts",
            "server/index.ts",
        ]
    },
    "02_schema_and_config": {
        "title": "StrainScout MD — Database Schema, Shared Types, and Configuration",
        "description": "Database schema definitions, shared constants/types, and all project configuration files.",
        "files": [
            "drizzle/schema.ts",
            "drizzle/relations.ts",
            "shared/const.ts",
            "shared/types.ts",
            "package.json",
            "tsconfig.json",
            "tsconfig.node.json",
            "vite.config.ts",
            "vitest.config.ts",
            "drizzle.config.ts",
            "components.json",
            "client/index.html",
            ".gitignore",
            ".prettierrc",
            ".prettierignore",
        ]
    },
    "03_frontend_core": {
        "title": "StrainScout MD — Frontend Core (App, Main, Hooks, Lib, Data)",
        "description": "App entry point, routing, tRPC client setup, all custom hooks, analytics, theme context, and the static catalog data.",
        "files": [
            "client/src/App.tsx",
            "client/src/main.tsx",
            "client/src/const.ts",
            "client/src/index.css",
            "client/src/lib/analytics.ts",
            "client/src/lib/trpc.ts",
            "client/src/lib/utils.ts",
            "client/src/contexts/ThemeContext.tsx",
            "client/src/data/strains.ts",
            "client/src/hooks/useCatalog.ts",
            "client/src/hooks/useComposition.ts",
            "client/src/hooks/useDispensaryDirectory.ts",
            "client/src/hooks/useDriveTime.ts",
            "client/src/hooks/useEmailCapture.ts",
            "client/src/hooks/useMobile.tsx",
            "client/src/hooks/usePersistFn.ts",
        ]
    },
    "04_frontend_components": {
        "title": "StrainScout MD — Frontend Components",
        "description": "All reusable UI components: navigation, footer, cards, badges, voting, comments, modals, error boundary.",
        "files": [
            "client/src/components/Navbar.tsx",
            "client/src/components/Footer.tsx",
            "client/src/components/DealCard.tsx",
            "client/src/components/DealDigestBanner.tsx",
            "client/src/components/PriceAlertSignup.tsx",
            "client/src/components/PriceAlertModal.tsx",
            "client/src/components/StrainVoting.tsx",
            "client/src/components/StrainComments.tsx",
            "client/src/components/PartnerVerifiedBadge.tsx",
            "client/src/components/VerificationBadge.tsx",
            "client/src/components/CompareInlineCTA.tsx",
            "client/src/components/SEO.tsx",
            "client/src/components/ErrorBoundary.tsx",
            "client/src/components/ManusDialog.tsx",
            "client/src/components/Map.tsx",
            "client/src/components/AIChatBox.tsx",
            "client/src/components/DashboardLayout.tsx",
            "client/src/components/DashboardLayoutSkeleton.tsx",
        ]
    },
    "05_frontend_pages_1": {
        "title": "StrainScout MD — Frontend Pages Part 1 (Home, Compare, Map, Strain Detail, Dispensaries)",
        "description": "Core user-facing pages: landing page, strain comparison, map view, strain detail, dispensary directory and detail.",
        "files": [
            "client/src/pages/Home.tsx",
            "client/src/pages/CompareStrains.tsx",
            "client/src/pages/MapView.tsx",
            "client/src/pages/StrainDetail.tsx",
            "client/src/pages/DispensaryDirectory.tsx",
            "client/src/pages/DispensaryDetail.tsx",
            "client/src/pages/DispensaryCompare.tsx",
        ]
    },
    "06_frontend_pages_2": {
        "title": "StrainScout MD — Frontend Pages Part 2 (Deals, Alerts, Market, TopValue, Partner, Admin)",
        "description": "Feature pages: deals feed, price alerts, market dashboard, top value, partner portal, admin pages, account.",
        "files": [
            "client/src/pages/Deals.tsx",
            "client/src/pages/Alerts.tsx",
            "client/src/pages/MarketDashboard.tsx",
            "client/src/pages/TopValue.tsx",
            "client/src/pages/PartnerPortal.tsx",
            "client/src/pages/AdminPartners.tsx",
            "client/src/pages/Moderation.tsx",
            "client/src/pages/Account.tsx",
            "client/src/pages/NotFound.tsx",
            "client/src/pages/ComponentShowcase.tsx",
        ]
    },
    "07_test_files": {
        "title": "StrainScout MD — Test Files (218 tests, all passing)",
        "description": "All vitest test files covering server-side logic: partners, comments, votes, alerts, deals, market data, dispensary compare, email signup, price drops.",
        "files": [
            "server/partners.test.ts",
            "server/comments.test.ts",
            "server/votes.test.ts",
            "server/alerts.test.ts",
            "server/alertTriggerEngine.test.ts",
            "server/marketData.test.ts",
            "server/marketDashboard.test.ts",
            "server/deals.test.ts",
            "server/dispensaryCompare.test.ts",
            "server/emailSignup.test.ts",
            "server/priceDrops.test.ts",
            "server/auth.logout.test.ts",
        ]
    },
}

def read_file(filepath):
    """Read a file from the project directory."""
    full_path = os.path.join(PROJECT_ROOT, filepath)
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"ERROR: Could not read {filepath}: {e}"

def get_extension(filepath):
    """Get the language identifier for code fences."""
    ext = os.path.splitext(filepath)[1]
    mapping = {
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.json': 'json',
        '.css': 'css',
        '.html': 'html',
        '.sql': 'sql',
    }
    return mapping.get(ext, '')

def write_document(doc_key, doc_info):
    """Write a single handoff document."""
    output_path = f"/home/ubuntu/handoff_{doc_key}.md"
    
    lines = []
    lines.append(f"# {doc_info['title']}")
    lines.append("")
    lines.append(f"**Handoff Document for Claude Code Review**")
    lines.append(f"**Date:** March 16, 2026 | **Sprint:** 14 | **Checkpoint:** 6570492f")
    lines.append("")
    lines.append(f"> {doc_info['description']}")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # Table of contents
    lines.append("## Files in This Document")
    lines.append("")
    for i, filepath in enumerate(doc_info['files'], 1):
        content = read_file(filepath)
        line_count = len(content.split('\n'))
        lines.append(f"{i}. `{filepath}` ({line_count} lines)")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # File contents
    for i, filepath in enumerate(doc_info['files'], 1):
        content = read_file(filepath)
        lang = get_extension(filepath)
        line_count = len(content.split('\n'))
        
        lines.append(f"## {i}. `{filepath}`")
        lines.append("")
        lines.append(f"**Lines:** {line_count}")
        lines.append("")
        lines.append(f"```{lang}")
        lines.append(content)
        if not content.endswith('\n'):
            lines.append("")
        lines.append("```")
        lines.append("")
        lines.append("---")
        lines.append("")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    line_total = len('\n'.join(lines).split('\n'))
    print(f"  Written: {output_path} ({line_total} lines)")
    return output_path

# Main
print("Assembling handoff documents...")
print()

all_paths = []
total_source_lines = 0

for doc_key, doc_info in DOCUMENTS.items():
    path = write_document(doc_key, doc_info)
    all_paths.append(path)
    for filepath in doc_info['files']:
        content = read_file(filepath)
        total_source_lines += len(content.split('\n'))

print()
print(f"Total source files: {sum(len(d['files']) for d in DOCUMENTS.values())}")
print(f"Total source lines: {total_source_lines}")
print(f"Documents created: {len(all_paths)}")
for p in all_paths:
    size = os.path.getsize(p)
    print(f"  {p} ({size:,} bytes)")
