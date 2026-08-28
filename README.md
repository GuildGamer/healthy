# Product

Greenfield monorepo: Expo mobile app, Astro marketing site, NestJS API, shared contract.

Rename the folder and `@product` scope when the product name is final.

## Conventions (agents and humans)

Cursor rules in [`.cursor/rules/`](.cursor/rules/) plus [`AGENTS.md`](AGENTS.md) define philosophy and hard constraints. Prefer existing patterns over new ones; change the API only through `packages/contract`.

## Prerequisites

- Node 22+ (pinned in `.mise.toml` / `.nvmrc`)
- pnpm 9+
- Docker (for Postgres)

Optional: [mise](https://mise.jdx.dev/) to auto-pin Node/pnpm.

For the mobile simulator lane, also install Xcode + CocoaPods (iOS) and/or Android Studio (Android). Details in [`docs/testing.md`](docs/testing.md).

## Quick start

```bash
cp .env.example .env
pnpm install
make up          # Postgres on host port 5433 (avoids local :5432 collisions)
make migrate     # Prisma migrations
make seed        # Disposable local seed data
```

Every `make` target prints the command it runs before executing.

### Lane A — API (optional web)

Enough when changing Nest, Prisma, contract, or the marketing site:

```bash
make api         # NestJS on :3000
make typecheck
make test
make web         # optional — Astro marketing site
```

Smoke: `GET http://localhost:3000/livez`, `/readyz`, `/health`.

### Lane B — API + mobile (Simulator)

Use an Expo **development build**, not Expo Go. `make mobile` starts Metro only — it does **not** install a binary.

First time (and after native deps / app config / SDK changes):

```bash
make ios         # expo run:ios → iOS Simulator
# make android   # expo run:android → emulator
```

Daily (either style):

```bash
# One command — API + Metro in the background (Postgres brought up too)
make lane-b
make lane-b-status
make lane-b-logs     # follow .run/*.log
make lane-b-restart
make lane-b-stop     # leaves Postgres running; make down to stop it

# Or two foreground terminals (unchanged)
make api
make mobile          # Metro; open the existing Simulator app
```

On the home screen, tap **Check API health** and expect `ok · api`.

API URL, EAS vs local Simulator, Maestro, and “as you go” checks: [`docs/testing.md`](docs/testing.md). Releases: [`docs/releases.md`](docs/releases.md). Optional later split: [`docs/splitting-repos.md`](docs/splitting-repos.md).

## Packages

| Path | Role |
|------|------|
| `apps/mobile` | Expo + expo-router |
| `apps/web` | Astro marketing website |
| `apps/api` | NestJS + oRPC |
| `packages/contract` | Zod + oRPC contract (source of truth) |
| `packages/client` | Typed client + TanStack Query helpers |
| `packages/db` | Prisma schema + migrations |
| `packages/brand` | Shared tokens/assets |
| `infra` | AWS CDK (optional path) |

## Deploy

- **Local / early**: Docker Compose
- **Simple cloud**: `render.yaml` (same API Docker image)
- **AWS**: CDK stacks in `infra/` when Activate credits or scale require it

Application code stays provider-neutral (`PORT`, `0.0.0.0`, liveness/readiness).
