import { usePathname, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { screenPatternFromPath } from './screen-pattern';
import { trackEvent } from './track';

const ONBOARDING_STEPS = new Set([
  'onboarding',
  'login',
  'login-email',
  'sign-up-email',
  'verify-email',
  'complete-country',
  'reminders-intro',
  'category-selection',
  'forgot-password',
  'reset-password',
  'account-deleted',
]);

/** Emits `screen_viewed` (and onboarding steps) once per distinct pattern. */
export function useScreenAnalytics(): void {
  const pathname = usePathname();
  const segments = useSegments();
  const lastScreen = useRef<string | null>(null);

  useEffect(() => {
    const screen = screenPatternFromPath(pathname);
    if (screen === lastScreen.current) {
      return;
    }
    lastScreen.current = screen;
    trackEvent('screen_viewed', { screen });

    const leaf = segments[segments.length - 1];
    if (typeof leaf === 'string' && ONBOARDING_STEPS.has(leaf)) {
      trackEvent('onboarding_step_viewed', { step: leaf });
    }
  }, [pathname, segments]);
}
