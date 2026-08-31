import {
  MAX_REMINDERS_PER_CHALLENGE,
} from '../constants/reminder-defaults.js';

/** Free tier: one nudge time per challenge. */
export const MAX_REMINDERS_FREE_TIER = 1;

export function maxRemindersForMembership(membershipActive: boolean): number {
  if (membershipActive) {
    return MAX_REMINDERS_PER_CHALLENGE;
  }

  return MAX_REMINDERS_FREE_TIER;
}

/**
 * Opting out is always allowed. Opting in to a membership challenge needs an
 * active membership, unless the enrolment is already active (re-save / cadence).
 */
export function canEnrollInChallenge(options: {
  requiresMembership: boolean;
  membershipActive: boolean;
  currentlyEnrolled: boolean;
  enrolling: boolean;
}): boolean {
  if (!options.enrolling) {
    return true;
  }

  if (!options.requiresMembership) {
    return true;
  }

  if (options.membershipActive) {
    return true;
  }

  return options.currentlyEnrolled;
}

export function isCatalogChallengeLocked(options: {
  requiresMembership: boolean;
  membershipActive: boolean;
}): boolean {
  return options.requiresMembership && !options.membershipActive;
}
