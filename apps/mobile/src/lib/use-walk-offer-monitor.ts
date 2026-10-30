import type { TodayChallenge } from '@product/client';
import { useEffect } from 'react';
import { openWalkOfferGoal } from '@/lib/walk-offer-goal';
import { armWalkOfferMonitor, disarmWalkOfferMonitor } from '@/lib/walk-offer-monitor';

/**
 * Arms background walk detection when Today has an open duration walk, and
 * disarms when that goal is gone or the list is empty.
 */
export function useWalkOfferMonitor(
  challenges: readonly TodayChallenge[] | undefined,
  dayKey: string | undefined,
): void {
  useEffect(() => {
    if (!challenges || !dayKey) {
      void disarmWalkOfferMonitor();
      return;
    }

    const goal = openWalkOfferGoal(challenges, dayKey);
    if (!goal) {
      void disarmWalkOfferMonitor();
      return;
    }

    void armWalkOfferMonitor(goal);

    return () => {
      // Keep watching across Today remounts; only explicit disarm clears it.
    };
  }, [challenges, dayKey]);
}
