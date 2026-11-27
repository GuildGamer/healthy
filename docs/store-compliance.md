# Store compliance (pre-submit)

Fail-closed gate before App Store / Play submission. The Cursor skill
`.cursor/skills/store-compliance/` audits the repo; this page is the
**human** Console + device checklist so review is not delayed by metadata
gaps the code cannot prove.

## When to run

| Trigger | Action |
|---------|--------|
| First store version or major feature | Full skill run + every box below |
| New production binary | Full skill run + device smoke on that build |
| Permission / Health / location / UGC / IAP / deletion / legal change | Skill delta + related Console forms |
| Listing / screenshots only | Console metadata section |

Invoke the agent with: *Run store-compliance (thorough / fail-closed).*

Do **not** submit on skill `BLOCK`. Do **not** submit on skill `READY` with
unchecked boxes below.

## Agent

- Skill: `.cursor/skills/store-compliance/SKILL.md`
- Checklist detail: `.cursor/skills/store-compliance/reference.md`
- Related: `docs/releases.md`, `docs/social.md`, `docs/product.md`, `docs/testing.md`

## Console — Apple (App Store Connect)

- [ ] Privacy Policy URL: `https://beatset.tech/privacy`
- [ ] Terms / EULA linked where required
- [ ] App Privacy nutrition labels match binary: Account, Purchases, Location,
      Camera/Photos as used, Health **Sleep** and **Workouts** (read-only)
- [ ] No tracking / ATT claim unless the binary actually tracks across apps
- [ ] Age rating questionnaire matches invite-only social + proof-clip UGC
- [ ] Screenshots and description match current UI and features
- [ ] Support URL and marketing URL set
- [ ] Export compliance / encryption answered
- [ ] Subscription products Approved; product IDs match the app
- [ ] Review Notes pasted (camera, background location, Health read-only,
      Report/Block on proof clips, delete account path, demo/invite access)

## Console — Google Play

- [ ] Privacy Policy URL: `https://beatset.tech/privacy`
- [ ] Data safety form matches the same data types as App Privacy
- [ ] Photo/video permissions policy: no broad `READ_MEDIA_*` (app blocks them);
      declare only what the binary uses
- [ ] Background location: prominent disclosure + declaration if Always/background
      walk ships
- [ ] Health Connect permissions declared and justified (sleep, exercise reads)
- [ ] UGC / objectionable content declarations if proof clips count as UGC
- [ ] Store listing, screenshots, and content rating accurate
- [ ] Subscriptions / in-app products active; Play Billing only for digital goods
- [ ] Review / testing notes include sign-in and how to reach a contest

## Legal pages (shipped site)

Confirm live (not only in repo):

- [ ] https://beatset.tech/privacy
- [ ] https://beatset.tech/terms
- [ ] https://beatset.tech/delete-account (or in-app deletion path documented for policy)

## Device smoke

Use a **production**, **production-apk**, or TestFlight build — not Expo Go.
Native modules (camera, IAP, Health, walk Live Activity, media library) need
that binary; see `docs/releases.md`.

- [ ] Fresh install → sign in → Privacy and Terms open
- [ ] Camera-counted set; optional proof clip (no mic required)
- [ ] Walk with phone locked; Live Activity / notification behaves
- [ ] Health Connect / Apple Health grant or deny without crash
- [ ] Pricing → Restore purchases
- [ ] Another member’s proof clip → Report and Block
- [ ] Settings → Account → Delete account (and renewing-sub messaging if billed)
- [ ] Force-quit and relaunch (especially Android location / Auto Backup)

## Review Notes (paste)

Generate via the store-compliance skill, or start from:

```text
Beatset is a private, invite-only fitness contest app. Friends challenge each
other; the camera counts reps; optional proof clips stay inside the group.
Groups are not publicly discoverable.

Sign-in: <fill>
Core loop: invite link → join match → complete a counted set → board updates.
Camera: on-device rep counting and optional proof clip of the set.
  Non-members get two lifetime free camera-counted starts (solo, practice, or
  group); further camera sets require membership. Walks stay free.
Location: walking/running distance; background location continues a walk after
the phone locks (Live Activity / foreground service).
Health: optional read-only Apple Health / Health Connect (sleep, workouts).
  We do not write to the health store.
UGC: Report and Block on other members’ proof clips (clip viewer menu).
Account deletion: Settings → Account → Delete account. Cancel renewing App
  Store / Play subscriptions before deletion can finish.
Subscriptions: StoreKit / Play Billing; Restore on the pricing screen.
Privacy / Terms: https://beatset.tech/privacy and https://beatset.tech/terms
```

## After submit

If rejected, paste the resolution center / Play reason into a new
store-compliance run and ask for a targeted re-audit of the cited guidelines
before the next binary.
