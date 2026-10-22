import { deckCardKindFor } from '@/components/deck';
import type { ChallengeFinish } from '@/lib/challenge-finish-session';
import { FINISH_COPY } from './constants/finish-copy';
import { TODAY_COPY } from './constants/today-copy';
import type { DeckItem, FinishedDeckItem } from './types/today-deck';

function nextLabelFor(next: DeckItem | undefined, finish: ChallengeFinish): string {
  if (finish.outcome.kind === 'extraSet' || !next) {
    return FINISH_COPY.doneAction;
  }

  if (next.type === 'challenge') {
    return `${FINISH_COPY.next}: ${next.challenge.title}`;
  }

  if (next.type === 'group') {
    return `${FINISH_COPY.next}: ${TODAY_COPY.groupEyebrow.toLowerCase()}`;
  }

  return FINISH_COPY.seeTheDay;
}

/**
 * The deck with a just-finished card on top, showing its done side. The same
 * challenge is taken out of the rest, so a list that has not caught up yet
 * never deals it twice.
 */
export function withFinishedCard(items: readonly DeckItem[], finish: ChallengeFinish): DeckItem[] {
  const rest = items.filter(
    (item) => !(item.type === 'challenge' && item.challenge.id === finish.challenge.id),
  );
  const finished: FinishedDeckItem = {
    type: 'finished',
    key: `finished-${finish.challenge.id}-${finish.finishedAt}`,
    finish,
    kind: deckCardKindFor(finish.challenge),
    nextLabel: nextLabelFor(rest[0], finish),
  };

  return [finished, ...rest];
}
