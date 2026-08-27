# Testing while building

## Daily loop

1. `make up && make migrate && make api`
2. Install an Expo **development build** once (`eas build --profile development` or `npx expo run:ios` / `run:android`).
3. `make mobile` — JS refreshes without rebuilding native until you add native modules or change app config.
4. Use a physical phone as primary truth; keep the other platform’s simulator/emulator warm.
5. Manually exercise each finished user story on device before moving on.

Do **not** treat Expo Go as the production path. It cannot exercise custom native code, push credentials, or splash/config parity.

## Automated layers

| Layer | Tool | What to cover |
|-------|------|----------------|
| Domain / services | Vitest | Business rules, money math (integer minor units) |
| API + DB | Vitest + Testcontainers (add when needed) | Persistence, migrations |
| Mobile components | jest-expo + RNTL | Behavior + a11y labels |
| Mobile E2E | Maestro (`.maestro/`) | Critical journeys only |
| Website | Playwright | Nav, forms, meta, a11y |
| Contract | `openapi:check` + `oasdiff` in CI | No accidental breaking API changes |

## CI lanes

- **PR**: lint/format, typecheck, unit tests, API/web build, OpenAPI check, oasdiff vs main.
- **Mobile-impacting PR**: Android e2e-test build + Maestro smoke (iOS via label to control cost).
- **Nightly**: full Maestro + Playwright.
- **Release**: TestFlight + Play internal testing on real devices.

Prefer fewer reliable tests over broad flaky coverage.
