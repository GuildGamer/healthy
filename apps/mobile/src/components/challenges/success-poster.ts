import type { DeckCardKind } from '@/components/deck';
import { formatClockTime } from '@/lib/clock-time';
import type { SharePoster } from './types/share-poster';

/** How a just-finished challenge should read on the share card. */
export type SuccessFace = 'reps' | 'minutes' | 'glasses' | 'gym' | 'logged' | 'done';

const FACE_KIND: Record<SuccessFace, DeckCardKind> = {
  reps: 'strength',
  minutes: 'walk',
  glasses: 'water',
  gym: 'gym',
  logged: 'mobility',
  done: 'mobility',
};

/**
 * The Well done card, in the same words as the history Share screen.
 * Points never become the hero. A reading stays "Logged", with no value.
 */
export function posterForSuccess(input: {
  title: string;
  face: SuccessFace;
  count?: number;
  minutes?: number;
  glasses?: number;
  when?: Date;
}): SharePoster {
  const when = input.when ?? new Date();
  const whenIso = when.toISOString();

  if (input.face === 'reps' && (input.count ?? 0) > 0) {
    return card(input.title, 'reps', String(input.count), 'push-ups', whenIso);
  }

  if (input.face === 'minutes' && (input.minutes ?? 0) > 0) {
    return card(input.title, 'minutes', String(input.minutes), 'minutes walked', whenIso);
  }

  if (input.face === 'glasses' && (input.glasses ?? 0) > 0) {
    return card(input.title, 'glasses', String(input.glasses), 'glasses', whenIso);
  }

  if (input.face === 'gym') {
    return card(input.title, 'gym', formatClockTime(when), 'at the gym', whenIso);
  }

  const word = input.face === 'logged' ? 'Logged' : 'Done';
  return card(
    input.title,
    input.face === 'logged' ? 'logged' : 'done',
    word,
    dayLabel(when),
    whenIso,
  );
}

function card(
  title: string,
  face: SuccessFace,
  value: string,
  unit: string,
  when: string,
): SharePoster {
  return { kind: FACE_KIND[face], label: title, value, unit, when };
}

function dayLabel(at: Date): string {
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
