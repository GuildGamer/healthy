import {
  aggregateLastNightSleep,
  lastNightSleepQueryBounds,
  type SleepInterval,
} from './sleep-health-aggregate';

function interval(
  startIso: string,
  endIso: string,
  kind: SleepInterval['kind'] = 'asleep',
): SleepInterval {
  return {
    startMs: Date.parse(startIso),
    endMs: Date.parse(endIso),
    kind,
  };
}

describe('lastNightSleepQueryBounds', () => {
  it('spans 18:00 yesterday to 12:00 today in local time', () => {
    const now = new Date(2026, 9, 23, 9, 30, 0, 0);
    const { start, end } = lastNightSleepQueryBounds(now);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(9);
    expect(start.getDate()).toBe(22);
    expect(start.getHours()).toBe(18);
    expect(start.getMinutes()).toBe(0);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(9);
    expect(end.getDate()).toBe(23);
    expect(end.getHours()).toBe(12);
    expect(end.getMinutes()).toBe(0);
  });
});

describe('aggregateLastNightSleep', () => {
  it('returns null for an empty window', () => {
    expect(aggregateLastNightSleep([])).toBeNull();
  });

  it('merges overlapping asleep segments into one night', () => {
    const night = aggregateLastNightSleep([
      interval('2026-10-22T22:00:00.000Z', '2026-10-23T02:00:00.000Z'),
      interval('2026-10-23T01:30:00.000Z', '2026-10-23T06:00:00.000Z'),
    ]);

    expect(night).toEqual({
      wentToBedAt: '2026-10-22T22:00:00.000Z',
      wokeUpAt: '2026-10-23T06:00:00.000Z',
      durationMinutes: 8 * 60,
      inBedOnly: false,
    });
  });

  it('excludes awake gaps by only merging asleep segments', () => {
    const night = aggregateLastNightSleep([
      interval('2026-10-22T23:00:00.000Z', '2026-10-23T02:00:00.000Z', 'asleep'),
      // Awake 02:00–03:00 is never passed in.
      interval('2026-10-23T03:00:00.000Z', '2026-10-23T07:00:00.000Z', 'asleep'),
    ]);

    // Two disjoint blocks — longest wins (4h evening vs 3h early).
    expect(night?.wentToBedAt).toBe('2026-10-23T03:00:00.000Z');
    expect(night?.wokeUpAt).toBe('2026-10-23T07:00:00.000Z');
    expect(night?.durationMinutes).toBe(4 * 60);
    expect(night?.inBedOnly).toBe(false);
  });

  it('picks the longest contiguous night when several exist', () => {
    const night = aggregateLastNightSleep([
      interval('2026-10-22T19:00:00.000Z', '2026-10-22T20:00:00.000Z'), // nap 1h
      interval('2026-10-22T23:00:00.000Z', '2026-10-23T07:00:00.000Z'), // night 8h
    ]);

    expect(night?.durationMinutes).toBe(8 * 60);
    expect(night?.wentToBedAt).toBe('2026-10-22T23:00:00.000Z');
  });

  it('falls back to in-bed when there are no asleep stages', () => {
    const night = aggregateLastNightSleep([
      interval('2026-10-22T22:30:00.000Z', '2026-10-23T06:30:00.000Z', 'in_bed'),
    ]);

    expect(night).toEqual({
      wentToBedAt: '2026-10-22T22:30:00.000Z',
      wokeUpAt: '2026-10-23T06:30:00.000Z',
      durationMinutes: 8 * 60,
      inBedOnly: true,
    });
  });

  it('prefers asleep over in-bed when both exist', () => {
    const night = aggregateLastNightSleep([
      interval('2026-10-22T22:00:00.000Z', '2026-10-23T07:00:00.000Z', 'in_bed'),
      interval('2026-10-22T23:00:00.000Z', '2026-10-23T06:00:00.000Z', 'asleep'),
    ]);

    expect(night?.inBedOnly).toBe(false);
    expect(night?.wentToBedAt).toBe('2026-10-22T23:00:00.000Z');
    expect(night?.wokeUpAt).toBe('2026-10-23T06:00:00.000Z');
    expect(night?.durationMinutes).toBe(7 * 60);
  });
});
