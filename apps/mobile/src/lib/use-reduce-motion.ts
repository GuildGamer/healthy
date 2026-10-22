import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** The phone's Reduce Motion setting, kept current while the app is open. */
export function useReduceMotion(): boolean {
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let isActive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isActive) {
        setIsReduceMotionEnabled(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled,
    );

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, []);

  return isReduceMotionEnabled;
}
