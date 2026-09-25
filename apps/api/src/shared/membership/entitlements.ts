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
 * The one membership rule. Adding, seeing, playing, and completing a paid
 * challenge all answer this same question, so access can never drift from what
 * the catalog shows the user.
 *
 * Deliberately no grandfathering: an enrolment taken out while a challenge was
 * free does not survive the challenge becoming paid, and access stops the
 * moment a membership lapses.
 */
export function canAccessChallenge(options: {
  requiresMembership: boolean;
  membershipActive: boolean;
}): boolean {
  return !options.requiresMembership || options.membershipActive;
}

/** Opting out is always allowed. Opting in follows the access rule. */
export function canEnrollInChallenge(options: {
  requiresMembership: boolean;
  membershipActive: boolean;
  enrolling: boolean;
}): boolean {
  if (!options.enrolling) {
    return true;
  }

  return canAccessChallenge(options);
}

export function isCatalogChallengeLocked(options: {
  requiresMembership: boolean;
  membershipActive: boolean;
}): boolean {
  return !canAccessChallenge(options);
}

/**
 * The access rule as a `challenge` query filter, so reads can never return a
 * challenge that `canAccessChallenge` would refuse. Members filter on nothing.
 */
export function challengeAccessFilter(
  membershipActive: boolean,
): { requiresMembership?: false } {
  return membershipActive ? {} : { requiresMembership: false };
}
