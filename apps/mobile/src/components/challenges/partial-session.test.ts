import type { TodayChallenge } from '@product/client';
import {
  matchAttemptClientId,
  partialSetSession,
  partialWalkSession,
} from './partial-session';

const noTarget = { durationMinutes: null, distanceMeters: null, count: null };

function occurrence(metric: 'walk' | 'run'): Pick<TodayChallenge, 'id' | 'capture'> {
  return {
    id: 'uc-walk',
    capture: { kind: 'device_session', metric, target: { ...noTarget, durationMinutes: 10 } },
  };
}

const walk = {
  durationSeconds: 252,
  distanceMeters: 380,
  startedAt: '2026-10-22T08:00:00.000Z',
  endedAt: '2026-10-22T08:04:12.000Z',
};

describe('partial sessions', () => {
  it('mints a stable contest attempt id from match and start time', () => {
    expect(matchAttemptClientId('pose', 'm1', '2026-11-08T09:00:00.000Z')).toBe(
      'match-attempt:m1:2026-11-08T09:00:00.000Z',
    );
    expect(matchAttemptClientId('walk', 'm1', '2026-11-08T09:00:00.000Z')).toBe(
      'match-walk:m1:2026-11-08T09:00:00.000Z',
    );
  });

  it('keeps a short walk under the same id its final submit will use', () => {
    expect(partialWalkSession(occurrence('walk'), walk)).toEqual({
      metric: 'walk',
      source: 'in_app_gps',
      durationSeconds: 252,
      distanceMeters: 380,
      startedAt: walk.startedAt,
      endedAt: walk.endedAt,
      externalId: 'in-app-gps:uc-walk:2026-10-22T08:00:00.000Z',
    });
  });

  it('keeps nothing when there is nothing measured, or the activity is not a walk', () => {
    expect(partialWalkSession(occurrence('walk'), { ...walk, durationSeconds: 0 })).toBeNull();
    expect(partialWalkSession(occurrence('run'), walk)).toBeNull();
  });

  it('keeps a short set with its real exercise, and skips a set with none', () => {
    const set = {
      durationSeconds: 41,
      startedAt: walk.startedAt,
      endedAt: walk.endedAt,
      metric: 'squats' as const,
    };

    expect(partialSetSession({ id: 'uc-squat' }, { ...set, count: 14 })).toMatchObject({
      metric: 'squats',
      source: 'in_app_pose',
      count: 14,
      externalId: 'in-app-pose:uc-squat:2026-10-22T08:00:00.000Z',
    });
    expect(partialSetSession({ id: 'uc-squat' }, { ...set, count: 0 })).toBeNull();
  });
});
