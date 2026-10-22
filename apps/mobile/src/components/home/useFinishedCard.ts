import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { DECK_DONE_FACE_MS } from '@/components/deck';
import {
  type ChallengeFinish,
  subscribeToChallengeFinish,
  takeChallengeFinish,
} from '@/lib/challenge-finish-session';
import { isShareWorthy } from './finish-face-content';

/**
 * The card that just finished, held while its done side shows. Nothing to
 * share or offer, and the deck moves on by itself; otherwise it stays until
 * you deal the next card.
 */
export function useFinishedCard() {
  const [finish, setFinish] = useState<ChallengeFinish | null>(null);
  const [isHeld, setIsHeld] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const takeWaiting = () => {
        const waiting = takeChallengeFinish();
        if (waiting) {
          setIsHeld(false);
          setFinish(waiting);
        }
      };

      takeWaiting();
      return subscribeToChallengeFinish(takeWaiting);
    }, []),
  );

  useEffect(() => {
    if (!finish || isHeld || isShareWorthy(finish.outcome)) {
      return;
    }

    const timer = setTimeout(() => setFinish(null), DECK_DONE_FACE_MS);
    return () => clearTimeout(timer);
  }, [finish, isHeld]);

  const dismiss = useCallback(() => setFinish(null), []);
  const hold = useCallback(() => setIsHeld(true), []);

  return { finish, dismiss, hold };
}
