import { describe, expect, it } from 'vitest';
import {
  FREE_CAMERA_COUNTING_STARTS,
  MAX_REMINDERS_FREE_TIER,
  canAccessChallenge,
  canEnrollInChallenge,
  canStartCameraCounting,
  freeCameraStartsRemaining,
  isCatalogChallengeLocked,
  maxRemindersForMembership,
} from './entitlements.js';
import { MAX_REMINDERS_PER_CHALLENGE } from '../constants/reminder-defaults.js';

describe('freeCameraStartsRemaining', () => {
  it('is null for members', () => {
    expect(freeCameraStartsRemaining(true, 0)).toBeNull();
    expect(freeCameraStartsRemaining(true, 99)).toBeNull();
  });

  it('counts down from the free lifetime quota', () => {
    expect(freeCameraStartsRemaining(false, 0)).toBe(FREE_CAMERA_COUNTING_STARTS);
    expect(freeCameraStartsRemaining(false, 1)).toBe(1);
    expect(freeCameraStartsRemaining(false, 2)).toBe(0);
    expect(freeCameraStartsRemaining(false, 5)).toBe(0);
  });
});

describe('canStartCameraCounting', () => {
  it('always allows members', () => {
    expect(canStartCameraCounting(true, 0)).toBe(true);
    expect(canStartCameraCounting(true, 100)).toBe(true);
  });

  it('allows non-members until the lifetime quota is used', () => {
    expect(canStartCameraCounting(false, 0)).toBe(true);
    expect(canStartCameraCounting(false, 1)).toBe(true);
    expect(canStartCameraCounting(false, 2)).toBe(false);
  });
});

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
