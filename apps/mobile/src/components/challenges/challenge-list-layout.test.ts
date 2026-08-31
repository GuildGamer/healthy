import type { TodayChallenge } from '@product/client';
import {
  buildChallengeFocusLayout,
  buildTodayWin,
  DAILY_WIN_TARGET,
  sortOpenChallengesByFocus,
  UP_NEXT_LIMIT,
} from './challenge-list-layout';

function challenge(overrides: Partial<TodayChallenge> = {}): TodayChallenge {
  return {
    id: 'uc1',
    challengeId: 'c1',
    title: 'Walk',
    description: '',
    category: 'general',
    rewardPoints: 20,
    status: 'pending',
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: '',
    icon: 'walk',
    periodKey: '2026-08-28',
    evidenceRequest: null,
    draft: null,
    progress: { filled: 0, required: 1 },
    capture: {
      kind: 'self_report',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

describe('sortOpenChallengesByFocus', () => {
  it('puts evidence and in-progress ahead of pending', () => {
    const sorted = sortOpenChallengesByFocus([
      challenge({ id: 'a', title: 'Alpha', status: 'pending' }),
      challenge({ id: 'b', title: 'Beta', status: 'awaiting_evidence' }),
      challenge({ id: 'c', title: 'Charlie', status: 'in_progress' }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('prefers easier captures when status matches', () => {
    const sorted = sortOpenChallengesByFocus([
      challenge({
        id: 'hard',
        title: 'Gym',
        status: 'pending',
        capture: {
          kind: 'photo',
          metric: null,
          target: { durationMinutes: null, distanceMeters: null, count: null },
        },
      }),
      challenge({
        id: 'easy',
        title: 'Water',
        status: 'pending',
        capture: {
          kind: 'self_report',
          metric: null,
          target: { durationMinutes: null, distanceMeters: null, count: null },
        },
      }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['easy', 'hard']);
  });
});

describe('buildTodayWin', () => {
  it('caps the finish line at the daily win target', () => {
    expect(buildTodayWin(1, 6)).toEqual({
      filled: 1,
      target: DAILY_WIN_TARGET,
      locked: false,
      label: "Today's win · 1 of 2",
      heroMetaSuffix: "1/2 today's win",
    });
  });

  it('locks when the capped target is met', () => {
    expect(buildTodayWin(3, 6).locked).toBe(true);
    expect(buildTodayWin(3, 6).label).toBe('Win locked');
  });

  it('shrinks the target when fewer challenges exist', () => {
    expect(buildTodayWin(0, 1).target).toBe(1);
  });
});

describe('buildChallengeFocusLayout', () => {
  it('surfaces one focus and parks the rest', () => {
    const layout = buildChallengeFocusLayout([
      challenge({
        id: 'week',
        title: 'Weigh in',
        frequency: 'weekly',
        status: 'pending',
      }),
      challenge({
        id: 'pending',
        title: 'Water',
        status: 'pending',
      }),
      challenge({
        id: 'progress',
        title: 'Walk',
        status: 'in_progress',
      }),
      challenge({
        id: 'extra',
        title: 'Stretch',
        status: 'pending',
      }),
      challenge({
        id: 'extra2',
        title: 'Yoga',
        status: 'pending',
      }),
      challenge({
        id: 'done',
        title: 'Done daily',
        status: 'completed',
      }),
    ]);

    expect(layout.focus?.id).toBe('progress');
    expect(layout.upNext.map((item) => item.id)).toEqual(['extra', 'pending']);
    expect(layout.alsoAvailable.map((item) => item.id)).toEqual(['extra2']);
    expect(layout.weekly.map((item) => item.id)).toEqual(['week']);
    expect(layout.done.map((item) => item.id)).toEqual(['done']);
    expect(layout.win.label).toBe("Today's win · 1 of 2");
    expect(layout.hasMoreBeyondPreview).toBe(true);
    expect(UP_NEXT_LIMIT).toBe(2);
  });
});
