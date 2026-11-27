import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { authClient } from './auth-client';
import { trackEvent } from './track-event';
import { localActiveDayKey, userActiveStorageKey } from './user-active-day';

/**
 * Once per local calendar day, when a signed-in session is (or becomes)
 * active, emit `user_active` so retention can be measured without a
 * third-party SDK. Skip until a cookie exists so a cold start does not burn
 * the day with `userId = null`.
 */
export function useUserActive(): void {
  const inFlight = useRef(false);

  useEffect(() => {
    async function emitIfNeeded(): Promise<void> {
      if (inFlight.current) {
        return;
      }

      inFlight.current = true;
      try {
        const cookie = await authClient.getCookie();
        if (!cookie) {
          return;
        }

        const dayKey = localActiveDayKey();
        const storageKey = userActiveStorageKey(dayKey);
        const already = await SecureStore.getItemAsync(storageKey);
        if (already === '1') {
          return;
        }

        trackEvent('user_active', {
          appVersion: Constants.expoConfig?.version ?? 'unknown',
        });
        await SecureStore.setItemAsync(storageKey, '1');
      } catch {
        // Retention gaps beat crashing the launch path.
      } finally {
        inFlight.current = false;
      }
    }

    function onChange(state: AppStateStatus): void {
      if (state === 'active') {
        void emitIfNeeded();
      }
    }

    void emitIfNeeded();
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);
}
