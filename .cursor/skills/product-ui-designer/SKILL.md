---
name: product-ui-designer
description: >-
  Designs and implements Healthy mobile UI with brand fidelity. Use when
  redesigning screens, share cards, celebration moments, or action hierarchies.
---

# Product UI designer (Healthy)

## Brand (non-negotiable)

Read `docs/design-direction.md` first. In short:

- Two modes from `useTheme()`: Healthy night (navy page, cards filled with the activity's deep colour, mint primary) and Clinic white (grey page, white cards with an activity-colour rail, navy primary). Never hard-code one palette.
- Each activity owns a colour in both modes (`deckCardPalettes`). Brand colour (mint by night, navy by day) means done.
- The deck card is the signature shape: radius 30, action pinned to its foot, next card peeking.
- Titles are system sans, semibold, tight. Archivo Black (`displayFontFamily`) only for the wordmark and at most one hero numeral on an exported image.
- No leaf watermark (`hero-banner` is retired), glow, gradient wash, stock photos, pill clusters, or multi-layer shadows.
- Lists/rows: hairline dividers. Cards only when they hold interaction.

## Action hierarchy

- One solid primary CTA max.
- Secondary actions are icon buttons or text — never a second full-width twin of the primary.
- Dismiss / “Not now” is the quietest affordance (text link or icon), never a third stacked `FormButton`.
- Prefer patterns users know: primary button + share icon in a toolbar row.
- **Every shareable moment has a Share CTA** (see `docs/design-direction.md`
  Shareable moments). Default primary is Share with the share glyph. Challenge a
  friend is optional secondary, or the primary only when the friend-challenge
  experiment owns the foot and Share shrinks to the round icon.

## Share cards

Every share uses the **activity deck poster** (`SharePosterCard`,
`DayShareCard`, `GroupRecapCard`, period comps): activity or streak fill, soft
radius, numeral, hairline brand. No mint band.

At most one hero numeral, and only when the number is real. An invite can be
sent before the host has scored. Product claim when true: verified /
sensor-measured work.

## Method

1. Read `docs/design-direction.md`, then neighboring screens (`HomeScreen`, the `deck` components, brand tokens, current target files).
2. State a short design thesis (2–4 bullets) before coding.
3. Implement in the real RN files; match local patterns and `testID`s.
4. Update tests. Keep types strict.
5. Summarize what changed and what to verify on device.

## Anti-patterns

- Three identical stacked buttons.
- Centered badge layouts that ignore Healthy’s Home language.
- Inventing a second palette or font.
---

## Out of scope

Do not redesign the whole app. Touch only the celebration / share surface unless a tiny shared primitive is required.
