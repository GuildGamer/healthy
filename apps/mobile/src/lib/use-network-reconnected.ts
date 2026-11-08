import * as Network from 'expo-network';
import { useEffect, useRef } from 'react';

function isOnline(state: Network.NetworkState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Runs `onReconnect` when the device transitions from offline (or unknown) to
 * online. Used to flush queued completions and proof uploads.
 */
export function useNetworkReconnected(onReconnect: () => void): void {
  const wasOnlineRef = useRef<boolean | null>(null);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    let isCancelled = false;

    void Network.getNetworkStateAsync()
      .then((state) => {
        if (!isCancelled) {
          wasOnlineRef.current = isOnline(state);
        }
      })
      .catch(() => {
        // Leave null so the first listener event can still trigger a flush.
      });

    const subscription = Network.addNetworkStateListener((state) => {
      const online = isOnline(state);
      const wasOnline = wasOnlineRef.current;
      wasOnlineRef.current = online;
      if (online && wasOnline === false) {
        onReconnectRef.current();
      }
    });

    return () => {
      isCancelled = true;
      subscription.remove();
    };
  }, []);
}
