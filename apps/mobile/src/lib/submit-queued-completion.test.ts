import {
  markPendingCompletionAttempt,
  removePendingCompletion,
  upsertPendingCompletion,
} from '@/lib/completion-outbox';
import { classifySyncError, flushPendingCompletions, nextBackoffMs } from '@/lib/completion-sync';
import { executePendingCompletion } from '@/lib/execute-pending-completion';
import { submitQueuedCompletion } from './submit-queued-completion';

jest.mock('@/lib/completion-outbox', () => ({
  upsertPendingCompletion: jest.fn(),
  removePendingCompletion: jest.fn(),
  markPendingCompletionAttempt: jest.fn(),
}));

jest.mock('@/lib/completion-sync', () => ({
  classifySyncError: jest.fn(),
  flushPendingCompletions: jest.fn(),
  nextBackoffMs: jest.fn(() => 5_000),
}));

jest.mock('@/lib/execute-pending-completion', () => ({
  executePendingCompletion: jest.fn(),
}));

const upsert = jest.mocked(upsertPendingCompletion);
const remove = jest.mocked(removePendingCompletion);
const mark = jest.mocked(markPendingCompletionAttempt);
const execute = jest.mocked(executePendingCompletion);
const classify = jest.mocked(classifySyncError);
const flush = jest.mocked(flushPendingCompletions);
const backoff = jest.mocked(nextBackoffMs);

const pending = {
  kind: 'record_practice' as const,
  id: 'record_practice:session-1',
  createdAt: '2026-11-08T10:00:00.000Z',
  status: 'pending' as const,
  attempts: 0,
  nextAttemptAt: null,
  lastErrorKind: null,
  appVersion: '1.0.0',
  input: {
    metric: 'pushups' as const,
    source: 'in_app_pose' as const,
    count: 10,
    durationSeconds: 40,
    startedAt: '2026-11-08T10:00:00.000Z',
    endedAt: '2026-11-08T10:00:40.000Z',
    externalId: 'session-1',
  },
};

describe('submitQueuedCompletion', () => {
  beforeEach(() => {
    upsert.mockReset();
    remove.mockReset();
    mark.mockReset();
    execute.mockReset();
    classify.mockReset();
    flush.mockReset();
    backoff.mockReset();
    backoff.mockReturnValue(5_000);
    upsert.mockResolvedValue(pending);
  });

  it('returns syncing on a retryable network failure instead of throwing', async () => {
    execute.mockRejectedValue(new TypeError('Network request failed'));
    classify.mockReturnValue('retryable');

    const result = await submitQueuedCompletion({
      kind: 'record_practice',
      input: pending.input,
    });

    expect(result.outcome).toBe('syncing');
    expect(flush).toHaveBeenCalled();
    expect(mark).toHaveBeenCalledWith(
      pending.id,
      'Network request failed',
      expect.objectContaining({ kind: 'retryable', status: 'pending' }),
    );
  });

  it('returns failed only for permanent errors', async () => {
    execute.mockRejectedValue(Object.assign(new Error('gone'), { status: 400 }));
    classify.mockReturnValue('permanent');

    const result = await submitQueuedCompletion({
      kind: 'record_practice',
      input: pending.input,
    });

    expect(result.outcome).toBe('failed');
    expect(mark).toHaveBeenCalledWith(
      pending.id,
      'gone',
      expect.objectContaining({ kind: 'permanent', status: 'parked' }),
    );
  });
});
