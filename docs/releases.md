# Release lanes

## Mobile (EAS)

Configured in `apps/mobile/eas.json`:

| Profile | Purpose |
|---------|---------|
| `development` | Dev client with `expo-dev-client` for **physical devices** (internal IPA/APK) — not an iOS Simulator build. Local Simulator/emulator: `make ios` / `make android` in `docs/testing.md` |
| `preview` | Internal distribution builds |
| `production` | Store binaries |
| `e2e-test` | Android APK / iOS simulator for Maestro |

### JS-only updates

```bash
cd apps/mobile
eas update --branch preview --message "describe change"
```

Ship JS/asset changes over the air via EAS Update. Native dependency, permission, or SDK changes require a new store/build cycle.

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
