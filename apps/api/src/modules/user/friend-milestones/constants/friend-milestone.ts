/** Streak lengths that earn a one-shot acquaintance nudge. */
export const FRIEND_STREAK_MILESTONES = [7, 14] as const;

export type FriendStreakMilestone = (typeof FRIEND_STREAK_MILESTONES)[number];

/** Skip recipients who opened the app or finished a daily in this window. */
export const FRIEND_MILESTONE_INACTIVE_MS = 18 * 60 * 60 * 1000;

export function friendStreakMilestoneKey(days: FriendStreakMilestone): string {
  return `streak_${days}`;
}

export const FRIEND_LADDER_MILESTONE_KEY = 'goal_ladder';

export type FriendMilestoneCopy = {
  title: string;
  body: string;
};

/**
 * The title names who did what; the body turns it into a dare. The push
 * opens contest creation with them, so the dare is one tap from real.
 */
export function friendMilestonePushCopy(
  actorName: string,
  milestoneKey: string,
): FriendMilestoneCopy {
  if (milestoneKey === FRIEND_LADDER_MILESTONE_KEY) {
    return {
      title: `${actorName} raised their goal`,
      body: 'Think you can keep up? Start a contest.',
    };
  }

  const days = milestoneKey.startsWith('streak_')
    ? milestoneKey.slice('streak_'.length)
    : null;
  if (days) {
    return {
      title: `${actorName} hit ${days} days`,
      body: 'Think you can outlast them? Start a contest.',
    };
  }

  return {
    title: `${actorName} hit a milestone`,
    body: 'Think you can beat that? Start a contest.',
  };
}

export function isFriendStreakMilestone(
  days: number,
): days is FriendStreakMilestone {
  return (FRIEND_STREAK_MILESTONES as readonly number[]).includes(days);
}
