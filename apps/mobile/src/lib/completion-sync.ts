import { refreshAfterCompletion } from '@/components/challenges/useCompleteChallenge';
import {
  listPendingCompletions,
  markPendingCompletionAttempt,
  removePendingCompletion,
  type PendingCompletion,
  type PendingErrorKind,
} from '@/lib/completion-outbox';
import { executePendingCompletion } from '@/lib/execute-pending-completion';
import { getAppQueryClient } from '@/lib/query-client-holder';

/** Growing gaps between retries while the app is open. */
const BACKOFF_MS = [5_000, 15_000, 60_000, 5 * 60_000] as const;

let flushInFlight: Promise<void> | null = null;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;

export function nextBackoffMs(attempts: number): number {
  const index = Math.min(Math.max(attempts, 0), BACKOFF_MS.length - 1);
  return BACKOFF_MS[index]!;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'submit_failed';
}

/**
 * Network failures, timeouts, 5xx and 429 keep retrying. Other 4xx are parked
 * until the app version changes.
 */
export function classifySyncError(error: unknown): PendingErrorKind {
  if (error instanceof TypeError) {
    return 'retryable';
  }

  if (!(error instanceof Error)) {
    return 'retryable';
  }

  const message = error.message.toLowerCase();
  if (
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('network') ||
    message.includes('failed to fetch')
  ) {
    return 'retryable';
  }

  const status = (error as { status?: number; statusCode?: number }).status
    ?? (error as { status?: number; statusCode?: number }).statusCode
    ?? parseStatusFromMessage(error.message);

  if (status == null) {
    return 'retryable';
  }
  if (status === 429 || status >= 500) {
    return 'retryable';
  }
  if (status >= 400 && status < 500) {
    return 'permanent';
  }
  return 'retryable';
}

function parseStatusFromMessage(message: string): number | null {
  const match = message.match(/\b([45]\d{2})\b/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function shouldSkipAttempt(entry: PendingCompletion, nowMs: number): boolean {
  if (entry.status === 'parked') {
    return true;
  }
  if (!entry.nextAttemptAt) {
    return false;
  }
  const nextMs = Date.parse(entry.nextAttemptAt);
  if (!Number.isFinite(nextMs)) {
    return false;
  }
  return nowMs < nextMs;
}

function clearBackoffTimer(): void {
  if (backoffTimer) {
    clearTimeout(backoffTimer);
    backoffTimer = null;
  }
}

function scheduleNextFlush(entries: readonly PendingCompletion[], nowMs: number): void {
  clearBackoffTimer();
  let earliest: number | null = null;
  for (const entry of entries) {
    if (entry.status !== 'pending') {
      continue;
    }
    const nextMs = entry.nextAttemptAt ? Date.parse(entry.nextAttemptAt) : nowMs;
    if (!Number.isFinite(nextMs)) {
      continue;
    }
    if (earliest == null || nextMs < earliest) {
      earliest = nextMs;
    }
  }

  if (earliest == null) {
    return;
  }

  const delay = Math.max(0, earliest - nowMs);
  backoffTimer = setTimeout(() => {
    backoffTimer = null;
    void flushPendingCompletions();
  }, delay);
}

async function flushOnce(): Promise<void> {
  const pending = await listPendingCompletions();
  const nowMs = Date.now();
  let anySucceeded = false;
  let stillPending = false;

  for (const entry of pending) {
    if (shouldSkipAttempt(entry, nowMs)) {
      if (entry.status === 'pending') {
        stillPending = true;
      }
      continue;
    }

    try {
      await executePendingCompletion(entry);
      await removePendingCompletion(entry.id);
      anySucceeded = true;
    } catch (error) {
      const kind = classifySyncError(error);
      if (kind === 'permanent') {
        await markPendingCompletionAttempt(entry.id, errorMessage(error), {
          kind: 'permanent',
          status: 'parked',
          nextAttemptAt: null,
        });
      } else {
        const delay = nextBackoffMs(entry.attempts);
        await markPendingCompletionAttempt(entry.id, errorMessage(error), {
          kind: 'retryable',
          status: 'pending',
          nextAttemptAt: new Date(nowMs + delay).toISOString(),
        });
        stillPending = true;
      }
    }
  }

  if (anySucceeded) {
    const queryClient = getAppQueryClient();
    if (queryClient) {
      refreshAfterCompletion(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: ['practice'] });
    }
  }

  const remaining = await listPendingCompletions();
  if (stillPending || remaining.some((entry) => entry.status === 'pending')) {
    scheduleNextFlush(remaining, Date.now());
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
  clearBackoffTimer();
}
