import {
  markPendingCompletionAttempt,
  removePendingCompletion,
  upsertPendingCompletion,
  type PendingCompletion,
  type PendingCompletionInput,
} from '@/lib/completion-outbox';
import { classifySyncError, flushPendingCompletions, nextBackoffMs } from '@/lib/completion-sync';
import {
  executePendingCompletion,
  type ExecutedCompletion,
} from '@/lib/execute-pending-completion';

export type QueuedSubmitResult =
  | { outcome: 'saved'; executed: ExecutedCompletion; pendingId: string }
  | { outcome: 'syncing'; pending: PendingCompletion }
  | { outcome: 'failed'; pending: PendingCompletion; error: unknown };

/**
 * Writes the set to the outbox first, then tries the API once. A retryable
 * failure leaves the entry queued and returns `syncing` so the UI can leave
 * the session without saying the set was lost.
 */
export async function submitQueuedCompletion(
  input: PendingCompletionInput,
): Promise<QueuedSubmitResult> {
  const pending = await upsertPendingCompletion(input);

  try {
    const executed = await executePendingCompletion(pending);
    await removePendingCompletion(pending.id);
    return { outcome: 'saved', executed, pendingId: pending.id };
  } catch (error) {
    const kind = classifySyncError(error);
    if (kind === 'permanent') {
      await markPendingCompletionAttempt(
        pending.id,
        error instanceof Error ? error.message : 'submit_failed',
        { kind: 'permanent', status: 'parked', nextAttemptAt: null },
      );
      return { outcome: 'failed', pending, error };
    }

    await markPendingCompletionAttempt(
      pending.id,
      error instanceof Error ? error.message : 'submit_failed',
      {
        kind: 'retryable',
        status: 'pending',
        nextAttemptAt: new Date(Date.now() + nextBackoffMs(pending.attempts)).toISOString(),
      },
    );
    void flushPendingCompletions();
    return { outcome: 'syncing', pending };
  }
}
