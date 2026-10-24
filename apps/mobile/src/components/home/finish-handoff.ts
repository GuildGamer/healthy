import type { FriendChallengeSource } from '@/components/challenges/types/friend-challenge';
import type { ChallengeFinish } from '@/lib/challenge-finish-session';
import type { DeckItem } from './types/today-deck';

/** What a friend would be challenged to after this finish. */
export function friendSourceForFinish(finish: ChallengeFinish): FriendChallengeSource {
  const { outcome } = finish;
  if (outcome.kind === 'reps' || outcome.kind === 'extraSet') {
    return { kind: 'reps', count: outcome.count };
  }

  return outcome.kind === 'walk' ? { kind: 'walk' } : { kind: 'day' };
}

/** The last open challenge of the day was just done; an extra set never finishes a day. */
export function isDayFinishedBy(finish: ChallengeFinish, items: readonly DeckItem[]): boolean {
  if (finish.outcome.kind === 'extraSet') {
    return false;
  }

  return !items.some(
    (item) => item.type === 'challenge' && item.challenge.id !== finish.challenge.id,
  );
}

function successMetric(finish: ChallengeFinish): 'pushups' | 'walk' | 'other' {
  if (finish.outcome.kind === 'reps' || finish.outcome.kind === 'extraSet') {
    return 'pushups';
  }

  return finish.outcome.kind === 'walk' ? 'walk' : 'other';
}

function successFace(finish: ChallengeFinish): string {
  const { outcome } = finish;
  if (outcome.kind === 'reps' || outcome.kind === 'extraSet') {
    return 'reps';
  }
  if (outcome.kind === 'walk') {
    return 'minutes';
  }
  if (outcome.kind === 'water') {
    return 'glasses';
  }
  if (outcome.kind === 'photo') {
    return 'gym';
  }
  if (outcome.kind === 'logged') {
    return 'logged';
  }
  return 'done';
}

/** Route params for the Well done page; all strings, as a URL carries them. */
export function daySuccessParams(finish: ChallengeFinish): Record<string, string> {
  const { challenge, outcome } = finish;
  const target = challenge.capture.target.count;

  return {
    title: challenge.title,
    points: String(finish.pointsAwarded),
    streak: String(finish.currentStreakDays),
    penalty: String(finish.penaltyApplied),
    userChallengeId: challenge.id,
    challengeId: challenge.challengeId,
    metric: successMetric(finish),
    face: successFace(finish),
    day: '1',
    ...(challenge.capture.metric ? { activityKey: challenge.capture.metric } : {}),
    ...(outcome.kind === 'reps' || outcome.kind === 'extraSet'
      ? { count: String(outcome.count) }
      : {}),
    ...(outcome.kind === 'reps' && target ? { target: String(target) } : {}),
    ...(outcome.kind === 'walk'
      ? { minutes: String(Math.max(1, Math.floor(outcome.durationSeconds / 60))) }
      : {}),
    ...(outcome.kind === 'water' ? { glasses: String(outcome.glasses) } : {}),
  };
}
