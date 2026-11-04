import { catalogChallenge } from '@/components/challenges/testing/catalog-fixtures';
import { enrolledStatsMetrics } from './stats-metrics';

describe('enrolledStatsMetrics', () => {
  it('lists enrolled walk, squats, and push-ups in report order', () => {
    expect(
      enrolledStatsMetrics([
        catalogChallenge({
          challengeId: 'walk',
          isEnrolled: true,
          capture: {
            kind: 'device_session',
            metric: 'walk',
            target: { durationMinutes: 10, distanceMeters: null, count: null },
          },
        }),
        catalogChallenge({
          challengeId: 'squats',
          isEnrolled: true,
          capture: {
            kind: 'device_session',
            metric: 'squats',
            target: { durationMinutes: null, distanceMeters: null, count: 20 },
          },
        }),
        catalogChallenge({
          challengeId: 'push',
          isEnrolled: true,
          capture: {
            kind: 'device_session',
            metric: 'pushups',
            target: { durationMinutes: null, distanceMeters: null, count: 20 },
          },
        }),
      ]),
    ).toEqual([
      { metric: 'pushups', title: 'Push-ups' },
      { metric: 'squats', title: 'Squats' },
      { metric: 'walk', title: 'Walking' },
    ]);
  });

  it('drops unenrolled challenges, null metrics, and steps', () => {
    expect(
      enrolledStatsMetrics([
        catalogChallenge({
          challengeId: 'push',
          isEnrolled: true,
          capture: {
            kind: 'device_session',
            metric: 'pushups',
            target: { durationMinutes: null, distanceMeters: null, count: 20 },
          },
        }),
        catalogChallenge({
          challengeId: 'squats-off',
          isEnrolled: false,
          capture: {
            kind: 'device_session',
            metric: 'squats',
            target: { durationMinutes: null, distanceMeters: null, count: 20 },
          },
        }),
        catalogChallenge({
          challengeId: 'water',
          isEnrolled: true,
          capture: {
            kind: 'self_report',
            metric: null,
            target: { durationMinutes: null, distanceMeters: null, count: null },
          },
        }),
        catalogChallenge({
          challengeId: 'steps',
          isEnrolled: true,
          capture: {
            kind: 'device_sample',
            metric: 'steps',
            target: { durationMinutes: null, distanceMeters: null, count: 5_000 },
          },
        }),
      ]),
    ).toEqual([{ metric: 'pushups', title: 'Push-ups' }]);
  });

  it('dedupes two enrolled challenges that share a metric', () => {
    expect(
      enrolledStatsMetrics([
        catalogChallenge({
          challengeId: 'push-a',
          isEnrolled: true,
          capture: {
            kind: 'device_session',
            metric: 'pushups',
            target: { durationMinutes: null, distanceMeters: null, count: 20 },
          },
        }),
        catalogChallenge({
          challengeId: 'push-b',
          isEnrolled: true,
          capture: {
            kind: 'device_session',
            metric: 'pushups',
            target: { durationMinutes: null, distanceMeters: null, count: 40 },
          },
        }),
      ]),
    ).toEqual([{ metric: 'pushups', title: 'Push-ups' }]);
  });
});
