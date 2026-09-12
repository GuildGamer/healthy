#!/usr/bin/env bash
# Copy shared brand CSS tokens into apps/website for standalone Vercel builds.
#
# Usage: ./scripts/sync-brand-tokens.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/website"
TOKENS="$ROOT/packages/brand/src/tokens.css"

if [[ ! -f "$TOKENS" ]]; then
  echo "Missing brand tokens at $TOKENS"
  exit 1
fi

if [[ ! -d "$WEB" ]]; then
  echo "Missing website at $WEB — run: git submodule update --init apps/website"
  exit 1
fi

mkdir -p "$WEB/src/brand"
cp "$TOKENS" "$WEB/src/brand/tokens.css"
echo "+ Copied brand tokens -> apps/website/src/brand/tokens.css"
