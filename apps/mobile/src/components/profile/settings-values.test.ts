import type { MembershipCurrentSubscription } from '@product/contract';
import {
  countNotificationsOn,
  membershipValue,
  movementValue,
  notificationsValue,
  privacyValue,
  type NotificationSwitches,
} from './settings-values';

const ALL_ON: NotificationSwitches = {
  reminderEnabled: true,
  evidenceRemindersEnabled: true,
  inProgressNudgeEnabled: true,
  groupNotificationsEnabled: true,
  promotionalMessagesEnabled: true,
};

const ALL_OFF: NotificationSwitches = {
  reminderEnabled: false,
  evidenceRemindersEnabled: false,
  inProgressNudgeEnabled: false,
  groupNotificationsEnabled: false,
  promotionalMessagesEnabled: false,
};

function subscription(
  overrides: Partial<MembershipCurrentSubscription>,
): MembershipCurrentSubscription {
  return {
    id: 'sub-1',
    planId: 'plan-1',
    interval: 'year',
    provider: 'apple',
    status: 'active',
    autoRenewing: true,
    currentPeriodEndsAt: '2027-11-03T09:00:00.000Z',
    cancelledAt: null,
    currency: 'NGN',
    amountMinor: 2_500_000,
    ...overrides,
  };
}

describe('notifications value', () => {
  it('counts every switch that is on for a member', () => {
    expect(notificationsValue('granted', ALL_ON, true)).toEqual({ label: '5 on', tone: 'muted' });
  });

  it('leaves out the members-only nudge for a free account', () => {
    expect(countNotificationsOn(ALL_ON, false)).toBe(4);
  });

  it('says so when everything is off', () => {
    expect(notificationsValue('granted', ALL_OFF, true).label).toBe('All off');
  });

  it('warns first when the phone refuses notifications', () => {
    expect(notificationsValue('denied', ALL_ON, true)).toEqual({
      label: 'Off on phone',
      tone: 'warning',
    });
  });

  it('still counts while the phone has not been asked yet', () => {
    expect(notificationsValue('undetermined', ALL_ON, true).label).toBe('5 on');
  });
});

describe('membership value', () => {
  it('is Free without membership', () => {
    expect(membershipValue(false, null)).toBe('Free');
  });

  it('says when a renewing plan renews', () => {
    expect(membershipValue(true, subscription({}))).toBe('Renews 3 Nov');
  });

  it('says when a cancelled plan ends', () => {
    expect(membershipValue(true, subscription({ autoRenewing: false }))).toBe('Until 3 Nov');
  });

  it('falls back to Member when the plan has not loaded', () => {
    expect(membershipValue(true, undefined)).toBe('Member');
  });
});

describe('privacy and movement values', () => {
  it('names where you appear', () => {
    expect(privacyValue(true)).toBe('On the board');
    expect(privacyValue(false)).toBe('Hidden');
  });

  it('names the movement link state', () => {
    expect(movementValue('connected')).toBe('Connected');
    expect(movementValue('denied')).toBe('Off');
    expect(movementValue('unknown')).toBe('Not set');
  });
});
