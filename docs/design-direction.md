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
  sender's mode; photo overlays use night ink.
- Soft radius (~26).
- Label and period on top; one big numeral and unit; hairline brand row
  (`Beatset` + a short meta line). No mint band.
- Optional full-bleed gym selfie or walk GPS path on a finish.

### 2. Invite link preview

Intentional exception: square, full-bleed activity-coloured deck card, wordmark
in the corner, no band — it stands for the card the friend will play. See
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
| Primary | Destination row (WhatsApp, Status, Instagram, Messages, Copy link, More) | Default on finish, day done, history share, activity stats, period reports, group result |
| Primary (clip finish) | Same row + **Send clip**; group-board switch as specified | Post-set when a proof clip is the hero |
| Sheet | `ShareDestinationSheet` (caption + same row) | Share glyph / secondary chrome, or post-create invite handoffs (board, create group, run it back, challenge a friend) |
| Secondary invite | Challenge disc on the destination row | Optional; never a second solid twin of Share |
| Group board | Default-on switch, applied on leave | Clip finish inside a group; never a solid "Post to group" button |

Rules:

- The **destination row** is the default primary for shareable moments. Solid
  full-width Share is retired on those feet.
- When Share is not the screen’s foot job, a Share glyph opens
  **ShareDestinationSheet** with the same destinations.
- Clip finish keeps Send clip and the group-board switch. Destinations open
  immediately; uploads never block a send.
- Send clip only when a clip URI exists. Challenge only when friend-challenge
  is offered. Link-only payloads (invite URL + caption) are first-class.
- Dismiss / Not now stays the quietest control.
- Report emails use **Open in Beatset** (deep link to `/progress/report`), not
  Share — sharing happens in-app from the report screen.
- Activity stats and period reports live under You: week card opens the week
  report; enrolled metrics open `/progress/metric/[metric]`.
