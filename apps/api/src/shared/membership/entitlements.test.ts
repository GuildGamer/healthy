import { describe, expect, it } from 'vitest';
import {
  MAX_REMINDERS_FREE_TIER,
  canAccessChallenge,
  canEnrollInChallenge,
  isCatalogChallengeLocked,
  maxRemindersForMembership,
} from './entitlements.js';
import { MAX_REMINDERS_PER_CHALLENGE } from '../constants/reminder-defaults.js';

describe('maxRemindersForMembership', () => {
  it('allows one reminder on the free tier', () => {
    expect(maxRemindersForMembership(false)).toBe(MAX_REMINDERS_FREE_TIER);
  });

  it('allows the full reminder cap for members', () => {
    expect(maxRemindersForMembership(true)).toBe(MAX_REMINDERS_PER_CHALLENGE);
  });
});

describe('canAccessChallenge', () => {
  it('opens free challenges to everyone', () => {
    expect(
      canAccessChallenge({
        requiresMembership: false,
        membershipActive: false,
      }),
    ).toBe(true);
  });

  it('opens membership challenges to members', () => {
    expect(
      canAccessChallenge({
        requiresMembership: true,
        membershipActive: true,
      }),
    ).toBe(true);
  });

  it('closes membership challenges once a membership lapses', () => {
    expect(
      canAccessChallenge({
        requiresMembership: true,
        membershipActive: false,
      }),
    ).toBe(false);
  });
});

describe('canEnrollInChallenge', () => {
  it('always allows leaving a challenge', () => {
    expect(
      canEnrollInChallenge({
        requiresMembership: true,
        membershipActive: false,
        enrolling: false,
      }),
    ).toBe(true);
  });

  it('blocks free users from joining a membership challenge', () => {
    expect(
      canEnrollInChallenge({
        requiresMembership: true,
        membershipActive: false,
        enrolling: true,
      }),
    ).toBe(false);
  });

  it('allows members to join membership challenges', () => {
    expect(
      canEnrollInChallenge({
        requiresMembership: true,
        membershipActive: true,
        enrolling: true,
      }),
    ).toBe(true);
  });
});

describe('isCatalogChallengeLocked', () => {
  it('locks membership challenges for free users', () => {
    expect(
      isCatalogChallengeLocked({
        requiresMembership: true,
        membershipActive: false,
      }),
    ).toBe(true);
  });

  it('does not lock free challenges', () => {
    expect(
      isCatalogChallengeLocked({
        requiresMembership: false,
        membershipActive: false,
      }),
    ).toBe(false);
  });
});
