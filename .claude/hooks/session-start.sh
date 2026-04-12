#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "=== StrainScout MD — Session Start Hook ==="

# --- Python dependencies ---
echo "[1/3] Installing Python dependencies..."
pip install -r "$PROJECT_DIR/requirements.txt" --quiet

echo "[1/3] Installing Playwright Chromium browser..."
playwright install chromium

# --- Node.js dependencies ---
echo "[2/3] Installing Node.js dependencies..."
cd "$PROJECT_DIR/web"
npm install --prefer-offline

echo "[3/3] All dependencies installed."
