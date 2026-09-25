import type { TodayChallenge } from '@product/client';
import {
  buildChallengeFocusLayout,
  buildTodayWin,
  DAILY_WIN_TARGET,
  focusSectionLabel,
  sortOpenChallengesByFocus,
  UP_NEXT_LIMIT,
} from './challenge-list-layout';

const pushupCapture = {
  kind: 'device_session',
  metric: 'pushups',
  target: { durationMinutes: null, distanceMeters: null, count: 20 },
} as const;

function challenge(overrides: Partial<TodayChallenge> = {}): TodayChallenge {
  return {
    id: 'uc1',
    challengeId: 'c1',
    title: 'Walk',
    description: '',
    category: 'general',
    rewardPoints: 20,
    sortOrder: 100,
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

  it('prefers marketing sort order before capture ease when status matches', () => {
    const sorted = sortOpenChallengesByFocus([
      challenge({
        id: 'hard',
        title: 'Gym',
        status: 'pending',
        sortOrder: 100,
        capture: {
          kind: 'self_report',
          metric: null,
          target: { durationMinutes: null, distanceMeters: null, count: null },
        },
      }),
      challenge({
        id: 'hero',
        title: 'Push-ups',
        status: 'pending',
        sortOrder: 0,
        capture: {
          kind: 'device_session',
          metric: 'pushups',
          target: { durationMinutes: null, distanceMeters: null, count: 20 },
        },
      }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['hero', 'hard']);
  });

  it('prefers marketing sort order before weekly cadence when status matches', () => {
    const sorted = sortOpenChallengesByFocus([
      challenge({
        id: 'weekly',
        title: 'Weekly weigh-in',
        status: 'pending',
        frequency: 'weekly',
        sortOrder: 100,
      }),
      challenge({
        id: 'hero',
        title: 'Push-ups',
        status: 'pending',
        frequency: 'daily',
        sortOrder: 0,
        capture: {
          kind: 'device_session',
          metric: 'pushups',
          target: { durationMinutes: null, distanceMeters: null, count: 20 },
        },
      }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['hero', 'weekly']);
  });

  it('prefers easier captures when status and sort order match', () => {
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

  it('lets members finish every enrollment before locking', () => {
    expect(buildTodayWin(3, 6, true)).toEqual({
      filled: 3,
      target: 6,
      locked: false,
      label: "Today's win · 3 of 6",
      heroMetaSuffix: "3/6 today's win",
    });
  });

  it('shows all-done copy when a member finishes every challenge', () => {
    expect(buildTodayWin(6, 6, true).label).toBe('All done today');
    expect(buildTodayWin(6, 6, true).heroMetaSuffix).toBe('all done today');
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
    expect(layout.repeatable).toEqual([]);
    expect(layout.openCount).toBe(5);
    expect(layout.win.label).toBe("Today's win · 1 of 2");
    expect(layout.hasMoreBeyondPreview).toBe(true);
    expect(UP_NEXT_LIMIT).toBe(2);
  });

  it('keeps a finished push-up challenge out of the archive', () => {
    const layout = buildChallengeFocusLayout([
      challenge({ id: 'open', title: 'Water', status: 'pending' }),
      challenge({
        id: 'pushups',
        title: 'Push-ups',
        status: 'completed',
        capture: pushupCapture,
      }),
      challenge({ id: 'walk', title: 'Walk', status: 'completed' }),
    ]);

    expect(layout.focus?.id).toBe('open');
    expect(layout.repeatable.map((item) => item.id)).toEqual(['pushups']);
    // Only the challenge with nothing left to give is collapsible.
    expect(layout.done.map((item) => item.id)).toEqual(['walk']);
  });

  it('counts every finished challenge toward the win, repeatable or not', () => {
    const layout = buildChallengeFocusLayout([
      challenge({ id: 'open', title: 'Water', status: 'pending' }),
      challenge({
        id: 'pushups',
        title: 'Push-ups',
        status: 'completed',
        capture: pushupCapture,
      }),
      challenge({ id: 'walk', title: 'Walk', status: 'completed' }),
    ]);

    expect(layout.win.filled).toBe(2);
    expect(layout.win.locked).toBe(true);
  });

  it('promotes the repeatable set to focus once the scored day is over', () => {
    const layout = buildChallengeFocusLayout([
      challenge({
        id: 'pushups',
        title: 'Push-ups',
        status: 'completed',
        capture: pushupCapture,
      }),
      challenge({ id: 'walk', title: 'Walk', status: 'completed' }),
    ]);

    expect(layout.focus?.id).toBe('pushups');
    expect(layout.openCount).toBe(0);
    // Promoted into focus, so it must not also list below.
    expect(layout.repeatable).toEqual([]);
  });

  it('leaves focus empty when a finished day has nothing repeatable', () => {
    const layout = buildChallengeFocusLayout([
      challenge({ id: 'walk', title: 'Walk', status: 'completed' }),
    ]);

    expect(layout.focus).toBeNull();
    expect(layout.done.map((item) => item.id)).toEqual(['walk']);
  });
});

describe('focusSectionLabel', () => {
  it('switches from the scored day to the free set that follows', () => {
    expect(focusSectionLabel(challenge({ status: 'pending' }))).toBe('Do next');
    expect(focusSectionLabel(challenge({ status: 'completed' }))).toBe(
      'Go again',
    );
    expect(focusSectionLabel(null)).toBe('Do next');
  });
});
