import type { TodayChallenge } from '@product/client';

/** Five rows sit on Home. The rest live on Challenges. */
export const HOME_TODAY_PREVIEW_LIMIT = 5;

export function previewTodayChallenges(
  challenges: readonly TodayChallenge[],
): TodayChallenge[] {
  const open = challenges.filter((challenge) => challenge.status !== 'completed');
  const done = challenges.filter((challenge) => challenge.status === 'completed');
  return [...open, ...done].slice(0, HOME_TODAY_PREVIEW_LIMIT);
}
