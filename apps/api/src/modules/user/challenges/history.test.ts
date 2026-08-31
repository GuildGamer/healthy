import { describe, expect, it } from 'vitest';
import { historyEvidence, historyLog, historyOutcome } from './history.js';

describe('historyOutcome', () => {
  it('treats a missing outcome as rewarded', () => {
    expect(historyOutcome('rewarded')).toBe('rewarded');
    expect(historyOutcome('penalized')).toBe('penalized');
    expect(historyOutcome(null)).toBe('rewarded');
  });
});

describe('historyEvidence', () => {
  it('keeps only settled photo-check statuses', () => {
    expect(historyEvidence('submitted')).toBe('submitted');
    expect(historyEvidence('skipped')).toBe('skipped');
    expect(historyEvidence('expired')).toBe('expired');
    expect(historyEvidence('pending')).toBeNull();
    expect(historyEvidence(null)).toBeNull();
  });
});

describe('historyLog', () => {
  it('prefers a blood-pressure reading when one was stored', () => {
    expect(
      historyLog({
        completionKind: 'vitals_bp',
        vitalReading: {
          systolic: 128,
          diastolic: 82,
          pulse: 70,
          notes: 'Morning',
        },
        challengeLogPayload: null,
        deviceActivity: null,
      }),
    ).toEqual({
      kind: 'vitals_bp',
      systolic: 128,
      diastolic: 82,
      pulse: 70,
      notes: 'Morning',
    });
  });

  it('reads a stored glucose payload', () => {
    expect(
      historyLog({
        completionKind: 'glucose',
        vitalReading: null,
        challengeLogPayload: {
          kind: 'glucose',
          fields: { mmolL: 5.4, context: 'fasting' },
        },
        deviceActivity: null,
      }),
    ).toEqual({
      kind: 'glucose',
      mmolL: 5.4,
      context: 'fasting',
    });
  });

  it('reads a stored carbs payload with a note only', () => {
    expect(
      historyLog({
        completionKind: 'carbs',
        vitalReading: null,
        challengeLogPayload: {
          kind: 'carbs',
          fields: { note: 'Rice bowl' },
        },
        deviceActivity: null,
      }),
    ).toEqual({
      kind: 'carbs',
      grams: null,
      note: 'Rice bowl',
    });
  });

  it('maps a device sample', () => {
    expect(
      historyLog({
        completionKind: 'check_in',
        vitalReading: null,
        challengeLogPayload: null,
        deviceActivity: {
          metric: 'walk',
          durationSeconds: 1200,
          distanceMeters: 1600,
          count: null,
        },
      }),
    ).toEqual({
      kind: 'device',
      metric: 'walk',
      durationSeconds: 1200,
      distanceMeters: 1600,
      count: null,
    });
  });

  it('falls back to the completion kind when nothing was logged', () => {
    expect(
      historyLog({
        completionKind: 'check_in',
        vitalReading: null,
        challengeLogPayload: null,
        deviceActivity: null,
      }),
    ).toEqual({ kind: 'check_in' });

    expect(
      historyLog({
        completionKind: 'evidence_photo',
        vitalReading: null,
        challengeLogPayload: null,
        deviceActivity: null,
      }),
    ).toEqual({ kind: 'evidence_photo' });
  });

  it('returns null for an unreadable log on a structured kind', () => {
    expect(
      historyLog({
        completionKind: 'glucose',
        vitalReading: null,
        challengeLogPayload: { kind: 'nope' },
        deviceActivity: null,
      }),
    ).toBeNull();
  });
});
