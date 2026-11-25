# Design direction

How Beatset looks, after the October 2026 overhaul. This replaces the earlier
navy-and-leaf direction; nothing new should use the leaf (`hero-banner`).

The values live in [`packages/brand/src/index.ts`](../packages/brand/src/index.ts)
and the mobile theme ([`apps/mobile/src/theme`](../apps/mobile/src/theme)). This
document is the reasoning behind them, so new screens, share images, and the
website can follow the same rules.

## Thesis

Calm and intentional, like a well-made habit app: one thing in focus at a time,
colour that means something, and nothing decorative. The day is a **deck of
cards** — each challenge is a card you play, and the deck is the app's signature
shape.

## Two modes

| | Beatset night (dark) | Clinic white (light) |
|---|---|---|
| Page | Navy `#0B1220` | Cool grey `#F5F6F8` |
| Card | Filled with the activity's deep colour | White, with a 6pt rail in the activity colour along the top |
| Primary button | Mint `#3DDC97`, navy label | Navy `#0B1220`, white label |
| Finished work | Mint | Navy |

- **Auto is the default** and follows the phone. Settings offers Auto, Light and
  Dark; the choice is stored on the device, not the account.
- **Exports look like the activity deck card** (see [Exported images](#exported-images)):
  finish posters, day done, group results, and period recaps share one language.

## Colour has meaning

- **Each kind of activity owns a colour in both modes** (`deckCardPalettes`):
  walk green, strength purple, gym pink, mobility teal, water blue, blood
  pressure red-orange, streak contests amber. At night the colour is the card;
  on Clinic white it is the rail, the eyebrow, and the numeral.
- **Brand colour means done.** Progress fills and finished ticks are mint at
  night and navy by day. Activity colours only mark what is still open.
- **One primary action per screen**, in the mode's primary colour. Secondary
  actions are quieter: icon buttons, text, or tonal fills.

## Type

- **Titles:** system sans, semibold, tight (`letterSpacing: -1`): "Thursday",
  "Ten-minute walk", "That's the day." One page title per screen at
  `fontSize.headline`.
- **Body and meta:** system sans; muted for secondary lines.
- **Eyebrows:** small medium-weight label with the activity glyph on the left,
  context ("3 of 4", "3 days left") on the right. On exported images, uppercase
  with `letterSpacing: 0.6`.
- **Display face (Archivo Black)** is rare: the wordmark, and at most one hero
  numeral on an exported image. Never on rows or screen titles.

## Shapes

- **Deck card:** radius 30, padding 24, a soft lift shadow on the top card, and
  the next card's edge peeking above it. The action is pinned to the card's
  foot.
- **Lists are divider lists:** rows on the page, separated by hairlines; avatar
  or tinted disc on the left, value on the right.
- **Discs:** a soft circle holding a glyph, tinted in the activity colour.
- **Avatars:** the photo when there is one, otherwise the initials in the accent
  on a tinted disc.
- **No** leaf watermark, glow, gradient wash, stock photography, pill clusters,
  or stacked equal buttons.

## Exported images

Share pictures are not one canvas. They follow the job:

### 1. Activity deck poster (every share)

Finish, day done, group result, history, metric period totals, and
week/month/year recaps all read as the **deck card** you played
(`SharePosterCard`, `DayShareCard`, `GroupRecapCard`, and the Figma comps):

- Filled with the activity's deep colour from `deckCardPalettes` (day done uses
  streak; group results use the contest tone). Plain posters follow the
  sender's mode.
- Soft radius (~26) on the in-app preview; the PNG that destinations send has
  square corners.
- Label and period on top; one big numeral and unit; hairline brand row
  (Beatset lockup tinted to the card ink + a short meta line). No mint band.
- Optional walk GPS path on a finish poster. A gym selfie is its own share
  page (`GymPhotoShareCard`): a 3:4 phone-photo canvas (not the colour poster
  slip, not Stories-tall), full-bleed photo with light top/bottom fades and
  the poster lines (name, weekday, time, unit, lockup, run) in the bands. The
  time is caption-sized so it stays off the face. Soft radius on the in-app
  preview; the PNG destinations send is square. On the share screen it keeps
  air above and below so it reads as a photo. Stored for 30 days with
  membership, 1 day without; History falls back to the card after expiry.

### 2. Invite link preview

Intentional exception: square, full-bleed activity-coloured deck card, white
lockup in the corner, no band — it stands for the card the friend will play. See
[`invite-preview.md`](invite-preview.md).

### Retired

`ChallengeShareCard` (leaf / mint billboard) and the old night + mint-band
report slips are legacy. Live shares use the poster family. Do not extend the
leaf card; delete when nothing imports its art.

## Shareable moments (CTA)

Every surface that can produce a shareable moment must offer destinations to
send it. No orphan card preview without a way to send it.

| Role | Control | When |
|---|---|---|
| Primary (poster + colour) | Colour carousel, then solid **Share** → sheet | Day, metric, period, history/set poster pages |
| Primary (set with clip) | Colour on poster page; solid **Share** opens the sheet for the page in front | Video ↔ poster pager (finish and `/challenge/share`) |
| Primary (group result) | Destination row | Match / group result foot |
| Entry to day share | Share the day on Home day-done | Opens `/share/day` |
| Entry to metric / period share | Share on activity stats or period report | Opens `/share/metric` or `/share/report` |
| Sheet | `ShareDestinationSheet` (caption + destination row) | After Share on poster pages; Share glyph / invite handoffs |
| Secondary invite | Challenge disc on the destination row (in the sheet) | Optional; never a second solid twin of Share |
| Group board | Default-on switch, applied on leave | Clip finish inside a group; never a solid "Post to group" button |
| Dismiss (clip finish) | Top-right **X** | Leaves the screen; applies the board switch if on |

Rules:

- Poster share pages with a colour carousel use **Share → sheet**, not an
  inline destination row under the swatches.
- Solid full-width Share on Home day-done / stats / report is the **entry** to
  the share page; on the share page itself it opens the destination sheet.
- When Share is not the screen’s foot job, a Share glyph opens
  **ShareDestinationSheet** with the same destinations.
- Every destination sends the artifact on screen (`video`, `image`, or
  `link`). Colour swatches recolour a poster and render only while that poster
  is the visible share page. In-app previews are **rounded**; exported PNGs are
  **square** via `ShareCapture`.
- Any set share with a clip uses the video/poster pager (finish and history
  share). Finish adds optional board switch and X. No audience toggle, Save to
  Photos, Discard, Send clip, duplicate code, or Not now on that foot.
  Audience stays a settings / History concern.
- Challenge only when friend-challenge is offered. Link-only payloads (invite
  URL + caption) are first-class.
- Report emails use **Open in Beatset** (deep link to `/progress/report`) when
  the period had activity. Quiet periods use **Do a set** → `/open` (day deck).
  Sharing still happens in-app from the report screen’s Share entry.
- Activity stats and period reports live under You: week card opens the week
  report; enrolled metrics open `/progress/metric/[metric]`. Share opens
  `/share/metric` or `/share/report`.
