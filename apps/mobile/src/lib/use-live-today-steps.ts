import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { readTodaySteps } from '@/lib/device-health';

export type LiveTodaySteps =
  | { status: 'reading' }
  | { status: 'count'; count: number }
  | { status: 'unread' };

const REFRESH_MS = 2_000;

/**
 * Today's step total from this phone, refreshed while the screen is open so a
 * steps challenge does not sit frozen until the walker leaves and returns.
 */
export function useLiveTodaySteps(options?: {
  ask?: boolean;
  /** When false, stays idle — for screens that only sometimes show steps. */
  enabled?: boolean;
}): LiveTodaySteps {
  const ask = options?.ask ?? false;
  const enabled = options?.enabled ?? true;
  const [reading, setReading] = useState<LiveTodaySteps>(
    enabled ? { status: 'reading' } : { status: 'unread' },
  );

  useEffect(() => {
    if (!enabled) {
      setReading({ status: 'unread' });
      return;
    }

    let isCancelled = false;

    async function refresh() {
      const count = await readTodaySteps({ ask });
      if (isCancelled) {
        return;
      }

      setReading(count === null ? { status: 'unread' } : { status: 'count', count });
    }

    void refresh();
    const intervalId = setInterval(() => void refresh(), REFRESH_MS);
    const appSub = AppState.addEventListener('change', () => {
      void refresh();
    });

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      appSub.remove();
    };
  }, [ask, enabled]);

  return reading;
}
