import { stepsHeroValue } from './steps-hero';

describe('stepsHeroValue', () => {
  it('shows zero until the phone reports a count', () => {
    expect(stepsHeroValue(null)).toBe('0');
    expect(stepsHeroValue(0)).toBe('0');
  });

  it('groups a real count', () => {
    expect(stepsHeroValue(1240)).toBe('1,240');
  });
});