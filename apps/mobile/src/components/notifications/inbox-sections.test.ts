import type { InboxNotification, TodayChallenge } from '@product/client';
import {
  countdownLabel,
  inboxSections,
  inboxTimeLabel,
  localDayKey,
  openPhotoChecks,
} from './inbox-sections';

const now = new Date(2026, 9, 22, 12, 0, 0);

function note(id: string, createdAt: Date): InboxNotification {
  return {
    id,
    kind: 'reminder',
    title: id,
    body: '',
    isRead: true,
    createdAt: createdAt.toISOString(),
  };
}

function challenge(expiresAt: string | null): TodayChallenge {
  return {
    evidenceRequest: expiresAt ? { expiresAt, windowSeconds: 600, penaltyPoints: 100 } : null,
  } as TodayChallenge;
}

describe('inboxSections', () => {
  it('groups by Today and Earlier and leaves out an empty group', () => {
    const sections = inboxSections(
      [note('cheer', new Date(2026, 9, 22, 11, 0)), note('ended', new Date(2026, 9, 21, 18, 0))],
      now,
    );

    expect(
      sections.map((section) => [section.title, section.notifications.map((item) => item.id)]),
    ).toEqual([
      ['Today', ['cheer']],
      ['Earlier', ['ended']],
    ]);
    expect(
      inboxSections([note('ended', new Date(2026, 9, 20))], now).map((section) => section.title),
    ).toEqual(['Earlier']);
  });
});

describe('openPhotoChecks', () => {
  it('keeps only photo checks whose timer is still running', () => {
    const open = challenge(new Date(now.getTime() + 60_000).toISOString());
    const closed = challenge(new Date(now.getTime() - 60_000).toISOString());

    expect(openPhotoChecks([open, closed, challenge(null)], now)).toEqual([open]);
  });
});

describe('inbox labels', () => {
  it('reads times short today and by day before that', () => {
    expect(inboxTimeLabel(new Date(2026, 9, 22, 11, 58).toISOString(), now)).toBe('2m');
    expect(inboxTimeLabel(new Date(2026, 9, 22, 9, 0).toISOString(), now)).toBe('3h');
    expect(inboxTimeLabel(new Date(2026, 9, 21, 20, 0).toISOString(), now)).toBe('Yesterday');
    expect(inboxTimeLabel(new Date(2026, 9, 20, 9, 0).toISOString(), now)).toBe('Tuesday');
  });

  it('counts a timer down in minutes and seconds', () => {
    expect(countdownLabel(492)).toBe('8:12');
    expect(countdownLabel(5)).toBe('0:05');
  });

  it('keys a day by the device calendar', () => {
    expect(localDayKey(now)).toBe('2026-10-22');
  });
});
