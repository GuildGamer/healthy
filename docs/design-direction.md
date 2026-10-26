# Design direction

How Healthy looks, after the October 2026 overhaul. This replaces the earlier
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

| | Healthy night (dark) | Clinic white (light) |
|---|---|---|
| Page | Navy `#0B1220` | Cool grey `#F5F6F8` |
| Card | Filled with the activity's deep colour | White, with a 6pt rail in the activity colour along the top |
| Primary button | Mint `#3DDC97`, navy label | Navy `#0B1220`, white label |
| Finished work | Mint | Navy |

- **Auto is the default** and follows the phone. Settings offers Auto, Light and
  Dark; the choice is stored on the device, not the account.
- **Exported images use Healthy night**, whatever mode the sender is in, so a
  shared picture always looks the same (`DayShareCard`, `GroupRecapCard`).

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

Share pictures and link previews follow one family:

- Healthy night page, flat.
- Eyebrow line, then an activity-colour rule or tally.
- A semibold headline.
- At most one hero numeral, only when there is a real number worth showing.
- A label/value facts row under a hairline.
- A full-width primary-colour band with the Archivo wordmark and
  `gethealthyapp.com`.
- Square-edged, so JPEG exports have no white corners.

The invite link preview is the one exception: it is a single square, full-bleed
card in the activity's colour, with the wordmark in its corner and no band, because
it stands for the card the friend will play. See
[`invite-preview.md`](invite-preview.md).

`ChallengeShareCard` still uses the old leaf direction and should be brought
into this family.
