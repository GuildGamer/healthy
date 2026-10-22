import { occurrenceDetail, todayChallenge } from '@/components/home/testing/today-fixtures';
import { buildRoutine, periodEndLabel } from './routine-layout';
import { catalogChallenge, WALK_TEN } from './testing/catalog-fixtures';

function localIso(hours: number, minutes: number): string {
  return new Date(2026, 9, 22, hours, minutes).toISOString();
}

describe('buildRoutine', () => {
  it('groups what you signed up for by rhythm, leaving out what you did not', () => {
    const routine = buildRoutine({
      catalog: [
        catalogChallenge({ challengeId: 'weigh', isEnrolled: true, frequency: 'weekly' }),
        catalogChallenge({ challengeId: 'walk', isEnrolled: true }),
        catalogChallenge({ challengeId: 'clinic', isEnrolled: true, frequency: 'monthly' }),
        catalogChallenge({ challengeId: 'not-mine' }),
      ],
      occurrences: [],
      details: [],
    });

    expect(routine.groups.map((group) => group.frequency)).toEqual(['daily', 'weekly', 'monthly']);
    expect(
      routine.groups.flatMap((group) => group.rows.map((row) => row.challenge.challengeId)),
    ).toEqual(['walk', 'weigh', 'clinic']);
    expect(routine.isEmpty).toBe(false);
  });

  it('keeps a challenge locked since membership ended in sight, as paused', () => {
    const routine = buildRoutine({
      catalog: [
        catalogChallenge({ challengeId: 'water', isEnrolled: true }),
        catalogChallenge({ challengeId: 'gym', isEnrolled: true, isLocked: true }),
        catalogChallenge({ challengeId: 'locked-not-mine', isLocked: true }),
      ],
      occurrences: [],
      details: [],
    });

    expect(routine.groups[0]?.rows.map((row) => row.challenge.challengeId)).toEqual(['water']);
    expect(routine.paused.map((challenge) => challenge.challengeId)).toEqual(['gym']);
  });

  it('says when a finished one was done and counts it towards its rhythm', () => {
    const routine = buildRoutine({
      catalog: [
        catalogChallenge({ challengeId: 'bp', isEnrolled: true }),
        catalogChallenge({ challengeId: 'push', isEnrolled: true }),
      ],
      occurrences: [
        todayChallenge({ id: 'uc-bp', challengeId: 'bp', status: 'completed' }),
        todayChallenge({ id: 'uc-push', challengeId: 'push' }),
      ],
      details: [occurrenceDetail({ userChallengeId: 'uc-bp', completedAt: localIso(8, 10) })],
    });

    const [group] = routine.groups;
    expect(group?.doneCount).toBe(1);
    expect(group?.rows[0]).toMatchObject({ state: 'done', meta: 'Done at 08:10' });
    expect(group?.rows[1]).toMatchObject({ state: 'open', meta: 'Not yet today' });
  });

  it('shows a walk part-way with its measured minutes and its nudge', () => {
    const routine = buildRoutine({
      catalog: [
        catalogChallenge({
          challengeId: 'walk',
          isEnrolled: true,
          capture: WALK_TEN,
          reminders: [{ id: 'r1', minuteOfDay: 750 }],
        }),
      ],
      occurrences: [todayChallenge({ id: 'uc-walk', challengeId: 'walk', capture: WALK_TEN })],
      details: [occurrenceDetail({ userChallengeId: 'uc-walk', bestMeasuredInPeriod: 4 })],
    });

    expect(routine.groups[0]?.rows[0]).toMatchObject({
      state: 'part',
      meta: '4 of 10 min · reminder 12:30',
    });
  });

  it('gives an open daily its reminder, and an open weekly the day it is due', () => {
    const routine = buildRoutine({
      catalog: [
        catalogChallenge({
          challengeId: 'push',
          isEnrolled: true,
          reminders: [{ id: 'r1', minuteOfDay: 1080 }],
        }),
        catalogChallenge({ challengeId: 'weigh', isEnrolled: true, frequency: 'weekly' }),
      ],
      occurrences: [
        todayChallenge({ id: 'uc-push', challengeId: 'push' }),
        todayChallenge({
          id: 'uc-weigh',
          challengeId: 'weigh',
          frequency: 'weekly',
          periodKey: '2026-10-19',
        }),
      ],
      details: [],
    });

    expect(routine.groups[0]?.rows[0]?.meta).toBe('Reminder 18:00');
    expect(routine.groups[1]?.rows[0]?.meta).toBe('Due by Sunday');
  });

  it('is empty with nothing signed up, paused or not', () => {
    expect(buildRoutine({ catalog: [], occurrences: [], details: [] }).isEmpty).toBe(true);
  });
});

describe('periodEndLabel', () => {
  it('names the last day of a week or a month', () => {
    expect(periodEndLabel('weekly', '2026-10-19')).toBe('Sunday');
    expect(periodEndLabel('monthly', '2026-10-01')).toBe('31 October');
    expect(periodEndLabel('monthly', '2026-02-01')).toBe('28 February');
  });
});
