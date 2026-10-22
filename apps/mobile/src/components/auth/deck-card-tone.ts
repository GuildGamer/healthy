import type { Theme } from '@/theme';
import type { DeckCardKind } from './constants/welcome-deck';

/** The condition colour a card's rail takes where cards are white. */
export function deckCardTone(theme: Theme, kind: DeckCardKind): string {
  const tones: Record<DeckCardKind, string> = {
    bloodPressure: theme.conditionTones.hypertension,
    walk: theme.conditionTones.general,
    water: theme.conditionTones.asthma,
    strength: theme.conditionTones.asthma,
  };
  return tones[kind];
}
