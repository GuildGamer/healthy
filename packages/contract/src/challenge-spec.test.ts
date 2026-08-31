import { describe, expect, it } from 'vitest';
import { challengeSpecIssue } from './challenge-spec.js';

describe('challengeSpecIssue', () => {
  it('accepts a check-in with self-report', () => {
    expect(
      challengeSpecIssue({
        completionKind: 'check_in',
        captureKind: 'self_report',
        deviceMetric: null,
        targetDurationMinutes: null,
        targetDistanceMeters: null,
        targetCount: null,
      }),
    ).toBeNull();
  });

  it('rejects a photo capture on a check-in', () => {
    expect(
      challengeSpecIssue({
        completionKind: 'check_in',
        captureKind: 'photo',
        deviceMetric: null,
        targetDurationMinutes: null,
        targetDistanceMeters: null,
        targetCount: null,
      }),
    ).toMatch(/photo/i);
  });

  it('requires a metric on device sessions', () => {
    expect(
      challengeSpecIssue({
        completionKind: 'check_in',
        captureKind: 'device_session',
        deviceMetric: null,
        targetDurationMinutes: 10,
        targetDistanceMeters: null,
        targetCount: null,
      }),
    ).toMatch(/metric/i);
  });

  it('requires a target count for push-ups', () => {
    expect(
      challengeSpecIssue({
        completionKind: 'check_in',
        captureKind: 'device_session',
        deviceMetric: 'pushups',
        targetDurationMinutes: null,
        targetDistanceMeters: null,
        targetCount: null,
      }),
    ).toMatch(/target count/i);
  });

  it('accepts a push-up device session with a count target', () => {
    expect(
      challengeSpecIssue({
        completionKind: 'check_in',
        captureKind: 'device_session',
        deviceMetric: 'pushups',
        targetDurationMinutes: null,
        targetDistanceMeters: null,
        targetCount: 20,
      }),
    ).toBeNull();
  });
});
