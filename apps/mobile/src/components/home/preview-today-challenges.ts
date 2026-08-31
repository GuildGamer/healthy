import type { TodayChallenge } from '@product/client';
import { buildChallengeFocusLayout } from '@/components/challenges/challenge-list-layout';

/** Focus + up next on Home. The rest live on Challenges. */
export function previewTodayChallenges(
  challenges: readonly TodayChallenge[],
): TodayChallenge[] {
  const layout = buildChallengeFocusLayout(challenges);
  if (!layout.focus) {
    return [];
  }

  return [layout.focus, ...layout.upNext];
}

export function homeChallengesHasMore(
  challenges: readonly TodayChallenge[],
): boolean {
  return buildChallengeFocusLayout(challenges).hasMoreBeyondPreview;
}
