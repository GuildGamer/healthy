# Proof clips

Opt-in camera recordings of camera-counted sets. Product rules live in
[`docs/social.md`](./social.md); this note is the operator setup for storage.

## Cloudflare R2

1. Enable R2 in the Cloudflare dashboard (payment method required; free tier
   still applies: 10 GB storage, 1M Class A, 10M Class B).
2. Create private buckets `healthy-clips-staging` and `healthy-clips-prod`.
   Choose **European Union** jurisdiction if most users are in the EU/UK
   (cannot change later). Storage class: **Standard**.
3. Leave public `r2.dev` URLs off. The app uses short-lived signed URLs only.
4. Lifecycle rules on each bucket:
   - delete prefix `clips/` after **90 days**;
   - abort incomplete multipart uploads after **1 day**.
5. Create one **Object Read & Write** API token per bucket. Save Access Key ID
   and Secret Access Key. Endpoint:
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   (or `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com` for EU jurisdiction).
6. Set a usage alert (e.g. 100 GB stored) under Cloudflare Notifications.
7. Render `product-api` env:
   - `STORAGE_PROVIDER=r2`
   - `STORAGE_ENDPOINT`
   - `STORAGE_REGION=auto`
   - `STORAGE_BUCKET`
   - `STORAGE_ACCESS_KEY_ID`
   - `STORAGE_SECRET_ACCESS_KEY`
8. Local: `docker compose up` starts MinIO with the credentials in
   [`.env.example`](../.env.example).

## Before store release

- App Store privacy label: Photos/Videos, linked to the user, App Functionality.
- Update the privacy policy.
- Phase 5: enable **App Attest** on the app identifier in Apple Developer.
