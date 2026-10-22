import {
  MATCH_CUSTOM_DAYS_DEFAULT,
  clampCustomDays,
  legalChoiceFor,
  lengthEndHint,
  matchLengthInput,
} from './match-length';

describe('clampCustomDays', () => {
  it('keeps a length inside the range the contract accepts', () => {
    expect(clampCustomDays(90, 'best_single')).toBe(90);
    expect(clampCustomDays(0, 'best_single')).toBe(1);
    expect(clampCustomDays(900, 'best_single')).toBe(365);
  });

  it('holds a streak contest above one day', () => {
    expect(clampCustomDays(1, 'days_completed')).toBe(2);
  });

  it('falls back when the typed value is not a number', () => {
    expect(clampCustomDays(Number.NaN, 'best_single')).toBe(MATCH_CUSTOM_DAYS_DEFAULT);
  });
});

describe('legalChoiceFor', () => {
  it('leaves a preset the mode can run', () => {
    expect(legalChoiceFor({ kind: 'preset', window: 'today' }, 'best_single')).toEqual({
      kind: 'preset',
      window: 'today',
    });
  });

  it('moves off a preset the mode cannot run', () => {
    expect(legalChoiceFor({ kind: 'preset', window: 'today' }, 'days_completed')).toEqual({
      kind: 'preset',
      window: 'week',
    });
  });

  // Switching to a streak contest must not silently leave an illegal day count
  // sitting in the field.
  it('lifts a custom length up to the mode floor', () => {
    expect(legalChoiceFor({ kind: 'custom', days: 1 }, 'days_completed')).toEqual({
      kind: 'custom',
      days: 2,
    });
  });
});

describe('matchLengthInput', () => {
  it('sends a preset as a window', () => {
    expect(matchLengthInput({ kind: 'preset', window: 'month' })).toEqual({
      window: 'month',
    });
  });

  it('sends a custom length as days, with no window alongside it', () => {
    expect(matchLengthInput({ kind: 'custom', days: 45 })).toEqual({
      durationDays: 45,
    });
  });
});

describe('lengthEndHint', () => {
  const thursday = new Date('2026-10-22T12:00:00.000Z');

  it('says when each length would end', () => {
    expect(lengthEndHint({ kind: 'preset', window: 'today' }, thursday)).toBe('Ends at midnight');
    expect(lengthEndHint({ kind: 'preset', window: 'week' }, thursday)).toBe('Ends next Thursday');
    expect(lengthEndHint({ kind: 'preset', window: 'month' }, thursday)).toBe('Ends 21 November');
  });
});
