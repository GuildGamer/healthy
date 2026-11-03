import {
  deviceSampleFromWalkWorkout,
  isHealthConnectWalkExerciseType,
  isHealthKitWalkActivityType,
  sortWalkSamplesLongestFirst,
} from './walk-health-samples';

describe('walk-health-samples', () => {
  it('keeps walking and hiking HealthKit activity types only', () => {
    expect(isHealthKitWalkActivityType(52)).toBe(true);
    expect(isHealthKitWalkActivityType(24)).toBe(true);
    expect(isHealthKitWalkActivityType(37)).toBe(false);
  });

  it('keeps walking and hiking Health Connect exercise types only', () => {
    expect(isHealthConnectWalkExerciseType(79)).toBe(true);
    expect(isHealthConnectWalkExerciseType(37)).toBe(true);
    expect(isHealthConnectWalkExerciseType(56)).toBe(false);
  });

  it('maps a healthkit workout into a DeviceSample with duration and distance', () => {
    const sample = deviceSampleFromWalkWorkout({
      source: 'healthkit',
      externalId: 'healthkit:abc-123',
      startedAt: new Date('2026-09-22T09:00:00.000Z'),
      endedAt: new Date('2026-09-22T09:12:00.000Z'),
      durationSeconds: 720,
      distanceMeters: 1_050.4,
    });

    expect(sample).toEqual({
      source: 'healthkit',
      metric: 'walk',
      durationSeconds: 720,
      distanceMeters: 1050,
      startedAt: '2026-09-22T09:00:00.000Z',
      endedAt: '2026-09-22T09:12:00.000Z',
      externalId: 'healthkit:abc-123',
      label: '12 min walk from Apple Health',
    });
  });

  it('derives duration from end − start when the store omits it', () => {
    const sample = deviceSampleFromWalkWorkout({
      source: 'health_connect',
      externalId: 'health_connect:sess-1',
      startedAt: new Date('2026-09-22T10:00:00.000Z'),
      endedAt: new Date('2026-09-22T10:10:30.000Z'),
    });

    expect(sample?.durationSeconds).toBe(630);
    expect(sample?.label).toBe('11 min walk from Health Connect');
    expect(sample?.distanceMeters).toBeUndefined();
  });

  it('rejects unusable times or empty external ids', () => {
    expect(
      deviceSampleFromWalkWorkout({
        source: 'healthkit',
        externalId: '  ',
        startedAt: new Date('2026-09-22T09:00:00.000Z'),
        endedAt: new Date('2026-09-22T09:10:00.000Z'),
      }),
    ).toBeNull();

    expect(
      deviceSampleFromWalkWorkout({
        source: 'healthkit',
        externalId: 'healthkit:x',
        startedAt: new Date('2026-09-22T09:10:00.000Z'),
        endedAt: new Date('2026-09-22T09:00:00.000Z'),
      }),
    ).toBeNull();
  });

  it('sorts samples longest duration first', () => {
    const short = deviceSampleFromWalkWorkout({
      source: 'healthkit',
      externalId: 'healthkit:short',
      startedAt: new Date('2026-09-22T09:00:00.000Z'),
      endedAt: new Date('2026-09-22T09:05:00.000Z'),
      durationSeconds: 300,
    });
    const long = deviceSampleFromWalkWorkout({
      source: 'healthkit',
      externalId: 'healthkit:long',
      startedAt: new Date('2026-09-22T08:00:00.000Z'),
      endedAt: new Date('2026-09-22T08:20:00.000Z'),
      durationSeconds: 1_200,
    });

    expect(short && long).toBeTruthy();
    expect(sortWalkSamplesLongestFirst([short!, long!]).map((item) => item.externalId)).toEqual([
      'healthkit:long',
      'healthkit:short',
    ]);
  });
});
