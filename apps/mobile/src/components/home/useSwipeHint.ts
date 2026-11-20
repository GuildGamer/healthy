import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

const SWIPE_HINT_SEEN_KEY = 'today_swipe_hint_seen';

/**
 * The deck's swipe is taught once. Starts hidden so a returning member never
 * sees the hint flash while the flag loads.
 */
export function useSwipeHint(): { isHintVisible: boolean; dismissHint: () => void } {
  const [isHintVisible, setIsHintVisible] = useState(false);

  useEffect(() => {
    let isActive = true;
    void SecureStore.getItemAsync(SWIPE_HINT_SEEN_KEY).then((seen) => {
      if (isActive && seen !== 'true') {
        setIsHintVisible(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  function dismissHint() {
    if (!isHintVisible) {
      return;
    }

    setIsHintVisible(false);
    void SecureStore.setItemAsync(SWIPE_HINT_SEEN_KEY, 'true');
  }

  return { isHintVisible, dismissHint };
}
