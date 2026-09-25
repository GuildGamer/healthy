import { useEffect, useRef } from 'react';
import { evaluateAppReviewEligibility } from './app-review-eligibility';
import { requestInAppReview } from './app-review';
import {
  markAppReviewPromptAttemptedThisSession,
  wasAppReviewPromptAttemptedThisSession,
  wasLastSuccessPenalty,
  wasMembershipCtaShownThisSession,
} from './app-review-session';
import {
  loadAppReviewState,
  saveAppReviewState,
} from './app-review-store';

const PROMPT_DELAY_MS = 1_500;

export type UseAppReviewPromptInput = {
  userId: string | null | undefined;
  dayKey: string | null | undefined;
  winLocked: boolean;
  /** Uncapped: a count clamped to the free-tier win target never clears the gate. */
  completedCountToday: number;
  currentStreakDays: number;
  /** When false, skip (queries still loading). */
  ready: boolean;
};

/**
 * After a signature win on Home or Challenges, ask the OS for an in-app
 * store review. Never call from a button — Profile uses openWriteReviewPage.
 */
export function useAppReviewPrompt(input: UseAppReviewPromptInput): void {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!input.ready || !input.userId || !input.dayKey) {
      return;
    }

    if (attemptedRef.current || wasAppReviewPromptAttemptedThisSession()) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled || attemptedRef.current) {
          return;
        }

        const state = await loadAppReviewState(input.userId!);
        if (cancelled) {
          return;
        }

        const result = evaluateAppReviewEligibility({
          now: new Date(),
          dayKey: input.dayKey!,
          winLocked: input.winLocked,
          completedCountToday: input.completedCountToday,
          currentStreakDays: input.currentStreakDays,
          wasPenalized: wasLastSuccessPenalty(),
          membershipCtaShownThisSession: wasMembershipCtaShownThisSession(),
          promptAttemptedThisSession: wasAppReviewPromptAttemptedThisSession(),
          state,
        });

        if (!result.eligible) {
          return;
        }

        attemptedRef.current = true;
        markAppReviewPromptAttemptedThisSession();

        await saveAppReviewState(input.userId!, {
          lastPromptedAt: new Date().toISOString(),
          lastPromptDayKey:
            result.reason === 'win_locked' ? input.dayKey! : (state?.lastPromptDayKey ?? null),
          lastPromptedStreakMilestone:
            result.streakMilestone ??
            state?.lastPromptedStreakMilestone ??
            null,
        });

        if (cancelled) {
          return;
        }

        await requestInAppReview();
      })();
    }, PROMPT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    input.ready,
    input.userId,
    input.dayKey,
    input.winLocked,
    input.completedCountToday,
    input.currentStreakDays,
  ]);
}
