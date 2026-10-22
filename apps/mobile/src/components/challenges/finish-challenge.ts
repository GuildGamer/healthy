import type { CompleteChallengeOutput } from '@product/client';
import { router } from 'expo-router';
import {
  announceChallengeFinish,
  type ChallengeFinishOutcome,
} from '@/lib/challenge-finish-session';
import { goBackOrHome } from '@/lib/go-back';

function announce(result: CompleteChallengeOutput, outcome: ChallengeFinishOutcome): void {
  announceChallengeFinish({
    challenge: result.challenge,
    outcome,
    pointsAwarded: result.pointsAwarded,
    penaltyApplied: result.penaltyApplied,
    currentStreakDays: result.currentStreakDays,
  });
}

/**
 * Leaves a sheet or a session once the act is saved: on to the photo check
 * when this one was picked, otherwise back to the card, which turns over.
 */
export function finishAndLeave(
  result: CompleteChallengeOutput,
  outcome: ChallengeFinishOutcome,
): void {
  if (result.evidenceRequest) {
    router.replace(`/challenge/${result.challenge.challengeId}/verify`);
    return;
  }

  announce(result, outcome);
  goBackOrHome();
}

/** The same, for an act done on the card itself, where there is nothing to leave. */
export function finishOnCard(
  result: CompleteChallengeOutput,
  outcome: ChallengeFinishOutcome,
): void {
  if (result.evidenceRequest) {
    router.push(`/challenge/${result.challenge.challengeId}/verify`);
    return;
  }

  announce(result, outcome);
}
