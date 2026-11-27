import type { CompleteChallengeOutput, RecordPracticeSessionOutput } from '@product/contract';
import { apiClient } from '@/lib/api';
import type { PendingCompletion } from '@/lib/completion-outbox';

export type ExecutedCompletion =
  | { kind: 'complete_challenge'; result: CompleteChallengeOutput }
  | { kind: 'record_practice'; result: RecordPracticeSessionOutput }
  | { kind: 'submit_match_attempt'; matchId: string };

/**
 * Runs one queued completion against the API. Shared by the live submit path
 * and the background flush so retries stay identical.
 */
export async function executePendingCompletion(
  entry: PendingCompletion,
): Promise<ExecutedCompletion> {
  if (entry.kind === 'complete_challenge') {
    if (entry.occurrenceStatus === 'pending') {
      await apiClient.startChallenge({ userChallengeId: entry.userChallengeId });
    }
    const result = await apiClient.completeChallenge({
      userChallengeId: entry.userChallengeId,
      ...entry.payload,
    });
    return { kind: 'complete_challenge', result };
  }

  if (entry.kind === 'record_practice') {
    const result = await apiClient.recordPracticeSession(entry.input);
    return { kind: 'record_practice', result };
  }

  await apiClient.submitMatchAttempt(entry.input);
  return { kind: 'submit_match_attempt', matchId: entry.input.matchId };
}
