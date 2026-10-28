import { poseDisplayCount, poseMeetsTarget } from './pose-session-count';

describe('poseDisplayCount', () => {
  it('keeps the frozen stop count when live frames climb afterwards', () => {
    expect(poseDisplayCount(null, 12)).toBe(12);
    expect(poseDisplayCount(12, 18)).toBe(12);
  });
});

describe('poseMeetsTarget', () => {
  it('uses the resolved count against the goal', () => {
    expect(poseMeetsTarget({ count: 10, target: 10, isUnscored: false })).toBe(true);
    expect(poseMeetsTarget({ count: 9, target: 10, isUnscored: false })).toBe(false);
    expect(poseMeetsTarget({ count: 1, target: 0, isUnscored: true })).toBe(true);
    expect(poseMeetsTarget({ count: 0, target: 0, isUnscored: true })).toBe(false);
  });
});
