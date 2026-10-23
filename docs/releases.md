# Release lanes

## Mobile (EAS)

Configured in `apps/mobile/eas.json`:

| Profile | Purpose |
|---------|---------|
| `development` | Dev client with `expo-dev-client` for **physical devices** (internal IPA/APK) — not an iOS Simulator build. Local Simulator/emulator: `make ios` / `make android` in `docs/testing.md` |
| `preview` | Internal distribution builds |
| `production` | Store binaries (Android App Bundle) |
| `production-apk` | Same production app as an installable Android APK |
| `e2e-test` | Android APK / iOS simulator for Maestro |

### JS-only updates

```bash
cd apps/mobile
eas update --branch preview --message "describe change"
```

Ship JS/asset changes over the air via EAS Update. Native dependency, permission, or SDK changes require a new store/build cycle.

Native modules such as `expo-iap`, `expo-store-review`, and `expo-splash-screen` are not present until you rebuild the development / preview / production binary (`make ios` / `make android`, or `eas build`). A JS-only EAS Update will not link them — stale installs fail closed instead of crashing.

The native splash (background, icon, corner radius) is generated at prebuild from the `expo-splash-screen` plugin config in `app.config.ts`. Changing it needs a new binary, not an update; on a stale install the native splash simply auto-hides early and the animated `SplashScreen` replays.

### Store / internal testing

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit --platform ios      # TestFlight
eas submit --platform android  # Play internal / production track
```

Smoke-test release candidates on real devices before promoting.

## API

- Prefer `render.yaml` early.
- Use `infra/` CDK when on AWS Activate / scaling needs.
- Always: `prisma migrate deploy` in pre-deploy, never on process boot.
