import { clampPushupTarget, stepPushupTarget } from './pushup-target';

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

describe('stepPushupTarget', () => {
  it('steps up and down without leaving the range', () => {
    expect(stepPushupTarget(20, 1)).toBe(21);
    expect(stepPushupTarget(1, -1)).toBe(1);
    expect(stepPushupTarget(100, 1)).toBe(100);
  });
});
