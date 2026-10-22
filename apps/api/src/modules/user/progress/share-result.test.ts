import { describe, expect, it } from 'vitest';
import { shareResultFor } from './share-result.js';

const empty = {
  completionKind: 'check_in',
  deviceActivity: null,
  challengeLogPayload: null,
};

describe('shareResultFor', () => {
  it('keeps reps, minutes, glasses, and a gym check-in', () => {
    expect(
      shareResultFor({
        ...empty,
        deviceActivity: { metric: 'pushups', durationSeconds: 40, count: 22 },
      }),
    ).toEqual({ kind: 'reps', count: 22 });

    expect(
      shareResultFor({
        ...empty,
        deviceActivity: { metric: 'walk', durationSeconds: 90, count: null },
      }),
    ).toEqual({ kind: 'minutes', minutes: 1 });

    expect(
      shareResultFor({
        ...empty,
        completionKind: 'water',
        challengeLogPayload: { kind: 'water', fields: { amount: 6, unit: 'glasses' } },
      }),
    ).toEqual({ kind: 'glasses', count: 6 });

    expect(shareResultFor({ ...empty, completionKind: 'evidence_photo' })).toEqual({
      kind: 'gym',
    });
  });

  it('drops readings, notes, and anything else that is not a shareable result', () => {
    expect(
      shareResultFor({
        ...empty,
        completionKind: 'glucose',
        challengeLogPayload: {
          kind: 'glucose',
          fields: { mmolL: 5.4, context: 'fasting' },
        },
      }),
    ).toBeNull();

    expect(
      shareResultFor({
        ...empty,
        completionKind: 'vitals_bp',
        challengeLogPayload: { systolic: 128, diastolic: 82, notes: 'With Sam' },
      }),
    ).toBeNull();

    expect(
      shareResultFor({
        ...empty,
        completionKind: 'peak_flow',
        challengeLogPayload: { kind: 'peak_flow', fields: { bestLitresPerMinute: 420 } },
      }),
    ).toBeNull();

    expect(
      shareResultFor({
        ...empty,
        deviceActivity: { metric: 'heart_rate', durationSeconds: null, count: 72 },
      }),
    ).toBeNull();

    expect(
      shareResultFor({
        ...empty,
        completionKind: 'water',
        challengeLogPayload: { kind: 'water', fields: { amount: 900, unit: 'ml' } },
      }),
    ).toBeNull();
  });
});
