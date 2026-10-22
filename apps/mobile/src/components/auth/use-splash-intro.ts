import { useEffect, useState } from 'react';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { SPLASH_MAX_HOLD_MS } from './constants/splash-intro';
import { createSplashIntroMotion } from './splash-intro-motion';

interface SplashIntroOptions {
  hasNativeSplashHidden: boolean;
  isReady: boolean;
  onExited: () => void;
}

/**
 * Drives the splash timeline from launch state. The fan always starts as the
 * native splash hides; the overlay leaves on ready or after the maximum hold,
 * whichever comes first, and never waits for the fan to finish.
 */
export function useSplashIntro({ hasNativeSplashHidden, isReady, onExited }: SplashIntroOptions) {
  const isReduceMotionEnabled = useReduceMotion();
  const [motion] = useState(createSplashIntroMotion);
  const [isExiting, setIsExiting] = useState(false);
  const [hasHeldTooLong, setHasHeldTooLong] = useState(false);

  // Declared before the exit effect: when launch is already ready, the fan
  // must have started for the exit to catch it up rather than skip it.
  useEffect(() => {
    if (!hasNativeSplashHidden) {
      return;
    }

    motion.startIntro(isReduceMotionEnabled);
  }, [motion, hasNativeSplashHidden, isReduceMotionEnabled]);

  useEffect(() => {
    if (!hasNativeSplashHidden) {
      return;
    }

    const maxHold = setTimeout(() => setHasHeldTooLong(true), SPLASH_MAX_HOLD_MS);
    return () => clearTimeout(maxHold);
  }, [hasNativeSplashHidden]);

  useEffect(() => {
    if (!hasNativeSplashHidden || !(isReady || hasHeldTooLong)) {
      return;
    }

    setIsExiting(true);
    motion.exit(onExited);
  }, [motion, hasNativeSplashHidden, isReady, hasHeldTooLong, onExited]);

  useEffect(() => motion.stop, [motion]);

  return { motion, isExiting };
}
