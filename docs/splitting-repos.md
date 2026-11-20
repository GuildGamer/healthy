# Splitting deployables out of the monorepo

The monorepo ([GuildGamer/healthy](https://github.com/GuildGamer/healthy)) is the
source of truth for product code.

Deploy hosts that must select a **single GitHub repository** (Render, EAS, etc.)
use one of:

| Surface | Repo | Pattern |
|---------|------|---------|
| Marketing site | [GuildGamer/healthy-website](https://github.com/GuildGamer/healthy-website) | Git **submodule** at `apps/website` (standalone; brand tokens vendored) |
| API | [GuildGamer/healthy-api](https://github.com/GuildGamer/healthy-api) | **Deploy satellite** (mini-monorepo slice, synced) |
| Mobile | [GuildGamer/healthy-mobile](https://github.com/GuildGamer/healthy-mobile) | **Deploy satellite** (mini-monorepo slice, synced) |

## Why API / mobile are not website-style submodules

`apps/website` has no `workspace:*` dependencies, so the submodule root *is* the
deployable unit.

`apps/api` and `apps/mobile` depend on `@product/contract`, `@product/db`,
`@product/client`, `@product/brand`. A bare `git filter-repo` of `apps/api` or
`apps/mobile` alone does not build. Satellites keep the monorepo path layout
(`apps/…` + `packages/…`) so Docker and EAS keep working.

Develop in `healthy`. Sync when you need the satellite updated for deploy.

## Sync deploy satellites

```bash
./scripts/sync-deploy-repo.sh api --create --push
./scripts/sync-deploy-repo.sh mobile --create --push
```

Or via Make:

```bash
make sync-deploy-api
make sync-deploy-mobile
```

Flags:

- `--create` — create the private GitHub repo under `GuildGamer` if missing (`gh`)
- `--push` — push the synced tree to `origin/main`

Without `--push`, the script writes a local clone under
`$TMPDIR/healthy-deploy-sync/` for review.

## Point deploy hosts at the satellites

**API (Render):** connect the service to `GuildGamer/healthy-api`. The synced
repo includes `Dockerfile` and a minimal `render.yaml` at the repo root
(`dockerContext: .`).

**Mobile (EAS):** connect the Expo project to `GuildGamer/healthy-mobile` with
app directory `apps/mobile` (same as today’s monorepo layout).

## Optional: history-preserving app-only extract

If you only need a subdirectory with history (not a buildable deploy repo):

```bash
./scripts/split-repos.sh mobile   # or website | api
```

Requires [`git-filter-repo`](https://github.com/newren/git-filter-repo). The
original monorepo is never modified. You still must solve shared packages
(publish, vendor, or use the satellite sync above).

## Later options

- Publish `@product/*` to a private npm registry, then convert `apps/api` /
  `apps/mobile` into true submodules like the website.
- Prefer extracting only when a hard deploy/access requirement appears.
