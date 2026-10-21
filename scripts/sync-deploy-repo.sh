#!/usr/bin/env bash
# Sync a deployable mini-monorepo slice to GuildGamer/healthy-{api,mobile}.
#
# Website is a true submodule (standalone). API and mobile still need workspace
# packages, so deploy hosts get satellite repos that keep the same layout:
#   apps/<target>/ + packages/* + tooling/* + root workspace files
#
# Develop in this monorepo. Push satellites when you need Render / EAS to pick
# a dedicated GitHub repo:
#   ./scripts/sync-deploy-repo.sh api --push
#   ./scripts/sync-deploy-repo.sh mobile --push
#
# Requires: rsync, git, gh (for --create)

set -euo pipefail

TARGET="${1:-}"
PUSH=0
CREATE=0
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) PUSH=1 ;;
    --create) CREATE=1 ;;
    *)
      echo "Unknown flag: $1"
      echo "Usage: $0 {api|mobile} [--create] [--push]"
      exit 1
      ;;
  esac
  shift
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ORG="${DEPLOY_REPO_ORG:-GuildGamer}"

case "$TARGET" in
  api)
    REMOTE_NAME="healthy-api"
    APP_DIR="apps/api"
    PACKAGE_DIRS=(packages/contract packages/db packages/brand packages/client)
    ;;
  mobile)
    REMOTE_NAME="healthy-mobile"
    APP_DIR="apps/mobile"
    PACKAGE_DIRS=(packages/brand packages/client packages/contract)
    ;;
  *)
    echo "Usage: $0 {api|mobile} [--create] [--push]"
    exit 1
    ;;
esac

REMOTE_URL="git@github.com:${ORG}/${REMOTE_NAME}.git"
WORK_ROOT="${DEPLOY_SYNC_DIR:-${TMPDIR:-/tmp}/healthy-deploy-sync}"
OUT="${WORK_ROOT}/${REMOTE_NAME}"

if [[ "$CREATE" -eq 1 ]]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "gh is required for --create"
    exit 1
  fi
  if ! gh repo view "${ORG}/${REMOTE_NAME}" >/dev/null 2>&1; then
    echo "+ Creating ${ORG}/${REMOTE_NAME}"
    gh repo create "${ORG}/${REMOTE_NAME}" --private \
      --description "Deploy satellite for Healthy ${TARGET} (synced from GuildGamer/healthy)"
  else
    echo "+ ${ORG}/${REMOTE_NAME} already exists"
  fi
fi

mkdir -p "$WORK_ROOT"
if [[ -d "${OUT}/.git" ]]; then
  echo "+ Updating existing clone at ${OUT}"
  git -C "$OUT" fetch origin
  git -C "$OUT" checkout main 2>/dev/null || git -C "$OUT" checkout -B main
  git -C "$OUT" reset --hard "origin/main" 2>/dev/null || true
else
  if git ls-remote "$REMOTE_URL" HEAD >/dev/null 2>&1; then
    echo "+ Cloning ${REMOTE_URL}"
    git clone "$REMOTE_URL" "$OUT"
  else
    echo "+ Initialising new repo at ${OUT}"
    mkdir -p "$OUT"
    git -C "$OUT" init -b main
    git -C "$OUT" remote add origin "$REMOTE_URL" 2>/dev/null || \
      git -C "$OUT" remote set-url origin "$REMOTE_URL"
  fi
fi

echo "+ Syncing ${TARGET} slice into ${OUT}"
# Clear tracked tree but keep .git
find "$OUT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude dist
  --exclude .expo
  --exclude .turbo
  --exclude coverage
  --exclude ios/Pods
  --exclude android/.gradle
  --exclude android/app/build
  --exclude .env
  --exclude .env.local
  --exclude .env.development
  --exclude .env.production
)

mkdir -p "${OUT}/apps" "${OUT}/packages" "${OUT}/tooling"

rsync -a "${RSYNC_EXCLUDES[@]}" "${ROOT}/${APP_DIR}/" "${OUT}/${APP_DIR}/"
for pkg in "${PACKAGE_DIRS[@]}"; do
  rsync -a "${RSYNC_EXCLUDES[@]}" "${ROOT}/${pkg}/" "${OUT}/${pkg}/"
done
rsync -a "${RSYNC_EXCLUDES[@]}" "${ROOT}/tooling/" "${OUT}/tooling/"

