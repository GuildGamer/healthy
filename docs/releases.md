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
eas update --channel preview --message "describe change"
```

Ship JS/asset changes over the air via EAS Update. `runtimeVersion` uses the
`fingerprint` policy in `app.config.ts`, so an update only reaches binaries
whose native tree matches. Native dependency, permission, config-plugin, or
local-module changes need a new store/build cycle; after that build, publish a
fresh update for the new fingerprint.

Older installs built under the previous `appVersion` policy still report
runtime `1.0.0`. To push a JS safety net to them (for example guards that skip
missing native modules instead of crashing), publish once with an explicit
runtime:

```bash
cd apps/mobile
eas update --channel production --runtime-version 1.0.0 --message "Guard stale native camera and walk service"
```

Native modules such as `expo-iap`, `expo-store-review`, `expo-splash-screen`, `expo-video`, `expo-media-library`, `@kingstinct/react-native-healthkit`, `react-native-health-connect`, and `quickpose-camera` are not present until you rebuild the development / preview / production binary (`make ios` / `make android`, or `eas build`). A JS-only EAS Update will not link them — stale installs should fail closed (update prompt / foreground-only walk) instead of crashing.

**Proof clip playback and Save to Photos** need a store/dev-client build: `expo-video` and `expo-media-library` are native, and iOS needs `NSPhotoLibraryAddUsageDescription`. Do not ship that lane as an OTA-only change.

**Sleep and walk workouts from Apple Health / Health Connect** are store-build changes: HealthKit entitlement + usage strings on iOS, and Health Connect sleep + exercise permissions on Android. Ship a new binary when those permissions or usage strings change; do not rely on OTA. App Store / Play privacy nutrition labels must list Sleep and Workouts / Exercise as collected health types (read-only; Healthy never writes to the health store).

**Android push and camera counting** are build-time too. Push tokens need Firebase: create an EAS `file` variable `GOOGLE_SERVICES_JSON` with the `google-services.json` for `com.healthyapp.app`, and upload the FCM V1 service-account key under `eas credentials -p android` → Push Notifications. Without the file the build succeeds but Android gets no reminders. QuickPose counting and proof clips on Android ship in the binary (the `quickpose-camera` module), and the QuickPose key must be enabled for the Android package.

**Android walk map tiles** need a separate Maps SDK for Android key: set EAS secret `GOOGLE_MAPS_API_KEY` on the `production` environment (used by `production-apk`), enable **Maps SDK for Android** in Google Cloud, and restrict the key to package `com.healthyapp.app` plus the production keystore SHA-1 from Expo Credentials. This is not `GOOGLE_SERVICES_JSON`. Without the key, Start walk shows a solid navy strip instead of tiles. Ship a new binary after adding or changing the key — OTA cannot inject it.

**Android stale location tasks** are a binary concern. Current JS never registers TaskManager location tasks on Android (walks use a foreground watch). Older builds did register them; Auto Backup can restore that registry after reinstall while clearing location permission, and Android 14+ then kills the process at launch before JS runs. The `with-stale-location-task-reset` config plugin deletes `TaskManagerModule` prefs in `MainApplication.onCreate` before React Native loads. Ship a new APK/AAB after changing that plugin — OTA cannot apply it. Remove the plugin if Android ever registers TaskManager tasks again.

**Background set sync** (`expo-background-task`) needs a new store / dev-client binary. The JS outbox + foreground / reconnect flush can ship over the air; the OS background flush that runs while the app is closed cannot. Stale binaries skip registration and keep relying on launch, foreground, and reconnect. After the binary ships, publish a matching EAS Update for the new fingerprint.

The native splash (background, icon, corner radius) is generated at prebuild from the `expo-splash-screen` plugin config in `app.config.ts`. Changing it needs a new binary, not an update; on a stale install the native splash simply auto-hides early and the animated `SplashScreen` replays.

### Store / internal testing

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit --platform ios      # TestFlight
eas submit --platform android  # Play internal / production track
```

Smoke-test release candidates on real devices before promoting.

### Friend TestFlight invites

Invite links open the TestFlight build when `IOS_APP_ID` on the website lists
both the store bundle (`TEAM.com.healthyapp.app`) and the friend preview
(`TEAM.com.healthyapp.tfpreview`). Set `PUBLIC_TESTFLIGHT_URL` to the public
TestFlight link so the invite page can walk recipients through install when the
App Store listing is not live yet.

## API

- Prefer `render.yaml` early.
- Use `infra/` CDK when on AWS Activate / scaling needs.
- Always: `prisma migrate deploy` in pre-deploy, never on process boot.
