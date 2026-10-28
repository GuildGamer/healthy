import type { SharePoster } from '@/components/challenges/types/share-poster';
import type { DeckCardKind, DoneFaceHeadline, DoneFaceProof } from '@/components/deck';
import type { ChallengeFinish, ChallengeFinishOutcome } from '@/lib/challenge-finish-session';
import { FINISH_COPY } from './constants/finish-copy';
import { formatClockTime } from '@/lib/clock-time';

export type FinishFaceContent = {
  /** Replaces the condition in the card's top line, as "Extra set" does. */
  eyebrowLabel: string | null;
  headline: DoneFaceHeadline;
  proof: DoneFaceProof | null;
  /** Only results worth showing get one; the done side offers Share when it is there. */
  poster: SharePoster | null;
};

const SHARE_WORTHY = new Set<ChallengeFinishOutcome['kind']>(['reps', 'walk', 'photo', 'extraSet']);

/** Reps, walks, gym photos: worth showing. A glass of water or a reading never is. */
export function isShareWorthy(outcome: ChallengeFinishOutcome): boolean {
  return SHARE_WORTHY.has(outcome.kind);
}

function pointsLine(
  finish: Pick<ChallengeFinish, 'pointsAwarded' | 'penaltyApplied'>,
): string | null {
  if (finish.penaltyApplied > 0) {
    return `−${finish.penaltyApplied} points`;
  }

  return finish.pointsAwarded > 0 ? `+${finish.pointsAwarded} points` : null;
}

function joinLine(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => part !== null).join(' · ');
}

function clock(iso: string | number): string {
  return formatClockTime(new Date(iso));
}

function wordFace(word: string, sub: string): FinishFaceContent {
  return { eyebrowLabel: null, headline: { kind: 'word', word, sub }, proof: null, poster: null };
}

function measuredFace(finish: ChallengeFinish, kind: DeckCardKind): FinishFaceContent | null {
  const { outcome } = finish;
  const points = pointsLine(finish);

  if (outcome.kind === 'reps') {
    const value = String(outcome.count);
    return {
      eyebrowLabel: null,
      headline: { kind: 'measure', value, of: `push-ups in ${outcome.durationSeconds} s` },
      proof: { glyph: 'camera', line: joinLine([FINISH_COPY.countedByCamera, points]) },
      poster: { kind, label: FINISH_COPY.pushups, value, unit: FINISH_COPY.repsUnit },
    };
  }

  if (outcome.kind === 'extraSet') {
    const value = String(outcome.count);
    return {
      eyebrowLabel: FINISH_COPY.extraSet,
      headline: { kind: 'measure', value, of: FINISH_COPY.moreReps },
      proof: { glyph: 'clock', line: FINISH_COPY.noPoints },
      poster: { kind, label: FINISH_COPY.pushups, value, unit: FINISH_COPY.repsUnit },
    };
  }

  if (outcome.kind === 'walk') {
    const minutes = String(Math.max(Math.floor(outcome.durationSeconds / 60), 1));
    const distance = outcome.distanceMeters
      ? `${(outcome.distanceMeters / 1_000).toFixed(2)} km`
      : null;
    return {
      eyebrowLabel: null,
      headline: { kind: 'measure', value: minutes, of: joinLine(['min walked', distance]) },
      proof: { glyph: 'phone', line: joinLine([FINISH_COPY.measuredByPhone, points]) },
      poster: { kind, label: FINISH_COPY.walk, value: minutes, unit: FINISH_COPY.walkUnit },
    };
  }

  return null;
}

/** What the back of a just-finished card says, built from how it was finished. */
export function finishFaceContent(finish: ChallengeFinish, kind: DeckCardKind): FinishFaceContent {
  const measured = measuredFace(finish, kind);
  if (measured) {
    return measured;
  }

  const { outcome, challenge } = finish;
  const points = pointsLine(finish);

  if (outcome.kind === 'logged') {
    const savedAt = challenge.completionKind === 'carbs' ? 'Saved at' : 'Reading saved at';
    return wordFace(
      FINISH_COPY.logged,
      joinLine([`${savedAt} ${clock(outcome.loggedAt)}`, points]),
    );
  }

  if (outcome.kind === 'water') {
    return wordFace(FINISH_COPY.done, joinLine([`${outcome.glasses} glasses today`, points]));
  }

  if (outcome.kind === 'photo') {
    const value = clock(finish.finishedAt);
    return {
      ...wordFace(FINISH_COPY.checkedIn, joinLine([FINISH_COPY.gymChecked, points])),
      poster: { kind, label: FINISH_COPY.gym, value, unit: FINISH_COPY.gymUnit },
    };
  }

  return wordFace(FINISH_COPY.done, joinLine([challenge.title, points]));
}
