import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { shareWithTracking, trackEvent } from '@/lib/analytics';

const SHARE_DIALOG_TITLE = 'Share your day';

/**
 * Captures a share card and hands the image to the share sheet. PNG keeps the
 * poster's rounded corners. Where an image cannot be made or shared, the same
 * news goes out as a sentence instead, so the button never dead-ends.
 */
export function useShareDay(fallbackMessage: string, dialogTitle: string = SHARE_DIALOG_TITLE) {
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
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle });
    return true;
  }

  async function share(): Promise<void> {
    setIsSharing(true);
    try {
      const sharedImage = await shareImage().catch(() => false);
      if (sharedImage) {
        trackEvent('share_completed', { surface: 'day_card', completed: true });
      } else {
        await shareWithTracking('day_card', { message: fallbackMessage });
      }
    } finally {
      setIsSharing(false);
    }
  }

  return { shotRef, isSharing, share };
}
