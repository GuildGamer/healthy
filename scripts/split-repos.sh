#!/usr/bin/env bash
# Extract a deployable subdirectory into a standalone git repo with history.
# Requires: git-filter-repo (https://github.com/newren/git-filter-repo)
#
# Usage:
#   ./scripts/split-repos.sh mobile
#   ./scripts/split-repos.sh web
#   ./scripts/split-repos.sh api
#
# Always operates on a fresh clone so the original monorepo stays intact.

set -euo pipefail

TARGET="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK_ROOT="${TMPDIR:-/tmp}/product-split-${STAMP}"

case "$TARGET" in
  mobile) SUBDIR="apps/mobile" ;;
  web) SUBDIR="apps/web" ;;
  api) SUBDIR="apps/api" ;;
  *)
    echo "Usage: $0 {mobile|web|api}"
    exit 1
    ;;
esac

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo is required. Install: brew install git-filter-repo"
  exit 1
fi

echo "+ Creating fresh clone at ${WORK_ROOT}/src"
mkdir -p "$WORK_ROOT"
git clone --no-local "$ROOT" "$WORK_ROOT/src"
cd "$WORK_ROOT/src"

echo "+ Filtering subdirectory ${SUBDIR}"
git filter-repo --subdirectory-filter "$SUBDIR" --force

OUT="$WORK_ROOT/${TARGET}-repo"
mv "$WORK_ROOT/src" "$OUT"

echo
echo "Standalone repo ready:"
echo "  $OUT"
echo
echo "Next steps:"
echo "  cd $OUT"
echo "  git remote add origin git@github.com:<org>/product-${TARGET}.git"
echo "  git push -u origin HEAD"
echo
echo "Original monorepo at $ROOT was not modified."
