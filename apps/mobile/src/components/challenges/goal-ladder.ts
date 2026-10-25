import { isPoseMetric } from '@product/contract/match-board';

export type GoalLadderNextTarget = 8 | 10;

export type GoalLadderOffer = {
  nextTarget: GoalLadderNextTarget;
};

/**
 * After a rewarded pose finish, invite the next ladder step when the streak
 * hits an exact gate and the current goal is still on the ladder.
 * 5 → 8 at streak 3; 8 → 10 at streak 7. Custom goals never get an offer.
 * Hold targets (e.g. 60s plank) never match these gates, so they stay quiet.
 */
export function nextGoalLadderOffer(input: {
  metric: string | null | undefined;
  currentTarget: number | null | undefined;
  streakDays: number;
}): GoalLadderOffer | null {
  if (!input.metric || !isPoseMetric(input.metric)) {
    return null;
  }

  if (input.currentTarget == null) {
    return null;
  }

  if (input.streakDays === 3 && input.currentTarget === 5) {
    return { nextTarget: 8 };
  }

  if (input.streakDays === 7 && input.currentTarget === 8) {
    return { nextTarget: 10 };
  }

  return null;
}
