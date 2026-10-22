import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { DECK_FLIP_MS } from './constants';

const PERSPECTIVE = 1_200;

/** The done side turning into view, or simply appearing under Reduce Motion. */
export function useFlipIn() {
  const isReduceMotionEnabled = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReduceMotionEnabled) {
      progress.setValue(1);
      return;
    }

    Animated.timing(progress, {
      toValue: 1,
      duration: DECK_FLIP_MS,
      useNativeDriver: true,
    }).start();
  }, [isReduceMotionEnabled, progress]);

  return {
    transform: [
      { perspective: PERSPECTIVE },
      { rotateY: progress.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) },
    ],
  };
}
