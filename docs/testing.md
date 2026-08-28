# Testing while building

Two local lanes. Use **Lane A** for Nest, Prisma, contract, or marketing-site work. Use **Lane B** when changing `apps/mobile`, client consumption, or anything the home screen calls.

Do **not** use Expo Go. Metro starts with `--dev-client`; you need a development build (local Simulator/emulator or an EAS device build).

## Prerequisites

Shared (both lanes):

- Node 22+ / pnpm 9+ (see `.mise.toml` / `.nvmrc`)
- Docker (Postgres)

Lane B (mobile) additionally:

- **iOS Simulator:** Xcode, iOS Simulator, CocoaPods
- **Android emulator:** Android Studio / SDK / JDK

pnpm flattens installs via `.npmrc` (`node-linker=hoisted`) and `pnpm-workspace.yaml` (`nodeLinker: hoisted`) so Metro can resolve Expo transitive deps. After changing that or Metro config, clear the bundler cache once: `pnpm --filter @product/mobile exec expo start --dev-client --clear`.

## First run (shared)

```bash
cp .env.example .env
pnpm install
make up
make migrate
make seed
```

Optional mobile env: copy `apps/mobile/.env.example` → `apps/mobile/.env` if you need a non-default API URL (see [API URL](#api-url) below).

## Lane A — API (optional web)

```bash
make api
```

Smoke the API:

- `GET http://localhost:3000/livez`
- `GET http://localhost:3000/readyz`
- `GET http://localhost:3000/health`

Then:

```bash
make typecheck
make test
make openapi-check   # when contract or oRPC handlers changed
make web             # optional marketing site
make e2e-web         # Playwright homepage smoke
```

Manual checks when those paths changed:

- Waitlist: site `/waitlist` → API `POST /waitlist`
- `/me` only with a session (no mobile auth UI yet)

## Lane B — API + mobile

### First native install (once)

Run after clone, and again after native deps, `app.config.ts`, plugins, or Expo SDK changes:

```bash
make ios        # expo run:ios → iOS Simulator
# make android  # expo run:android → emulator
```

`make mobile` only starts Metro. It does **not** install a binary.

### Daily loop

One command (API + Metro in the background; brings Postgres up):

```bash
make lane-b
make lane-b-status
make lane-b-logs      # follow .run/api.log and .run/mobile.log
make lane-b-restart
make lane-b-stop      # leaves Postgres running; make down to stop it
```

Or two foreground terminals (unchanged):

```bash
make api
make mobile     # Metro; use the existing Simulator/emulator binary
```

On the home screen, tap **Check API health**. Expect `ok · api`, not `unreachable`. Auth screens need the API up the same way — without it you will see “could not reach the server”.

### API URL

| Runtime | `EXPO_PUBLIC_API_URL` |
|---------|------------------------|
| iOS Simulator | `http://localhost:3000` (default in `apps/mobile/.env.example`) |
| Android emulator | `http://10.0.2.2:3000` |
| Physical device | Your machine’s LAN IP (same Wi‑Fi), e.g. `http://192.168.x.x:3000` |

### EAS vs local Simulator

- **Local Simulator/emulator:** `make ios` / `make android` (this runbook).
- **EAS `development` profile:** internal **device** IPA/APK for physical phones — not an iOS Simulator build. See `docs/releases.md`.
- **EAS `e2e-test`:** Android APK / iOS Simulator for Maestro. Cloud device builds and store lanes stay in `docs/releases.md`.

### Local Maestro

After a binary is installed:

```bash
maestro test apps/mobile/.maestro/home.yml
```

## As you go (per change)

| Change | What to run |
|--------|-------------|
| Contract / API | Edit `packages/contract` first → implement in `apps/api` → `make typecheck` → `make test` → `make openapi-check` → curl touched routes |
| Persistence | `make migrate` (and `make seed` if seed data matters) |
| Mobile JS only | `make mobile` + Simulator smoke; rebuild native only after plugins / `app.config` / SDK changes |
| Web | `make web` + `make e2e-web`; waitlist form against a running API |

## Automated layers

| Layer | Tool | What to cover |
|-------|------|----------------|
| Domain / services | Vitest | Business rules, money math (integer minor units) |
| API + DB | Vitest + Testcontainers (add when needed) | Persistence, migrations |
| Mobile components | jest-expo + RNTL | Behavior + a11y labels |
| Mobile E2E | Maestro (`.maestro/`) | Critical journeys only |
| Website | Playwright | Nav, forms, meta, a11y |
| Contract | `openapi:check` + `oasdiff` in CI | No accidental breaking API changes |

## CI

What `.github/workflows/ci.yml` runs today:

- **quality:** typecheck, unit tests, API/web build, migrate deploy against CI Postgres, OpenAPI check; on PRs, `oasdiff` vs the base branch when a prior OpenAPI artifact exists
- **mobile-validate:** mobile typecheck + Jest

Not on every PR (yet): repo-wide lint/format, Maestro, or native iOS/Android compile. Nightly runs Playwright for web; Maestro on GitHub is a reminder until an EAS workflow is linked.

Prefer fewer reliable tests over broad flaky coverage.
