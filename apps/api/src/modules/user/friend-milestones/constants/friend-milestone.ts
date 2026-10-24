/** Streak lengths that earn a one-shot acquaintance nudge. */
export const FRIEND_STREAK_MILESTONES = [7, 14] as const;

export type FriendStreakMilestone = (typeof FRIEND_STREAK_MILESTONES)[number];

/** Skip recipients who opened the app or finished a daily in this window. */
export const FRIEND_MILESTONE_INACTIVE_MS = 18 * 60 * 60 * 1000;

export const FRIEND_MILESTONE_PUSH_TITLE = 'Someone you know leveled up';

export function friendStreakMilestoneKey(days: FriendStreakMilestone): string {
  return `streak_${days}`;
}

export const FRIEND_LADDER_MILESTONE_KEY = 'goal_ladder';

export function friendMilestonePushBody(
  actorName: string,
  milestoneKey: string,
): string {
  if (milestoneKey === FRIEND_LADDER_MILESTONE_KEY) {
    return `${actorName} raised their goal. Start a contest with them?`;
  }

  const days = milestoneKey.startsWith('streak_')
    ? milestoneKey.slice('streak_'.length)
    : null;
  if (days) {
    return `${actorName} hit a ${days}-day streak. Start a contest with them?`;
  }

  return `${actorName} hit a milestone. Start a contest with them?`;
}

export function isFriendStreakMilestone(
  days: number,
): days is FriendStreakMilestone {
  return (FRIEND_STREAK_MILESTONES as readonly number[]).includes(days);
}
