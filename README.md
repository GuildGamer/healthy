# Product

Greenfield monorepo: Expo mobile app, Astro marketing site, NestJS API, shared contract.

Rename the folder and `@product` scope when the product name is final.

## Conventions (agents and humans)

Cursor rules in [`.cursor/rules/`](.cursor/rules/) plus [`AGENTS.md`](AGENTS.md) define philosophy and hard constraints. Prefer existing patterns over new ones; change the API only through `packages/contract`.

## Prerequisites

- Node 22+ (pinned in `.mise.toml` / `.nvmrc`)
- pnpm 9+
- Docker (for Postgres and local API)

Optional: [mise](https://mise.jdx.dev/) to auto-pin Node/pnpm.

## Quick start

```bash
pnpm install
make up          # Postgres on host port 5433 (avoids local :5432 collisions)
make migrate     # Prisma migrations
make api         # NestJS on :3000
make mobile      # Expo
make web         # Astro marketing site
```

Every `make` target prints the command it runs before executing.

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

## Testing while building

Use an Expo **development build**, not Expo Go. Daily loop: physical device + opposite-platform simulator, service unit tests, Maestro for critical journeys, Playwright for the website.

See `docs/testing.md` and `docs/splitting-repos.md`.

## Deploy

- **Local / early**: Docker Compose
- **Simple cloud**: `render.yaml` (same API Docker image)
- **AWS**: CDK stacks in `infra/` when Activate credits or scale require it

Application code stays provider-neutral (`PORT`, `0.0.0.0`, liveness/readiness).
