# Store compliance reference (Beatset)

Use with `SKILL.md`. Mark every row. Unknown → `FAIL` or `VERIFY`, not pass.

Guideline ids are shorthand for Apple App Review Guidelines / Play policy themes;
confirm against current Apple and Google docs when in doubt.

---

## A. Binary and permissions

Inspect `apps/mobile/app.config.ts` and Expo plugins. For each permission:
declared? used in a real flow? usage string accurate? requested at use-time?

| ID | Item | Apple | Play | Class |
|----|------|-------|------|-------|
| A1 | Camera — count reps + proof + gym/profile photo; strings match | Purpose string | Camera permission justification | CODE |
| A2 | Photo library — iOS add-only for proof saves (`NSPhotoLibraryAddUsageDescription` / media-library plugin); no broad read unless profile picker needs it | Photos | Photo/video policy | CODE |
| A3 | Android still **blocks** `RECORD_AUDIO`, `READ_MEDIA_*` unless a new flow requires them | — | Photo/video & mic | CODE |
| A4 | `expo-camera` `recordAudioAndroid: false` and image-picker `microphonePermission: false` stay aligned with no-audio clips | — | Mic | CODE |
| A5 | Location When-In-Use string = routes; Always strings = background walk after lock | 5.1.4 | Location | CODE |
| A6 | `isIosBackgroundLocationEnabled` / Android background + FGS only if walk still needs them; `UIBackgroundModes` includes `location` honestly | 5.1.4 | Background location | CODE |
| A7 | Motion / `ACTIVITY_RECOGNITION` for steps — string and runtime grant exist | Motion | Activity recognition | CODE |
| A8 | HealthKit: share string describes sleep/workouts read; update string states no write; entitlement present | HealthKit | — | CODE |
| A9 | Health Connect: `READ_SLEEP` / `READ_EXERCISE` declared; runtime via library; no write claims | — | Health Connect | CODE |
| A10 | Notifications plugin present; push purpose honest in listing/notes | Push | Notifications | CODE |
| A11 | Live Activities / lock-screen walk card — ActivityKit keys match shipped UI | — | FGS notification | CODE |
| A12 | No unused dangerous permissions; plugin defaults not re-introducing blocked media | All | All | CODE |
| A13 | Image-picker `photosPermission` string vs Android blocked media — if iOS reads library for profile photo, Play must not claim “no photos” incorrectly; keep picker/system-photo-picker story consistent | Photos | Data safety | CODE |

`FAIL` if a dangerous permission is declared without a user-facing flow, or a
usage string describes a feature you do not ship.

---

## B. Privacy and legal

| ID | Item | Notes | Class |
|----|------|-------|-------|
| B1 | `PRIVACY_URL` / `TERMS_URL` → `https://beatset.tech/privacy` and `/terms` | `apps/mobile/src/lib/config.ts` | CODE |
| B2 | Website pages exist and describe camera, location, health, UGC, billing, account data | `apps/website/src/pages/privacy.astro`, `terms.astro` | CODE |
| B3 | In-app: Help → Privacy / Terms | `HelpScreen` | CODE |
| B4 | Sign-in agrees with linked Terms / Privacy | `FrontDoorText` | CODE |
| B5 | App Privacy (iOS) lists collected types that match the binary: Account, Purchases, Location, Photos/Camera, Health (Sleep, Workouts) as applicable; no phantom tracking if ATT unused | Nutrition labels | CONSOLE |
| B6 | Play Data safety form matches the same | Data safety | CONSOLE |
| B7 | Analytics / crash SDKs: if identifiers collected, labels say so; see contract privacy tests as hints only | | CODE + CONSOLE |
| B8 | Cookie / web consent on marketing site does not contradict app privacy claims | `CookieBanner` | CODE |
| B9 | Export compliance / encryption answers completed | ASC | CONSOLE |

---

## C. UGC and social (Apple 1.2 / Play UGC)

Proof clips are the UGC exception (`docs/social.md` tenet 5).

| ID | Item | Notes | Class |
|----|------|-------|-------|
| C1 | Non-owner clip viewer exposes **Report** | `apps/mobile/app/proof/[clipId].tsx` | CODE |
| C2 | Non-owner exposes **Block**; calls `blockUser` | same | CODE |
| C3 | API implements `reportProofClip` / `blockUser` / `unblockUser` | contract + `proof-clips.controller` | CODE |
| C4 | Blocked user’s content is hidden/removed for the blocker (service behaviour) | API service + tests | CODE |
| C5 | Groups remain invite-only / not publicly discoverable | `docs/social.md`, match invite flows | CODE |
| C6 | Age rating / UGC questionnaires answer “users can share media” accurately | | CONSOLE |
| C7 | Play UGC declaration / objectionable content policy if required for clips | | CONSOLE |
| C8 | Support contact reachable (Help → email) | `SUPPORT_EMAIL` | CODE |

`FAIL` if clips can be viewed from others without Report **and** Block.

---

## D. Account and auth

