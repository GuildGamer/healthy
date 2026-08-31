import { describe, expect, it } from 'vitest';
import { fieldProgress } from './challenge-logging';

describe('fieldProgress', () => {
  it('treats a completed occurrence as finished', () => {
    expect(
      fieldProgress({
        completionKind: 'vitals_bp',
        status: 'completed',
        draft: null,
      }),
    ).toEqual({ filled: 1, required: 1 });
  });

  it('counts systolic and diastolic on a blood-pressure draft', () => {
    expect(
      fieldProgress({
        completionKind: 'vitals_bp',
        status: 'in_progress',
        draft: { kind: 'vitals_bp', fields: { systolic: 120 } },
      }),
    ).toEqual({ filled: 1, required: 2 });
  });

  it('counts a gym photo as 0/1 until they submit', () => {
    expect(
      fieldProgress({
        completionKind: 'evidence_photo',
        status: 'in_progress',
        draft: { kind: 'evidence_photo', fields: {} },
      }),
    ).toEqual({ filled: 0, required: 1 });
  });

  it('counts carbs as done when either grams or a note is present', () => {
    expect(
      fieldProgress({
        completionKind: 'carbs',
        status: 'in_progress',
        draft: { kind: 'carbs', fields: { note: 'Rice bowl' } },
      }),
    ).toEqual({ filled: 1, required: 1 });
  });
});
