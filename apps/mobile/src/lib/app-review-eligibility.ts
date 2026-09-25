import type { AppReviewState } from './app-review-store';

export const APP_REVIEW_STREAK_MILESTONES = [3, 7, 14, 30] as const;
export const APP_REVIEW_COOLDOWN_DAYS = 90;
export const APP_REVIEW_MIN_COMPLETIONS = 3;
export const APP_REVIEW_MIN_STREAK = 3;

export type AppReviewEligibilityInput = {
  now: Date;
  dayKey: string;
  winLocked: boolean;
  completedCountToday: number;
  currentStreakDays: number;
  wasPenalized: boolean;
  membershipCtaShownThisSession: boolean;
  promptAttemptedThisSession: boolean;
  state: AppReviewState | null;
};

export type AppReviewEligibilityResult =
  | { eligible: false; reason: string }
  | {
      eligible: true;
      reason: 'win_locked' | 'streak_milestone';
      streakMilestone: number | null;
    };

function daysBetween(earlier: Date, later: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function matchingStreakMilestone(streakDays: number): number | null {
  for (const milestone of APP_REVIEW_STREAK_MILESTONES) {
    if (streakDays === milestone) {
      return milestone;
    }
  }

  return null;
}

/**
 * Pure gates for when we may call the OS in-app review sheet.
 * Does not check native availability — the wrapper does that.
 */
export function evaluateAppReviewEligibility(
  input: AppReviewEligibilityInput,
): AppReviewEligibilityResult {
  if (input.promptAttemptedThisSession) {
    return { eligible: false, reason: 'already_attempted_this_session' };
  }

  if (input.wasPenalized) {
    return { eligible: false, reason: 'penalty' };
  }

  if (input.membershipCtaShownThisSession) {
    return { eligible: false, reason: 'membership_cta_same_session' };
  }

  // A locked win is the product's own definition of a full day, and on the free
  // tier it locks at two challenges. Requiring three on top of it would mean the
  // win could never open this door for the people who most often reach it.
  const hasMinimumUsage =
    input.winLocked ||
    input.completedCountToday >= APP_REVIEW_MIN_COMPLETIONS ||
    input.currentStreakDays >= APP_REVIEW_MIN_STREAK;

  if (!hasMinimumUsage) {
    return { eligible: false, reason: 'minimum_usage' };
  }

  const streakMilestone = matchingStreakMilestone(input.currentStreakDays);
  const winTrigger = input.winLocked;
  const streakTrigger = streakMilestone != null;

  if (!winTrigger && !streakTrigger) {
    return { eligible: false, reason: 'no_trigger' };
  }

  if (input.state) {
    const lastPrompted = new Date(input.state.lastPromptedAt);
    if (
      Number.isFinite(lastPrompted.getTime()) &&
      daysBetween(lastPrompted, input.now) < APP_REVIEW_COOLDOWN_DAYS
    ) {
      return { eligible: false, reason: 'cooldown' };
    }

    if (
      winTrigger &&
      input.state.lastPromptDayKey != null &&
      input.state.lastPromptDayKey === input.dayKey
    ) {
      return { eligible: false, reason: 'already_prompted_day_key' };
    }

    if (
      streakTrigger &&
      streakMilestone != null &&
      input.state.lastPromptedStreakMilestone === streakMilestone
    ) {
      return { eligible: false, reason: 'already_prompted_streak_milestone' };
    }
  }

  if (winTrigger) {
    return {
      eligible: true,
      reason: 'win_locked',
      streakMilestone: null,
    };
  }

  return {
    eligible: true,
    reason: 'streak_milestone',
    streakMilestone,
  };
}
