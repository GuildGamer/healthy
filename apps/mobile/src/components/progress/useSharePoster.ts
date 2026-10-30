import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { shareWithTracking, trackEvent } from '@/lib/analytics';

/**
 * Captures an off-screen SharePosterCard as PNG. Falls back to a sentence so
 * the Share button never dead-ends.
 */
export function useSharePoster(fallbackMessage: string, surface: string) {
  const shotRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  async function shareImage(): Promise<boolean> {
    if (!shotRef.current || !(await Sharing.isAvailableAsync())) {
      return false;
    }

    const uri = await captureRef(shotRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share' });
    return true;
  }

  async function share(): Promise<void> {
    setIsSharing(true);
    try {
      const sharedImage = await shareImage().catch(() => false);
      if (sharedImage) {
        trackEvent('share_completed', { surface, completed: true });
      } else {
        await shareWithTracking(surface, { message: fallbackMessage });
      }
    } finally {
      setIsSharing(false);
    }
  }

  return { shotRef, isSharing, share };
}
