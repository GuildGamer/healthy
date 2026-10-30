import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { flushAnalyticsQueue } from './queue';
import {
  markAnalyticsSessionBackground,
  resumeAnalyticsSession,
} from './session';
import { trackEvent } from './track';

/**
 * Owns the analytics session lifecycle: new session after 30 minutes idle,
 * `app_opened` on each session start, and a queue flush when backgrounded.
 */
export function useAnalyticsSession(): void {
  const coldStartSent = useRef(false);

  useEffect(() => {
    function startSession(coldStart: boolean): void {
      const { isNew } = resumeAnalyticsSession();
      if (!coldStart && !isNew) {
        return;
      }
      trackEvent('app_opened', { coldStart });
    }

    if (!coldStartSent.current) {
      coldStartSent.current = true;
      startSession(true);
    }

    function onChange(state: AppStateStatus): void {
      if (state === 'active') {
        startSession(false);
        return;
      }

      if (state === 'background' || state === 'inactive') {
        markAnalyticsSessionBackground();
        void flushAnalyticsQueue();
      }
    }

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);
}
