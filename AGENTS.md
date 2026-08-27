# Agent instructions

This repository is steered by Cursor rules in `.cursor/rules/`. Read them before changing architecture, API surface, auth, money, or package boundaries.

## Always-on

| Rule | Purpose |
|------|---------|
| `00-philosophy` | How to decide when no strict rule exists |
| `01-agent-discipline` | Search first; do not invent stack or parallel patterns |
| `02-architecture` | Layer ownership, Nest module shape, typed results |
| `04-security-money` | Fail-closed auth, secrets, integer/Decimal money |
| `05-testing` | Pyramid and E2E restraint |
| `08-monorepo-deploy` | Package deps and portable Docker deploy |

## File-scoped

| Rule | When |
|------|------|
| `03-contract-first` | `packages/contract`, `packages/client`, `apps/api` |
| `06-mobile` | `apps/mobile` |
| `07-web` | `apps/web` |
| `09-prisma` | `packages/db` |
| `10-typescript` | `*.ts` / `*.tsx` |

## Human docs

- `README.md` — quick start
- `docs/testing.md` — device + CI testing loop
- `docs/releases.md` — EAS Update vs store
- `docs/splitting-repos.md` — optional later split

## Locked stack (do not casually replace)

Expo + Astro + NestJS + oRPC/Zod + Prisma/Postgres + pnpm/Turborepo + Better Auth.
Deploy: Docker → Render and/or AWS ECS via CDK.
