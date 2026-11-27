import type { TodayChallenge } from '@product/client';

export type OpenWalkOfferGoal = {
  challengeId: string;
  userChallengeId: string;
  targetDurationMinutes: number;
  dayKey: string;
};

/**
 * The open daily walk Mine goal we can offer to count, or null when nothing
 * qualifies (already done, not a duration walk, weekly/monthly, etc.).
 */
export function openWalkOfferGoal(
  challenges: readonly TodayChallenge[],
  dayKey: string,
): OpenWalkOfferGoal | null {
  for (const challenge of challenges) {
    if (challenge.status === 'completed' || challenge.status === 'awaiting_evidence') {
      continue;
    }

    if (challenge.frequency !== 'daily') {
      continue;
    }

    if (challenge.capture.metric !== 'walk') {
      continue;
    }

    const minutes = challenge.capture.target.durationMinutes;
    if (minutes == null || minutes <= 0) {
      continue;
    }

    return {
      challengeId: challenge.challengeId,
      userChallengeId: challenge.id,
      targetDurationMinutes: minutes,
      dayKey,
    };
  }

  return null;
}
