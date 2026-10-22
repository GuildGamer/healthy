import { clampPushupTarget } from './pushup-target';

describe('clampPushupTarget', () => {
  it('keeps a count inside the allowed range', () => {
    expect(clampPushupTarget(12)).toBe(12);
  });

  it('clamps to the bounds', () => {
    expect(clampPushupTarget(0)).toBe(1);
    expect(clampPushupTarget(240)).toBe(100);
  });

  it('falls back when the value is not a number', () => {
    expect(clampPushupTarget(Number.NaN)).toBe(20);
  });
});
