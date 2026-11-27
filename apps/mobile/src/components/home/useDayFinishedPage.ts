import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import type { ChallengeFinish } from '@/lib/challenge-finish-session';
import { daySuccessParams, isDayFinishedBy } from './finish-handoff';
import type { DeckItem } from './types/today-deck';

/**
 * The last challenge of the day earns the full Well done page, with its
 * friend challenge, instead of a card that turns over and moves on.
 */
export function useDayFinishedPage(
  finish: ChallengeFinish | null,
  items: readonly DeckItem[],
  dismiss: () => void,
): boolean {
  const router = useRouter();
  const opensPage = finish !== null && isDayFinishedBy(finish, items);

  useEffect(() => {
    if (!finish || !opensPage) {
      return;
    }

    dismiss();
    router.push({ pathname: '/challenge/success', params: daySuccessParams(finish) });
  }, [dismiss, finish, opensPage, router]);

  return opensPage;
}
