#!/usr/bin/env bash
# Copy shared brand assets into apps/website for standalone Vercel builds.
#
# Usage: ./scripts/sync-brand-tokens.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/website"
TOKENS="$ROOT/packages/brand/src/tokens.css"
SHARE_TEXT="$ROOT/packages/brand/src/share-text.ts"

if [[ ! -f "$TOKENS" ]]; then
  echo "Missing brand tokens at $TOKENS"
  exit 1
fi

if [[ ! -f "$SHARE_TEXT" ]]; then
  echo "Missing share-text at $SHARE_TEXT"
  exit 1
fi

if [[ ! -d "$WEB" ]]; then
  echo "Missing website at $WEB — run: git submodule update --init apps/website"
  exit 1
fi

mkdir -p "$WEB/src/brand"
cp "$TOKENS" "$WEB/src/brand/tokens.css"
{
  echo '/**'
  echo ' * Vendored from `packages/brand/src/share-text.ts` via'
  echo ' * `scripts/sync-brand-tokens.sh` so the standalone website submodule'
  echo ' * can strip/load emoji without a workspace dependency.'
  echo ' */'
  echo
  cat "$SHARE_TEXT"
} > "$WEB/src/brand/share-text.ts"
echo "+ Copied brand tokens -> apps/website/src/brand/tokens.css"
echo "+ Copied share-text -> apps/website/src/brand/share-text.ts"
