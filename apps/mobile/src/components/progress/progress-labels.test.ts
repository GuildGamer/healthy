import type { ProgressDayDetail } from '@product/client';
import { formatPointsDelta } from '@/components/points';
import { dayDetailTotal, daySentence, missedPhotoReason, practiceAmount } from './progress-labels';

const capture = {
  kind: 'self_report' as const,
  metric: null,
  target: { durationMinutes: null, distanceMeters: null, count: null },
};
const mark = {
  challengeId: 'c',
  category: 'general' as const,
  completionKind: 'check_in' as const,
  capture,
};

function detail(overrides: Partial<ProgressDayDetail>): ProgressDayDetail {
  return {
    dayKey: '2026-10-20',
    pointsEarned: 0,
    pointsLost: 0,
    dailyDoneCount: 0,
    dailyDueCount: 0,
    done: [],
    missedPhotoChecks: [],
    practice: [],
    adjustments: [],
    ...overrides,
  };
}

describe('day detail labels', () => {
  it('nets earned, bonus and lost points into the day total', () => {
    const tuesday = detail({
      pointsEarned: 800,
      pointsLost: 100,
      done: [
        {
          ...mark,
          userChallengeId: 'u',
          title: 'Walk',
          completedAt: '2026-10-20T08:00:00.000Z',
          points: 750,
          share: null,
          proofClip: null,
        },
      ],
      adjustments: [{ id: 'a', reason: 'Bonus', points: 50, at: '2026-10-20T09:00:00.000Z' }],
    });

    expect(dayDetailTotal(tuesday)).toBe(700);
    expect(formatPointsDelta(dayDetailTotal(tuesday))).toBe('+700');
  });

  it('says what was earned and what a missed photo check cost', () => {
    const missed = {
      ...mark,
      userChallengeId: 'g',
      title: 'Gym',
      resolution: 'expired' as const,
      windowSeconds: 600,
      pointsLost: 100,
      at: '2026-10-20T18:40:00.000Z',
    };

    expect(
      daySentence(detail({ pointsEarned: 750, pointsLost: 100, missedPhotoChecks: [missed] })),
    ).toBe('750 earned, 100 lost to a missed photo check.');
    expect(daySentence(detail({ pointsEarned: 1500 }))).toBe('1,500 earned.');
    expect(daySentence(detail({}))).toBe('No points moved this day.');
  });

  it('gives the photo check reason in plain words', () => {
    expect(missedPhotoReason({ resolution: 'expired', windowSeconds: 600 })).toBe(
      'No photo within 10 minutes of the check-in.',
    );
    expect(missedPhotoReason({ resolution: 'expired', windowSeconds: 45 })).toBe(
      'No photo within 45 seconds of the check-in.',
    );
    expect(missedPhotoReason({ resolution: 'skipped', windowSeconds: 600 })).toBe(
      'The photo was skipped.',
    );
  });

  it('shows reps for push-up practice and no points for anything else', () => {
    expect(practiceAmount({ metric: 'pushups', count: 14 })).toBe('14 reps');
    expect(practiceAmount({ metric: 'walk', count: null })).toBe('No points');
  });
});
