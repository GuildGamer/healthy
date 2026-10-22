import type { TodayChallenge } from '@product/client';
import { DECK_KIND_BY_CATEGORY, DECK_KIND_BY_COMPLETION, DECK_KIND_BY_METRIC } from './deck-kinds';
import type { DeckCardKind } from './types';

/** The fill a challenge's card takes, wherever that card is drawn: the deck, a sheet, a session. */
export function deckCardKindFor(
  challenge: Pick<TodayChallenge, 'category' | 'completionKind' | 'capture'>,
): DeckCardKind {
  const metric = challenge.capture.metric;
  const byMetric = metric ? DECK_KIND_BY_METRIC[metric] : undefined;
  if (byMetric) {
    return byMetric;
  }

  return (
    DECK_KIND_BY_COMPLETION[challenge.completionKind] ?? DECK_KIND_BY_CATEGORY[challenge.category]
  );
}
