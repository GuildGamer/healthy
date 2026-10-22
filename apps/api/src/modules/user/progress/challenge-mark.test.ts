import { describe, expect, it } from 'vitest';
import { challengeMarkFor, challengeTitleFor } from './challenge-mark.js';

const walkChallenge = {
  title: 'Ten-minute walk',
  category: 'general' as const,
  completionKind: 'check_in' as const,
  captureKind: 'device_session' as const,
  deviceMetric: 'walk' as const,
  targetDurationMinutes: 10,
  targetDistanceMeters: null,
  targetCount: null,
  surpriseEvidenceWindowSeconds: 600,
};

const pushupChallenge = {
  ...walkChallenge,
  title: 'Do 20 push-ups',
  captureKind: 'device_session' as const,
  deviceMetric: 'pushups' as const,
  targetDurationMinutes: null,
  targetCount: 20,
};

describe('challengeMarkFor', () => {
  it('marks a walk with the person’s own minutes', () => {
    const mark = challengeMarkFor({
      challengeId: 'walk',
      enrollment: { targetCount: null, targetDurationMinutes: 25 },
      challenge: walkChallenge,
    });

    expect(mark.capture.target.durationMinutes).toBe(25);
  });

  it('falls back to the catalog goals without an enrolment', () => {
    const mark = challengeMarkFor({
      challengeId: 'walk',
      enrollment: null,
      challenge: walkChallenge,
    });

    expect(mark.capture.target).toEqual({ durationMinutes: 10, distanceMeters: null, count: null });
  });

  it('marks push-ups with the person’s own count', () => {
    const mark = challengeMarkFor({
      challengeId: 'pushups',
      enrollment: { targetCount: 12, targetDurationMinutes: null },
      challenge: pushupChallenge,
    });

    expect(mark.capture.target.count).toBe(12);
  });
});

describe('challengeTitleFor', () => {
  it('names push-ups by the person’s own count', () => {
    const title = challengeTitleFor({
      challengeId: 'pushups',
      enrollment: { targetCount: 12, targetDurationMinutes: null },
      challenge: pushupChallenge,
    });

    expect(title).toBe('Do 12 push-ups');
  });
});
