import { act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SPLASH_CATCH_UP_MS, SPLASH_EXIT_FADE_MS, SPLASH_FAN_MS } from './constants/splash-intro';
import { createSplashIntroMotion, type SplashIntroMotion } from './splash-intro-motion';

function advance(milliseconds: number) {
  act(() => {
    jest.advanceTimersByTime(milliseconds);
  });
}

/**
 * Native-driven values never report their frames back to JS in tests, so a
 * card is shown to move by the animation started on its value.
 */
function cardAnimations(timing: jest.SpyInstance, motion: SplashIntroMotion) {
  const progressValues = new Set<unknown>(motion.fan.map(({ progress }) => progress));
  return timing.mock.calls
    .filter(([value]) => progressValues.has(value))
    .map(([, config]) => config as Animated.TimingAnimationConfig);
}

describe('createSplashIntroMotion', () => {
  let timing: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    timing = jest.spyOn(Animated, 'timing');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('deals every card out from behind the icon within the fan time', () => {
    const motion = createSplashIntroMotion();

    motion.startIntro(false);

    const animations = cardAnimations(timing, motion);
    expect(animations).toHaveLength(motion.fan.length);
    animations.forEach((config) => {
      expect(config.toValue).toBe(1);
      expect(config.duration).toBeLessThanOrEqual(SPLASH_FAN_MS);
    });
    motion.stop();
  });

  it('catches the fan up while it fades when launch is ready at once', () => {
    const motion = createSplashIntroMotion();
    const onExited = jest.fn();

    motion.startIntro(false);
    motion.exit(onExited);

    const catchUps = cardAnimations(timing, motion).filter(
      (config) => config.duration === SPLASH_CATCH_UP_MS,
    );
    expect(catchUps).toHaveLength(motion.fan.length);
    expect(SPLASH_CATCH_UP_MS).toBeLessThan(SPLASH_EXIT_FADE_MS);

    advance(SPLASH_EXIT_FADE_MS + 50);

    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('never moves the cards with Reduce Motion', () => {
    const motion = createSplashIntroMotion();

    motion.startIntro(true);

    expect(cardAnimations(timing, motion)).toHaveLength(0);
  });
});
