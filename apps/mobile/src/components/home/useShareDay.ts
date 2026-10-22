import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import {
  SHARE_CARD_EXPORT_HEIGHT,
  SHARE_CARD_EXPORT_WIDTH,
} from '@/components/challenges/ChallengeShareCard';

const SHARE_DIALOG_TITLE = 'Share your day';

/**
 * Captures a share card at export size and hands the image to the share
 * sheet. Where an image cannot be made or shared, the same news goes out as a
 * sentence instead, so the button never dead-ends.
 */
export function useShareDay(fallbackMessage: string, dialogTitle: string = SHARE_DIALOG_TITLE) {
  const shotRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  async function shareImage(): Promise<boolean> {
    if (!shotRef.current || !(await Sharing.isAvailableAsync())) {
      return false;
    }

    // Square capture: JPEG has no alpha, so rounded corners would fill white.
    const uri = await captureRef(shotRef, {
      format: 'jpg',
      quality: 1,
      width: SHARE_CARD_EXPORT_WIDTH,
      height: SHARE_CARD_EXPORT_HEIGHT,
      result: 'tmpfile',
    });
    await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle });
    return true;
  }

  async function share(): Promise<void> {
    setIsSharing(true);
    try {
      const sharedImage = await shareImage().catch(() => false);
      if (!sharedImage) {
        await Share.share({ message: fallbackMessage });
      }
    } finally {
      setIsSharing(false);
    }
  }

  return { shotRef, isSharing, share };
}
