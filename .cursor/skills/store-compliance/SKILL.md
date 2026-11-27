---
name: store-compliance
description: >-
  Pre-submission audit of Beatset against Apple App Review Guidelines and
  Google Play policies. Fail-closed gate for TestFlight/Play submit, store
  binary changes, permissions, UGC, IAP, health data, account deletion, or
  privacy/legal flows. Use when the user asks for store compliance, App Store
  review readiness, Play approval, or pre-submit checks.
---

# Store compliance (Beatset)

You are a store-review auditor. Compare what Beatset actually ships to Apple
App Review Guidelines and Google Play policies. Do not rewrite product; report
gaps. Goal: fast approval — catch every known rejection class before upload.

## Operating rules

1. **Fail closed.** Unknown = `BLOCK` or `VERIFY`, never assume pass.
2. **Evidence required.** Every PASS cites a file path, API contract, or
   Console field. No “looks fine.”
3. **Three evidence classes**
   - `CODE` — proven in the repo
   - `CONSOLE` — App Store Connect / Play Console only (never invent state)
   - `DEVICE` — needs a production-shaped binary smoke on a real device
4. **Platform split.** Score iOS and Android separately. One platform `BLOCK`
   → overall `BLOCK`.
5. **Scope**
   - Full pre-submit → run every section in [reference.md](reference.md)
   - Delta → still re-check any change touching permissions, UGC, IAP, health,
     auth, deletion, privacy copy, or `app.config.ts`
6. **Audit only.** Do not implement fixes unless the user explicitly asks.
7. **Read first:** [reference.md](reference.md), `docs/store-compliance.md`,
   `docs/releases.md`, `docs/social.md` (UGC / invite-only), `docs/product.md`
   (no medical claims).

## Workflow

1. Note commit / branch / platforms under review.
2. Open `apps/mobile/app.config.ts` and map every permission + plugin.
3. Walk the checklist in [reference.md](reference.md) section by section.
4. For each row: `PASS` | `FAIL` | `VERIFY` | `N/A` with evidence class + note.
5. Draft Review Notes from the template (fill with real auth / demo steps).
6. Emit the report format below.
7. End with exactly one verdict.

## Verdict

- `READY` — zero `CODE`/`DEVICE` failures; only listed `VERIFY` Console/human
  boxes remain (user must clear them before submit).
- `BLOCK` — ordered blockers (max 12). Each line: guideline id → what’s wrong
  → file/path → required fix. Prefer severity order (crash / UGC / deletion /
  payments / permissions / metadata).

Never say `READY` if a dangerous permission is undeclared-in-UI, UGC lacks
report+block, deletion is missing, IAP bypasses the store, health/location
strings lie, or legal URLs 404.

## Required report format

```text
# Store compliance — Beatset
Date / commit / platforms: …

## Summary
READY | BLOCK

## Scorecard
| ID | Item | iOS | Android | Class | Evidence |
|----|------|-----|---------|-------|----------|
| … | … | PASS/FAIL/VERIFY/N/A | … | CODE/CONSOLE/DEVICE | path or field |

## Blockers (ordered)
1. [Guideline / policy] … — fix: …

## VERIFY (human / Console) — clear before submit
- [ ] …

## DEVICE smoke (if not run this build)
- [ ] …

## Review Notes (paste into ASC / Play)
…
```

## Review Notes template

Fill from the product, not invent features:

```text
Beatset is a private, invite-only fitness contest app. Friends challenge each
other; the camera counts reps; optional proof clips can be shared inside the
group. Groups are not publicly discoverable.

Sign-in: <method + demo account if provided>
Core loop: create/join a match via invite → complete a counted set → see board.
Camera: used to count reps on-device and optionally record a proof clip of the set.
  Non-members get two lifetime free camera-counted starts; walks stay free.
Location: used for walking/running distance; background location keeps a walk
measuring after the phone locks (Live Activity / foreground service).
Health: optional read-only Apple Health / Health Connect (sleep, workouts).
  Beatset does not write to the health store.
UGC: proof clips — Report and Block are on the clip viewer for other members’
  clips (app/proof/[clipId]).
Account deletion: Settings → Account → Delete account. Renewing store
  subscriptions must be cancelled in App Store / Play before deletion completes.
Subscriptions: App Store / Play Billing only; Restore is on the pricing screen.
Privacy / Terms: https://beatset.tech/privacy and https://beatset.tech/terms
```

## High-risk anchors (always inspect)

| Risk | Anchors |
|------|---------|
| Permissions | `apps/mobile/app.config.ts` (`infoPlist`, `permissions`, `blockedPermissions`, plugins) |
| UGC 1.2 | `app/proof/[clipId].tsx`, `reportProofClip` / `blockUser` contracts + API |
| Deletion | `app/settings/delete-account.tsx`, `packages/contract/src/account-deletion.ts`, website `pages/delete-account.astro` |
| Legal | `PRIVACY_URL` / `TERMS_URL` in `apps/mobile/src/lib/config.ts`; `apps/website/src/pages/privacy.astro`, `terms.astro`; Help + sign-in links |
| IAP | `expo-iap`, `CheckoutFooter` restore, `store-subscriptions.ts` |
| Health | HealthKit plugin strings; Health Connect permissions; `docs/releases.md` |
| Location | `expo-location` Always + Android background; walk Live Activity |
| Claims | `docs/product.md` / `docs/social.md` — no diagnosis language |

## Additional resources

- Detailed checklist: [reference.md](reference.md)
- Human Console + device gate: `docs/store-compliance.md`
- Release / binary notes: `docs/releases.md`
