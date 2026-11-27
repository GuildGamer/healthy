import type { SurpriseEvidenceRequest, TodayChallenge } from '@product/client';
import type { ChallengeFinishOutcome } from '@/lib/challenge-finish-session';
import { PHOTO_CHECK_COPY } from './constants/doing-copy';
import type { PhotoCheckClock } from './types/photo-check';
import { waterGlassGoal } from './water-glasses';

const READING_KINDS = new Set(['vitals_bp', 'glucose', 'peak_flow', 'carbs']);

export function photoCheckClock(
  request: SurpriseEvidenceRequest,
  now: number = Date.now(),
): PhotoCheckClock {
  const secondsLeft = Math.max(0, Math.ceil((Date.parse(request.expiresAt) - now) / 1000));
  return { secondsLeft, fraction: secondsLeft / request.windowSeconds };
}

export function photoCheckTimeLabel(secondsLeft: number): string {
  return secondsLeft === 1 ? '1 second' : `${secondsLeft} seconds`;
}

export function isReadingCheck(occurrence: Pick<TodayChallenge, 'completionKind'>): boolean {
  return READING_KINDS.has(occurrence.completionKind);
}

export function photoCheckTitle(occurrence: Pick<TodayChallenge, 'completionKind'>): string {
  return occurrence.completionKind === 'vitals_bp'
    ? PHOTO_CHECK_COPY.monitorTitle
    : PHOTO_CHECK_COPY.actTitle;
}

/** What the card's done side shows once the check is settled, whichever way it went. */
export function outcomeAfterPhotoCheck(
  occurrence: Pick<TodayChallenge, 'completionKind' | 'capture'>,
  now: Date = new Date(),
): ChallengeFinishOutcome {
  if (occurrence.completionKind === 'water') {
    return { kind: 'water', glasses: waterGlassGoal(occurrence) };
  }

  if (isReadingCheck(occurrence)) {
    return { kind: 'logged', loggedAt: now.toISOString() };
  }

  return { kind: 'checkedIn' };
}
