import { act, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { SplashScreen } from './SplashScreen';
import {
  SPLASH_CATCH_UP_MS,
  SPLASH_EXIT_FADE_MS,
  SPLASH_FAN,
  SPLASH_FAN_MS,
  SPLASH_MAX_HOLD_MS,
} from './constants/splash-intro';

type SplashProps = ComponentProps<typeof SplashScreen>;

function middleFanCard() {
  const card = SPLASH_FAN.find((fanCard) => fanCard.rotateDeg === 0);
  if (!card) {
    throw new Error('The splash fan has no upright middle card');
  }
  return card;
}

const MIDDLE_CARD = middleFanCard();

/** Renders, then lets the Reduce Motion lookup settle. */
async function renderSplash(props: SplashProps) {
  const view = render(<SplashScreen {...props} />);
  await act(async () => undefined);
  return view;
}

function advance(milliseconds: number) {
  act(() => {
    jest.advanceTimersByTime(milliseconds);
  });
}

function middleCard() {
  return screen.getByTestId(`splash-fan-${MIDDLE_CARD.kind}`);
}

/**
 * Native-driven frames never reach rendered props in tests, so the fan is
 * seen through the card animations started: each moves a card to fanned (1).
 * The layer fade goes to 0 and the cards' group fade only runs with Reduce
 * Motion, which these tests switch off.
 */
function fanAnimations(timing: jest.SpyInstance) {
  return timing.mock.calls
    .map(([, config]) => config as Animated.TimingAnimationConfig)
    .filter((config) => config.toValue === 1 && config.duration !== undefined);
}

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows the app icon and the Healthy wordmark, cards tucked behind', async () => {
    await renderSplash({ hasNativeSplashHidden: false, isReady: false, onExited: jest.fn() });

    expect(screen.getByTestId('splash-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('splash-icon')).toBeOnTheScreen();
    expect(screen.getByText('Healthy')).toBeOnTheScreen();
    expect(middleCard()).toHaveStyle({ opacity: 0 });
  });

  it('deals the cards out as soon as the native splash hides', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await renderSplash({
      hasNativeSplashHidden: false,
      isReady: false,
      onExited: jest.fn(),
    });
    expect(fanAnimations(timing)).toHaveLength(0);

    view.rerender(<SplashScreen hasNativeSplashHidden isReady={false} onExited={jest.fn()} />);

    expect(fanAnimations(timing)).toHaveLength(SPLASH_FAN.length);
  });

  it('still deals the cards when launch is ready at once, without holding it', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const onExited = jest.fn();
    await renderSplash({ hasNativeSplashHidden: true, isReady: true, onExited });

    expect(screen.getByTestId('splash-screen')).toHaveProp('pointerEvents', 'none');
    const catchUps = fanAnimations(timing).filter(
      (config) => config.duration === SPLASH_CATCH_UP_MS,
    );
    expect(catchUps).toHaveLength(SPLASH_FAN.length);

    advance(SPLASH_EXIT_FADE_MS + 50);

    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('leaves within the fade when ready mid-fan', async () => {
    const onExited = jest.fn();
    const view = await renderSplash({ hasNativeSplashHidden: true, isReady: false, onExited });
    advance(SPLASH_FAN_MS / 2);

    view.rerender(<SplashScreen hasNativeSplashHidden isReady onExited={onExited} />);
    advance(SPLASH_EXIT_FADE_MS + 50);

    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('shows the cards at rest with Reduce Motion, fading only', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const view = await renderSplash({
      hasNativeSplashHidden: false,
      isReady: false,
      onExited: jest.fn(),
    });

    view.rerender(<SplashScreen hasNativeSplashHidden isReady={false} onExited={jest.fn()} />);

    expect(middleCard()).toHaveStyle({
      transform: [{ translateX: 0 }, { translateY: MIDDLE_CARD.translateY }, { rotate: '0deg' }],
    });
  });

  it('stays while launch work runs, up to the maximum hold', async () => {
    const onExited = jest.fn();
    await renderSplash({ hasNativeSplashHidden: true, isReady: false, onExited });

    advance(SPLASH_MAX_HOLD_MS - 1);

    expect(onExited).not.toHaveBeenCalled();
  });

  it('fails open after the maximum hold even if launch never settles', async () => {
    const onExited = jest.fn();
    await renderSplash({ hasNativeSplashHidden: true, isReady: false, onExited });

    advance(SPLASH_MAX_HOLD_MS);
    advance(SPLASH_EXIT_FADE_MS + 50);

    expect(onExited).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('splash-screen')).toHaveProp('pointerEvents', 'none');
  });

  it('waits for the native splash before it can leave', async () => {
    const onExited = jest.fn();
    await renderSplash({ hasNativeSplashHidden: false, isReady: true, onExited });

    advance(SPLASH_EXIT_FADE_MS + 50);

    expect(onExited).not.toHaveBeenCalled();
  });
});
