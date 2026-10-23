import { lightColors } from '@product/brand';
import { stepsCardCopy } from './steps-session-card';
import { walkCardAppearance } from './walk-session-card';

describe('stepsCardCopy', () => {
  it('leads with the step count and the goal underneath', () => {
    expect(
      stepsCardCopy({
        count: 1240,
        targetCount: 5000,
        scheme: 'dark',
      }),
    ).toEqual({
      title: '1,240',
      body: 'of 5,000 steps',
      progress: 1240 / 5000,
      appearance: walkCardAppearance('dark'),
    });
  });

  it('follows the light scheme', () => {
    const { appearance } = stepsCardCopy({
      count: 10,
      targetCount: 100,
      scheme: 'light',
    });

    expect(appearance.backgroundColor).toBe(lightColors.surfaceRaised);
    expect(appearance.titleColor).toBe(lightColors.text);
  });

  it('omits progress when there is no target', () => {
    expect(
      stepsCardCopy({
        count: 80,
        targetCount: null,
        scheme: 'dark',
      }),
    ).toMatchObject({
      title: '80',
      body: 'steps today',
      progress: null,
    });
  });
});
