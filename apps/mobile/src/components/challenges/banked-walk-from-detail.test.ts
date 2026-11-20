import { bankedWalkFromBestMeasured } from './banked-walk-from-detail';

const walkOccurrence = {
  id: 'uc-walk',
  capture: {
    kind: 'device_session' as const,
    metric: 'walk' as const,
    target: { durationMinutes: 10, distanceMeters: null, count: null },
  },
};

describe('bankedWalkFromBestMeasured', () => {
  it('returns null when nothing was measured', () => {
    expect(bankedWalkFromBestMeasured(walkOccurrence, null)).toBeNull();
    expect(bankedWalkFromBestMeasured(walkOccurrence, 0)).toBeNull();
  });

  it('restores minutes as seconds for a duration walk', () => {
    const now = new Date('2026-10-23T12:00:00.000Z');
    expect(bankedWalkFromBestMeasured(walkOccurrence, 8, now)).toEqual({
      durationSeconds: 8 * 60,
      distanceMeters: 0,
      startedAt: 'banked:uc-walk',
      endedAt: now.toISOString(),
    });
  });

  it('restores metres for a distance-only walk', () => {
    const occurrence = {
      id: 'uc-dist',
      capture: {
        kind: 'device_session' as const,
        metric: 'walk' as const,
        target: { durationMinutes: null, distanceMeters: 2000, count: null },
      },
    };

    expect(bankedWalkFromBestMeasured(occurrence, 1200)?.distanceMeters).toBe(1200);
  });
});
