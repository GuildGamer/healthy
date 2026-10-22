import type { TodayChallenge } from '@product/client';
import { outcomeAfterPhotoCheck, photoCheckClock, photoCheckTimeLabel } from './photo-check';

const noTarget = { durationMinutes: null, distanceMeters: null, count: null };

describe('photo check', () => {
  it('draws the time left as a share of the window', () => {
    const now = Date.parse('2026-10-22T08:10:00.000Z');
    const clock = photoCheckClock(
      { expiresAt: '2026-10-22T08:10:45.000Z', windowSeconds: 60, penaltyPoints: 25 },
      now,
    );

    expect(clock).toEqual({ secondsLeft: 45, fraction: 0.75 });
  });

  it('never counts below zero', () => {
    const clock = photoCheckClock(
      { expiresAt: '2026-10-22T08:00:00.000Z', windowSeconds: 60, penaltyPoints: 25 },
      Date.parse('2026-10-22T08:10:00.000Z'),
    );

    expect(clock.secondsLeft).toBe(0);
  });

  it('says one second in the singular', () => {
    expect(photoCheckTimeLabel(1)).toBe('1 second');
    expect(photoCheckTimeLabel(52)).toBe('52 seconds');
  });

  it('turns the card over as the act it checked', () => {
    const capture = { kind: 'structured_log', metric: null, target: noTarget } as const;
    const at = new Date('2026-10-22T08:10:00.000Z');

    expect(
      outcomeAfterPhotoCheck({ completionKind: 'vitals_bp', capture } as TodayChallenge, at),
    ).toEqual({
      kind: 'logged',
      loggedAt: at.toISOString(),
    });
    expect(outcomeAfterPhotoCheck({ completionKind: 'water', capture } as TodayChallenge)).toEqual({
      kind: 'water',
      glasses: 8,
    });
    expect(
      outcomeAfterPhotoCheck({ completionKind: 'check_in', capture } as TodayChallenge),
    ).toEqual({
      kind: 'checkedIn',
    });
  });
});
