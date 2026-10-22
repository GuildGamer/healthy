import { formatPoints, formatPointsDelta } from './points-format';

describe('formatPoints', () => {
  it('groups thousands', () => {
    expect(formatPoints(4350)).toBe('4,350');
  });
});

describe('formatPointsDelta', () => {
  it('signs a gain, keeps zero bare, and gives a loss a true minus', () => {
    expect(formatPointsDelta(1750)).toBe('+1,750');
    expect(formatPointsDelta(0)).toBe('0');
    expect(formatPointsDelta(-100)).toBe('−100');
  });
});
