import { Animated, Easing } from 'react-native';
import {
  SPLASH_CATCH_UP_MS,
  SPLASH_EXIT_FADE_MS,
  SPLASH_FAN,
  SPLASH_FAN_MS,
  SPLASH_FAN_STAGGER_MS,
  SPLASH_REDUCED_FADE_IN_MS,
  SPLASH_SWAY_HALF_PERIOD_MS,
  type SplashFanCard,
} from './constants/splash-intro';

type SplashPhase = 'held' | 'fanning' | 'holding' | 'exiting';

export interface FanCardMotion {
  card: SplashFanCard;
  /** 0 tucked behind the icon to 1 fanned out. */
  progress: Animated.Value;
}

export interface SplashIntroMotion {
  fan: readonly FanCardMotion[];
  sway: Animated.Value;
  cardsOpacity: Animated.Value;
  layerOpacity: Animated.Value;
  /** Does nothing once the intro has started or the exit has begun. */
  startIntro: (isReduceMotionEnabled: boolean) => void;
  /** Starts the fade at once; cards still flying land within the catch-up. */
  exit: (onExited: () => void) => void;
  stop: () => void;
}

const LAST_DEAL_STEP = Math.max(...SPLASH_FAN.map((card) => card.dealStep));
const FAN_CARD_MS = SPLASH_FAN_MS - SPLASH_FAN_STAGGER_MS * LAST_DEAL_STEP;
const SWAY_EASING = Easing.inOut(Easing.sin);

function swayTo(value: Animated.Value, toValue: number, duration: number) {
  return Animated.timing(value, { toValue, duration, easing: SWAY_EASING, useNativeDriver: true });
}

function dealCards(fan: readonly FanCardMotion[]): Animated.CompositeAnimation[] {
  return fan.map(({ card, progress }) =>
    Animated.timing(progress, {
      toValue: 1,
      duration: FAN_CARD_MS,
      delay: card.dealStep * SPLASH_FAN_STAGGER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
  );
}

function catchUpCards(fan: readonly FanCardMotion[]): Animated.CompositeAnimation[] {
  return fan.map(({ progress }) =>
    Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_CATCH_UP_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }),
  );
}

/**
 * The splash timeline, outside React so it survives re-renders: cards fan
 * out from behind the icon, sway while launch work runs, and the layer fades
 * as soon as the app is ready, catching up any card still moving. Nothing
 * here ever holds launch back.
 */
export function createSplashIntroMotion(): SplashIntroMotion {
  const fan = SPLASH_FAN.map((card) => ({ card, progress: new Animated.Value(0) }));
  const sway = new Animated.Value(0);
  const cardsOpacity = new Animated.Value(1);
  const layerOpacity = new Animated.Value(1);
  let phase: SplashPhase = 'held';
  let running: Animated.CompositeAnimation | null = null;

  function run(animation: Animated.CompositeAnimation, onFinished?: () => void) {
    running = animation;
    animation.start(({ finished }) => {
      if (finished) {
        onFinished?.();
      }
    });
  }

  function showAtRest() {
    phase = 'holding';
    fan.forEach(({ progress }) => progress.setValue(1));
    cardsOpacity.setValue(0);
    run(
      Animated.timing(cardsOpacity, {
        toValue: 1,
        duration: SPLASH_REDUCED_FADE_IN_MS,
        useNativeDriver: true,
      }),
    );
  }

  function holdWithSway() {
    if (phase !== 'fanning') {
      return;
    }

    phase = 'holding';
    run(
      Animated.loop(
        Animated.sequence([
          swayTo(sway, 1, SPLASH_SWAY_HALF_PERIOD_MS),
          swayTo(sway, 0, SPLASH_SWAY_HALF_PERIOD_MS),
        ]),
      ),
    );
  }

  function startIntro(isReduceMotionEnabled: boolean) {
    if (phase !== 'held') {
      return;
    }

    if (isReduceMotionEnabled) {
      showAtRest();
      return;
    }

    phase = 'fanning';
    run(Animated.parallel(dealCards(fan)), holdWithSway);
  }

  function exit(onExited: () => void) {
    if (phase === 'exiting') {
      return;
    }

    if (phase === 'fanning') {
      running?.stop();
      Animated.parallel(catchUpCards(fan)).start();
    }

    phase = 'exiting';
    // Eased in, so the layer stays mostly opaque while caught-up cards land.
    Animated.timing(layerOpacity, {
      toValue: 0,
      duration: SPLASH_EXIT_FADE_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(onExited);
  }

  return {
    fan,
    sway,
    cardsOpacity,
    layerOpacity,
    startIntro,
    exit,
    stop: () => running?.stop(),
  };
}
