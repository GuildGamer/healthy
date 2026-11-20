import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { shareWithTracking, trackEvent } from '@/lib/analytics';

/**
 * Captures the active honor / recap / board poster and opens the system share
 * sheet. Falls back to a text line when capture is unavailable.
 */
export function useHonorShare(shareText: string, dialogTitle = 'Share your honor') {
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
        trackEvent('share_completed', { surface: 'group_honor', completed: true });
      } else {
        await shareWithTracking('group_honor', { message: shareText });
      }
    } finally {
      setIsSharing(false);
    }
  }

  return { shotRef, isSharing, share };
}
