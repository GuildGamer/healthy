import type { HealthLinkStatus, MeOutput } from '@product/client';
import type { MembershipCurrentSubscription } from '@product/contract';
import { formatDayMonth } from '@/lib/format-day';
import type { NotificationPermission } from '@/lib/use-notification-permission';

export type NotificationSwitches = Pick<
  MeOutput,
  | 'reminderEnabled'
  | 'evidenceRemindersEnabled'
  | 'inProgressNudgeEnabled'
  | 'groupNotificationsEnabled'
  | 'promotionalMessagesEnabled'
>;

export interface SettingValue {
  label: string;
  tone: 'muted' | 'warning';
}

/** Finish what you started only counts for members, who are the only ones it reaches. */
export function countNotificationsOn(
  switches: NotificationSwitches,
  hasMembership: boolean,
): number {
  const states = [
    switches.reminderEnabled,
    switches.evidenceRemindersEnabled,
    hasMembership && switches.inProgressNudgeEnabled,
    switches.groupNotificationsEnabled,
    switches.promotionalMessagesEnabled,
  ];
  return states.filter(Boolean).length;
}

/** A refusal in the phone's settings beats every switch, so it shows first. */
export function notificationsValue(
  permission: NotificationPermission,
  switches: NotificationSwitches,
  hasMembership: boolean,
): SettingValue {
  if (permission === 'denied') {
    return { label: 'Off on phone', tone: 'warning' };
  }

  const count = countNotificationsOn(switches, hasMembership);
  if (count === 0) {
    return { label: 'All off', tone: 'muted' };
  }

  return { label: `${count} on`, tone: 'muted' };
}

export function membershipValue(
  hasMembership: boolean,
  subscription: MembershipCurrentSubscription | null | undefined,
): string {
  if (!hasMembership) {
    return 'Free';
  }

  if (!subscription) {
    return 'Member';
  }

  const endsOn = formatDayMonth(subscription.currentPeriodEndsAt);
  return subscription.autoRenewing ? `Renews ${endsOn}` : `Until ${endsOn}`;
}

export function privacyValue(showOnLeaderboard: boolean): string {
  return showOnLeaderboard ? 'On the board' : 'Hidden';
}

const MOVEMENT_VALUES: Record<HealthLinkStatus, string> = {
  connected: 'Connected',
  denied: 'Off',
  unknown: 'Not set',
};

export function movementValue(status: HealthLinkStatus): string {
  return MOVEMENT_VALUES[status];
}
