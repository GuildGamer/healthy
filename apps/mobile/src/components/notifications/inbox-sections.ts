import type { InboxNotification, TodayChallenge } from '@product/client';
import { INBOX_COPY } from './constants/inbox';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const SECONDS_PER_MINUTE = 60;

export interface InboxSection {
  title: string;
  notifications: InboxNotification[];
}

/** The device's local calendar day, which is the day the member reads the row on. */
export function localDayKey(at: Date): string {
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${at.getFullYear()}-${month}-${day}`;
}

/** Today and Earlier, newest first within each, leaving out an empty group. */
export function inboxSections(
  notifications: readonly InboxNotification[],
  now: Date = new Date(),
): InboxSection[] {
  const todayKey = localDayKey(now);
  const isToday = (item: InboxNotification) => localDayKey(new Date(item.createdAt)) === todayKey;
  const sections = [
    { title: INBOX_COPY.today, notifications: notifications.filter(isToday) },
    { title: INBOX_COPY.earlier, notifications: notifications.filter((item) => !isToday(item)) },
  ];

  return sections.filter((section) => section.notifications.length > 0);
}

/** Anything with a timer still running: today's photo checks that are open. */
export function openPhotoChecks(
  challenges: readonly TodayChallenge[],
  now: Date = new Date(),
): TodayChallenge[] {
  return challenges.filter(
    (challenge) =>
      challenge.evidenceRequest !== null &&
      Date.parse(challenge.evidenceRequest.expiresAt) > now.getTime(),
  );
}

/** "2m", "3h" today; "Yesterday", "Tuesday", then "12 Oct" before that. */
export function inboxTimeLabel(createdAt: string, now: Date = new Date()): string {
  const then = new Date(createdAt);
  const elapsed = Math.max(0, now.getTime() - then.getTime());

  if (localDayKey(then) === localDayKey(now)) {
    if (elapsed < HOUR_MS) {
      return `${Math.max(1, Math.floor(elapsed / MINUTE_MS))}m`;
    }
    return `${Math.floor(elapsed / HOUR_MS)}h`;
  }

  if (localDayKey(then) === localDayKey(new Date(now.getTime() - DAY_MS))) {
    return 'Yesterday';
  }

  if (elapsed < 6 * DAY_MS) {
    return then.toLocaleDateString('en-GB', { weekday: 'long' });
  }

  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "8:12", for a timer read at a glance. */
export function countdownLabel(secondsLeft: number): string {
  const minutes = Math.floor(secondsLeft / SECONDS_PER_MINUTE);
  const seconds = String(secondsLeft % SECONDS_PER_MINUTE).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
