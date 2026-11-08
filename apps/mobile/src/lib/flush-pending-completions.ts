import { refreshAfterCompletion } from '@/components/challenges/useCompleteChallenge';
import {
  listPendingCompletions,
  markPendingCompletionAttempt,
  removePendingCompletion,
  type PendingCompletion,
} from '@/lib/completion-outbox';
import { executePendingCompletion } from '@/lib/execute-pending-completion';
import { getAppQueryClient } from '@/lib/query-client-holder';

/** Skip a re-attempt that just failed so reconnect spam cannot tight-loop. */
const MIN_RETRY_GAP_MS = 5_000;

let flushInFlight: Promise<void> | null = null;

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'submit_failed';
}

function shouldSkipAttempt(entry: PendingCompletion, nowMs: number): boolean {
  if (!entry.lastAttemptAt || !entry.lastError) {
    return false;
  }
  const lastAttemptMs = Date.parse(entry.lastAttemptAt);
  if (!Number.isFinite(lastAttemptMs)) {
    return false;
  }
  return nowMs - lastAttemptMs < MIN_RETRY_GAP_MS;
}

async function flushOnce(): Promise<void> {
  const pending = await listPendingCompletions();
  const nowMs = Date.now();
  let anySucceeded = false;

  for (const entry of pending) {
    if (shouldSkipAttempt(entry, nowMs)) {
      continue;
    }

    try {
      await executePendingCompletion(entry);
      await removePendingCompletion(entry.id);
      anySucceeded = true;
    } catch (error) {
      await markPendingCompletionAttempt(entry.id, errorMessage(error));
    }
  }

  if (!anySucceeded) {
    return;
  }

  const queryClient = getAppQueryClient();
  if (queryClient) {
    refreshAfterCompletion(queryClient);
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['activity'] });
    void queryClient.invalidateQueries({ queryKey: ['practice'] });
  }
}

/**
 * Retries queued challenge / practice / match submits after the person is back
 * online or returns to the app. Concurrent callers share one in-flight flush.
 */
export async function flushPendingCompletions(): Promise<void> {
  if (flushInFlight) {
    return flushInFlight;
  }

  flushInFlight = flushOnce().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

/** Test helper: clears the in-memory flush lock between cases. */
export function resetFlushPendingCompletionsLock(): void {
  flushInFlight = null;
}
