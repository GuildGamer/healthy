import { darkColors, lightColors } from '@product/brand';
import {
  walkCardAppearance,
  walkCardChanged,
  walkCardCopy,
} from './walk-session-card';

describe('walkCardAppearance', () => {
  it('uses the dark deck surface at night', () => {
    expect(walkCardAppearance('dark')).toEqual({
      backgroundColor: darkColors.surfaceRaised,
      titleColor: darkColors.text,
      subtitleColor: darkColors.muted,
      progressViewTint: darkColors.accent,
      buttonLabelColor: darkColors.onAccent,
      padding: 20,
    });
  });

  it('uses the light deck surface by day', () => {
    expect(walkCardAppearance('light')).toEqual({
      backgroundColor: lightColors.surfaceRaised,
      titleColor: lightColors.text,
      subtitleColor: lightColors.muted,
      progressViewTint: lightColors.accent,
      buttonLabelColor: lightColors.onAccent,
      padding: 20,
    });
  });
});

describe('walkCardCopy', () => {
  it('leads with the duration, like the in-app walk hero', () => {
    expect(
      walkCardCopy({
        elapsedSeconds: 75,
        distanceMeters: 250,
        paused: false,
        scheme: 'dark',
      }),
    ).toEqual({
      title: '01:15',
      body: '0.25 km',
      progress: null,
      appearance: walkCardAppearance('dark'),
    });
  });

  it('keeps the clock as the title when paused', () => {
    expect(
      walkCardCopy({
        elapsedSeconds: 90,
        distanceMeters: 400,
        paused: true,
        scheme: 'dark',
      }),
    ).toEqual({
      title: '01:30',
      body: 'Paused · 0.40 km',
      progress: null,
      appearance: walkCardAppearance('dark'),
    });
  });

  it('follows the light scheme when asked', () => {
    const { appearance } = walkCardCopy({
      elapsedSeconds: 0,
      distanceMeters: 0,
      paused: false,
      scheme: 'light',
    });

    expect(appearance.backgroundColor).toBe(lightColors.surfaceRaised);
    expect(appearance.titleColor).toBe(lightColors.text);
    expect(appearance.buttonLabelColor).toBe(lightColors.onAccent);
  });

  it('clamps a goal progress ratio for the mint track', () => {
    expect(
      walkCardCopy({
        elapsedSeconds: 60,
        distanceMeters: 500,
        paused: false,
        scheme: 'dark',
        progressRatio: 1.4,
      }).progress,
    ).toBe(1);
  });
});

describe('walkCardChanged', () => {
  it('treats the first card as a change', () => {
    expect(
      walkCardChanged(
        null,
        walkCardCopy({ elapsedSeconds: 0, distanceMeters: 0, paused: false, scheme: 'dark' }),
      ),
    ).toBe(true);
  });

  it('ignores an identical refresh', () => {
    const copy = walkCardCopy({
      elapsedSeconds: 60,
      distanceMeters: 500,
      paused: false,
      scheme: 'dark',
    });
    expect(walkCardChanged(copy, { ...copy })).toBe(false);
  });

  it('notices a pause', () => {
    expect(
      walkCardChanged(
        walkCardCopy({ elapsedSeconds: 60, distanceMeters: 500, paused: false, scheme: 'dark' }),
        walkCardCopy({ elapsedSeconds: 60, distanceMeters: 500, paused: true, scheme: 'dark' }),
      ),
    ).toBe(true);
  });

  it('notices an appearance flip', () => {
    expect(
      walkCardChanged(
        walkCardCopy({ elapsedSeconds: 60, distanceMeters: 500, paused: false, scheme: 'dark' }),
        walkCardCopy({ elapsedSeconds: 60, distanceMeters: 500, paused: false, scheme: 'light' }),
      ),
    ).toBe(true);
  });
});