# Root workspace files (Docker / pnpm / Turbo expect monorepo shape).
cp "${ROOT}/package.json" "${OUT}/package.json"
cp "${ROOT}/pnpm-workspace.yaml" "${OUT}/pnpm-workspace.yaml"
cp "${ROOT}/pnpm-lock.yaml" "${OUT}/pnpm-lock.yaml"
cp "${ROOT}/turbo.json" "${OUT}/turbo.json"
cp "${ROOT}/.npmrc" "${OUT}/.npmrc"
[[ -f "${ROOT}/.gitignore" ]] && cp "${ROOT}/.gitignore" "${OUT}/.gitignore"
[[ -f "${ROOT}/.mise.toml" ]] && cp "${ROOT}/.mise.toml" "${OUT}/.mise.toml"

if [[ "$TARGET" == "api" ]]; then
  cp "${ROOT}/apps/api/Dockerfile" "${OUT}/Dockerfile"
  cat > "${OUT}/render.yaml" <<'EOF'
# Render Blueprint — connect Blueprint to GuildGamer/healthy-api (this repo).
# Docs: https://render.com/docs/blueprint-spec
services:
  - type: web
    name: product-api
    runtime: docker
    plan: starter
    dockerfilePath: ./Dockerfile
    dockerContext: .
    healthCheckPath: /readyz
    preDeployCommand: pnpm --filter @product/db migrate:deploy
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "10000"
      - key: DATABASE_URL
        fromDatabase:
          name: product-db
          property: connectionString
      - key: BETTER_AUTH_SECRET
        generateValue: true
      # Set after first deploy to https://<your-service>.onrender.com
      - key: BETTER_AUTH_URL
        sync: false
      - key: WEBSITE_URL
        value: https://gethealthyapp.com
      # Required in production: SendByte (SEND_BYTE_LIVE_KEY) or a complete SMTP transport.
      - key: EMAIL_PROVIDER
        sync: false
      - key: SEND_BYTE_LIVE_KEY
        sync: false
      - key: MAIL_FROM
        sync: false
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        sync: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: SMTP_FROM
        sync: false
      - key: EVIDENCE_VISION_API_KEY
        sync: false
      - key: EVIDENCE_VISION_MODEL
        value: gpt-4o-mini

databases:
  - name: product-db
    plan: basic_256mb
    databaseName: product
    user: product
EOF
fi

cat > "${OUT}/README.md" <<EOF
# ${REMOTE_NAME}

Deploy satellite for Healthy **${TARGET}**.

- **Source of truth:** [GuildGamer/healthy](https://github.com/GuildGamer/healthy) monorepo
- **Sync:** from the monorepo run \`./scripts/sync-deploy-repo.sh ${TARGET} --push\`
- Do not develop here long-term — edit in \`healthy\`, then sync

## Layout

Mini-monorepo slice (same paths as the parent repo):

- \`${APP_DIR}/\`
- \`packages/…\` required by ${TARGET}
- \`tooling/\`
- root \`package.json\` / \`pnpm-workspace.yaml\` / lockfile

EOF

if [[ "$TARGET" == "api" ]]; then
  cat >> "${OUT}/README.md" <<'EOF'
## Deploy (Render / Docker)

```bash
docker build -t healthy-api .
# or connect Render to this repo; render.yaml uses ./Dockerfile
```

EOF
else
  if [[ -f "${ROOT}/deploy/codemagic.mobile.yaml" ]]; then
    cp "${ROOT}/deploy/codemagic.mobile.yaml" "${OUT}/codemagic.yaml"
  fi
  cat >> "${OUT}/README.md" <<'EOF'
## Deploy (Codemagic / TestFlight)

`codemagic.yaml` at repo root. Setup: see `docs/codemagic-ios.md` in the monorepo.

```bash
# from GuildGamer/healthy
make sync-deploy-mobile
```

Then in Codemagic → Check for configuration files → run **iOS TestFlight (friend account)**.

App directory in the satellite is still `apps/mobile` (mini-monorepo).

EOF
fi

git -C "$OUT" add -A
if git -C "$OUT" diff --cached --quiet; then
  echo "+ No changes to commit"
else
  git -C "$OUT" -c user.email="${GIT_AUTHOR_EMAIL:-deploy-sync@healthy.local}" \
    -c user.name="${GIT_AUTHOR_NAME:-healthy-deploy-sync}" \
    commit -m "sync ${TARGET} from healthy $(git -C "$ROOT" rev-parse --short HEAD)"
  echo "+ Committed sync at ${OUT}"
fi

if [[ "$PUSH" -eq 1 ]]; then
  echo "+ Pushing to ${REMOTE_URL}"
  git -C "$OUT" push -u origin HEAD:main
  echo "+ Pushed ${ORG}/${REMOTE_NAME}"
else
  echo "+ Dry run complete (no --push). Review: ${OUT}"
  echo "  Then: $0 ${TARGET} --push"
fi
