# Codemagic → friend’s App Store / TestFlight

You build from [GuildGamer/healthy-mobile](https://github.com/GuildGamer/healthy-mobile).
Config file: `codemagic.yaml` at that repo’s **root** (synced from
`deploy/codemagic.mobile.yaml` via `make sync-deploy-mobile`).

## What your friend should have given you

| File / value | What it is | Where it goes |
|---|---|---|
| **Auth key** `AuthKey_XXXXXX.p8` | App Store Connect API key | Codemagic → Integrations (Developer Portal) |
| **Key ID** | e.g. `AB12CD34EF` (in the filename or ASC) | Same integration |
| **Issuer ID** | UUID on ASC → Users and Access → Integrations | Same integration |
| **Provisioning profile** `.mobileprovision` | Allows installing/signing the app | Codemagic → Code signing identities **or** fetched via the API key |
| **Distribution certificate** `.p12` + password | Signs the IPA | Code signing identities (ask friend if missing — profile alone is not enough) |
| **Bundle ID** | Must match the profile (we use `com.healthyapp.tfpreview`) | Already in `codemagic.yaml` / `IOS_BUNDLE_IDENTIFIER` |
| **App Store Connect app** | App record for that bundle ID | Friend creates in ASC; you need the numeric **Apple ID** |

Do **not** commit `.p8`, `.p12`, or `.mobileprovision` into git.

## 1. Connect the API key in Codemagic

1. Open Codemagic → your team → **Integrations** → **Developer Portal** (App Store Connect).
2. **Manage keys** → add key:
   - Upload the `.p8`
   - Paste **Key ID** and **Issuer ID**
   - Reference name: use exactly `HealthyFriend` (matches `integrations.app_store_connect` in the yaml), **or** change the yaml to match whatever name you choose.
3. Save.

## 2. Code signing (certificate + profile)

**Option A (easiest if the API key has access):**  
With the Developer Portal integration connected, Codemagic can fetch the
distribution cert and profiles for `com.healthyapp.tfpreview` when
`ios_signing` is set. You may not need to upload the provision file manually.

**Option B (manual):**  
Codemagic → **Code signing identities** (or Personal account → settings):

1. Upload the **iOS Distribution** `.p12` + password.
2. Upload the `.mobileprovision`.
3. Confirm the profile’s bundle ID is `com.healthyapp.tfpreview` (or change
   `IOS_BUNDLE_IDENTIFIER` in the yaml + App ID to match whatever the friend created).

## 3. Environment variables

On the app page → **Environment variables** → create group **`testflight`**:

| Variable | Value |
|---|---|
| `APP_STORE_APPLE_ID` | Numeric id from ASC → App → App Information (not the bundle id) |
| `EXPO_PUBLIC_API_URL` | Your deployed API base URL (https, no trailing slash) |
| `EXPO_PUBLIC_QUICKPOSE_SDK_KEY` | QuickPose key registered for the **same** bundle ID |

Mark secrets as **Secret**.

## 4. Push the config and build

From the monorepo:

```bash
make sync-deploy-mobile
```

Then in Codemagic:

1. Branch **main** → **Check for configuration files**.
2. Start workflow **iOS TestFlight (friend account)**.

## 5. After a green build

TestFlight → friend’s ASC team → add testers (Internal / External).  
Testers install via the TestFlight app.

## Common blockers

- **“No configuration file found”** — `codemagic.yaml` missing on `main`; run sync + refresh.
- **Duplicate build 1** — a repeat of build 1 means the next archive must use a higher CFBundleVersion, which this workflow now sets before prebuild.
- **Bundle ID mismatch** — profile / App ID / `IOS_BUNDLE_IDENTIFIER` must be identical.
- **`LiveActivity` requires a provisioning profile** — the lock-screen widget is a second target, `com.healthyapp.tfpreview.LiveActivity`. The signing step registers that App ID and an App Store profile on the distribution certificate already in the keychain. The API key needs permission to create identifiers.
- **Missing .p12** — ask friend for the distribution certificate export, or use API-key-based signing fetch.
- Using `com.healthyapp.app` on the friend’s team will burn that ID — keep the throwaway `com.healthyapp.tfpreview` for this TestFlight.
