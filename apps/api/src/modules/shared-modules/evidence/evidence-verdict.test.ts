import { describe, expect, it } from 'vitest';
import { REJECT_NOT_GYM, REJECT_UNAVAILABLE, parseVerdict } from './evidence-verdict.js';

describe('parseVerdict', () => {
  it('accepts a true verdict', () => {
    expect(parseVerdict('{"accepted":true}')).toEqual({ accepted: true });
  });

  it('keeps the model reason when the photo is rejected', () => {
    expect(parseVerdict('{"accepted":false,"reason":"That looks like a park."}')).toEqual({
      accepted: false,
      reason: 'That looks like a park.',
    });
  });

  it('uses the gym fallback when the model omits a reason', () => {
    expect(parseVerdict('{"accepted":false}')).toEqual({
      accepted: false,
      reason: REJECT_NOT_GYM,
    });
  });

  it('fails closed on a missing or unreadable body', () => {
    expect(parseVerdict(null)).toEqual({ accepted: false, reason: REJECT_UNAVAILABLE });
    expect(parseVerdict('not json')).toEqual({ accepted: false, reason: REJECT_UNAVAILABLE });
    expect(parseVerdict('{"reason":"no"}')).toEqual({
      accepted: false,
      reason: REJECT_UNAVAILABLE,
    });
  });
});
