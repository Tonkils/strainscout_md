#!/usr/bin/env bash
# deploy.sh — StrainScout MD three-stage deploy pipeline
#
# Stages:
#   1. VALIDATE  — TypeScript type-check + ESLint
#   2. BUILD     — Generate sitemap, then Next.js static export
#   3. UPLOAD    — Incremental SFTP upload to IONOS (only changed files)
#
# Usage:
#   ./deploy.sh                  # Full pipeline (validate + build + upload)
#   ./deploy.sh --skip-validate  # Skip TypeScript/ESLint (faster, use with care)
#   ./deploy.sh --skip-build     # Skip build (re-upload existing out/ directory)
#   ./deploy.sh --full-upload    # Force full upload (ignore manifest, re-upload all)
#
# Prerequisites:
#   - Node.js + npm in PATH
#   - Python 3 with paramiko + python-dotenv installed
#   - IONOS_SFTP_PASS set in .env

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB2="$REPO_ROOT/web_2"
PYTHON="${PYTHON:-python}"

SKIP_VALIDATE=0
SKIP_BUILD=0
FULL_UPLOAD=0

for arg in "$@"; do
  case "$arg" in
    --skip-validate) SKIP_VALIDATE=1 ;;
    --skip-build)    SKIP_BUILD=1 ;;
    --full-upload)   FULL_UPLOAD=1 ;;
    --help|-h)
      sed -n '2,18p' "$0" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg  (use --help for usage)"
      exit 1
      ;;
  esac
done

echo ""
echo "============================================================"
echo "  StrainScout MD Deploy Pipeline"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

# ── Stage 1: Validate ────────────────────────────────────────────────────────
if [[ $SKIP_VALIDATE -eq 0 ]]; then
  echo ""
  echo "[ 1/3 ] VALIDATE"
  echo "------------------------------------------------------------"

  echo "  TypeScript..."
  cd "$WEB2"
  npx tsc --noEmit
  echo "  TypeScript: OK"

  echo "  ESLint..."
  npx eslint src --ext .ts,.tsx --max-warnings 0
  echo "  ESLint: OK"
else
  echo ""
  echo "[ 1/3 ] VALIDATE  (skipped)"
fi

# ── Stage 2: Build ───────────────────────────────────────────────────────────
if [[ $SKIP_BUILD -eq 0 ]]; then
  echo ""
  echo "[ 2/3 ] BUILD"
  echo "------------------------------------------------------------"

  echo "  Generating sitemap + robots.txt..."
  cd "$REPO_ROOT"
  "$PYTHON" -m publish.generate_sitemap
  echo "  Sitemap: OK"

  echo "  Next.js static export..."
  cd "$WEB2"
  npm run build
  echo "  Build: OK"

  # Verify output exists
  if [[ ! -d "$WEB2/out" ]]; then
    echo "ERROR: web_2/out/ was not created. Build failed."
    exit 1
  fi
  file_count=$(find "$WEB2/out" -type f | wc -l)
  echo "  Output: $file_count files in web_2/out/"
else
  echo ""
  echo "[ 2/3 ] BUILD  (skipped)"
  if [[ ! -d "$WEB2/out" ]]; then
    echo "ERROR: web_2/out/ not found and --skip-build was set. Run without --skip-build first."
    exit 1
  fi
fi

# ── Stage 3: Upload ──────────────────────────────────────────────────────────
echo ""
echo "[ 3/3 ] UPLOAD"
echo "------------------------------------------------------------"

cd "$REPO_ROOT"
if [[ $FULL_UPLOAD -eq 1 ]]; then
  echo "  Mode: full Next.js deploy (all files)"
  "$PYTHON" -m publish.upload_ionos --next-deploy
else
  echo "  Mode: incremental (only changed files)"
  "$PYTHON" -m publish.upload_ionos --next-incremental
fi

echo ""
echo "============================================================"
echo "  Deploy complete  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"
echo ""