| ID | Item | Notes | Class |
|----|------|-------|-------|
| D1 | Delete account discoverable in-app | Account → Delete account | CODE |
| D2 | `deleteAccount` contract + service completes deletion | `account-deletion.service` | CODE |
| D3 | Renewing store sub refuses deletion and points to App Store / Play manage links | `account-deletion.ts`, `store-subscriptions.ts`, Delete UI | CODE |
| D4 | Web delete-account page exists for store policy / support | `apps/website/src/pages/delete-account.astro` | CODE |
| D5 | Sign-in methods on device match listing | Better Auth mobile | CODE + CONSOLE |
| D6 | If Apple login offered on iOS, Sign in with Apple rules satisfied | | CODE |
| D7 | Reviewer can reach core loop (demo account **or** invite instructions in Review Notes) | | CONSOLE + notes |
| D8 | No forced social login without alternative if Apple requires it for that config | | CODE |

---

## E. Payments and subscriptions

| ID | Item | Notes | Class |
|----|------|-------|-------|
| E1 | Digital membership unlocks only via StoreKit / Play Billing (`expo-iap`) | No external paywall for digital goods | CODE |
| E2 | Restore purchases control on pricing | `CheckoutFooter` / `pricing-restore` | CODE |
| E3 | Price, duration, auto-renew, cancel path clear before purchase | paywall copy | CODE |
| E4 | Manage subscription links for Apple / Google | `STORE_SUBSCRIPTION_LINKS` | CODE |
| E5 | Product IDs in binary match Console; products Approved | | CONSOLE |
| E6 | Free trial / intro offer disclosed if used | | CODE + CONSOLE |
| E7 | Account deletion + renewing sub interaction still correct after billing changes | | CODE |

---

## F. Health and fitness claims

| ID | Item | Notes | Class |
|----|------|-------|-------|
| F1 | Copy is competitive fitness — no diagnosis / treatment claims | `docs/product.md`, `docs/social.md` tenet 8 | CODE |
| F2 | Listing / screenshots do not claim medical benefit | | CONSOLE |
| F3 | Health permission explains benefit; denial does not hard-crash core loop | Connect Health UI | CODE + DEVICE |
| F4 | Privacy labels: Sleep + Workouts/Exercise as read-only when shipped | `docs/releases.md` | CONSOLE |
| F5 | `CONDITION_FEATURES_ENABLED` hidden features not advertised in store metadata | | CODE + CONSOLE |

---

## G. Location and walks

| ID | Item | Notes | Class |
|----|------|-------|-------|
| G1 | In-app context before Always / background grant | walk start UX | CODE + DEVICE |
| G2 | Play prominent disclosure + policy declaration if background location ships | | CONSOLE + DEVICE |
| G3 | When-In-Use-only path is usable or clearly explained | | CODE + DEVICE |
| G4 | Live Activity / FGS notification purpose matches “active walk” | walk-live-activity | CODE |
| G5 | Android stale location task reset still present if Auto Backup risk remains | `with-stale-location-task-reset` | CODE |

---

## H. Metadata and assets

| ID | Item | Class |
|----|------|-------|
| H1 | Name, subtitle, description match shipped features | CONSOLE |
| H2 | Screenshots show current UI (deck / night / Clinic) | CONSOLE |
| H3 | Support URL, marketing URL, privacy URL set | CONSOLE |
| H4 | Age rating questionnaire matches social + UGC + fitness | CONSOLE |
| H5 | Content rights for hero/marketing media | CONSOLE |
| H6 | Bundle ID / package match binaries (`IOS_BUNDLE_IDENTIFIER`, `ANDROID_PACKAGE`) | CODE + CONSOLE |
| H7 | `playStoreUrl` / App Store id consistent when “Rate the app” enabled | CODE + CONSOLE |

---

## I. Device smoke (production / production-apk / TestFlight)

Not Expo Go. Prefer a binary that includes native modules listed in `docs/releases.md`.

| ID | Step | Fail if |
|----|------|---------|
| I1 | Fresh install → sign up / sign in → open Privacy + Terms | Link 404 or crash |
| I2 | Counted camera set; optional proof clip | Crash, black frames, forced mic |
| I3 | Walk: start, lock phone, distance updates; Live Activity / notification | Silent Always ask with no context; crash |
| I4 | Health connect or deny | Crash on deny |
| I5 | Pricing → Restore | Missing restore; non-store checkout for digital |
| I6 | Other member’s proof → Report / Block | Controls missing |
| I7 | Delete account screen; renewing-sub messaging if applicable | Dead end |
| I8 | Kill / relaunch | Permission-related crash (esp. Android location) |

Any `I*` fail → overall `BLOCK`.

---

## Diff triggers (re-run related sections)

| Change | Re-check |
|--------|----------|
| `app.config.ts` / plugins / native modules | A, G, F, I |
| Proof clips / social | C, I6 |
| Account deletion / billing | D, E |
| Paywall / `expo-iap` | E, I5 |
| Health / sleep / workouts | F, B5–B6, I4 |
| Auth / sign-in | D, I1 |
| Privacy / terms copy or URLs | B |
| Listing / screenshots only | H (Console) |

---

## Common Beatset rejection patterns

1. Background location without clear Review Notes + in-app purpose.
2. HealthKit entitlement / nutrition labels missing Sleep or Workouts.
3. UGC (proof clips) without obvious Report + Block.
4. Account deletion blocked by renewing sub with no cancel path.
5. Play Photo/Video policy vs over-broad media permissions (keep blocks).
6. Reviewer cannot join a private invite-only contest.
7. Medical / condition language in listing while product is competitive fitness.
8. IAP restore missing or web payment for digital unlock.
