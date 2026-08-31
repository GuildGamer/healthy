import { podiumMedalColor } from './podium';

describe('podiumMedalColor', () => {
  it('colours the top three and ignores the rest of the page', () => {
    expect(podiumMedalColor(1)).toBe('#FACC15');
    expect(podiumMedalColor(2)).toBe('#CBD5E1');
    expect(podiumMedalColor(3)).toBe('#D97706');
    expect(podiumMedalColor(4)).toBeUndefined();
    expect(podiumMedalColor(0)).toBeUndefined();
  });
});
