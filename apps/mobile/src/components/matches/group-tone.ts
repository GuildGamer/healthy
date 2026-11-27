import { DECK_KIND_BY_METRIC, DECK_KIND_GLYPH } from '@/components/deck';
import type { GlyphName } from '@/components/icons';
import type { Theme } from '@/theme';
import type { GroupRules } from './group-rule-copy';

/** A group's colour, wherever it is drawn: its card, its list disc, its bars. */
export type GroupTone = {
  /** The card's own fill: deep at night, white on Clinic white. */
  fill: string;
  /** The bright colour: bars, the list disc's glyph, and Clinic white's rail. */
  tone: string;
  glyph: GlyphName;
  /** Clinic white cards are all white, so the tone runs along the top instead. */
  railColor: string | null;
};

/**
 * A streak group counts showing up rather than an activity, so it takes
 * the streak colour; every other group takes its activity's deck colour.
 */
export function groupToneFor(theme: Theme, rules: GroupRules): GroupTone {
  const { deckCards } = theme;

  if (rules.scoringMode === 'days_completed') {
    return {
      fill: deckCards.streak,
      tone: deckCards.streakTone,
      glyph: 'flame',
      railColor: deckCards.hasToneRail ? deckCards.streakTone : null,
    };
  }

  const kind = DECK_KIND_BY_METRIC[rules.metric] ?? 'walk';
  const tone = deckCards.tones[kind];
  return {
    fill: deckCards[kind],
    tone,
    glyph: DECK_KIND_GLYPH[kind],
    railColor: deckCards.hasToneRail ? tone : null,
  };
}
