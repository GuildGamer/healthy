import { refreshAfterCompletion } from '@/components/challenges/useCompleteChallenge';
import {
  listPendingCompletions,
  markPendingCompletionAttempt,
  removePendingCompletion,
  type PendingCompletion,
} from '@/lib/completion-outbox';
import { executePendingCompletion } from '@/lib/execute-pending-completion';
import { getAppQueryClient } from '@/lib/query-client-holder';
import {
  flushPendingCompletions,
  resetFlushPendingCompletionsLock,
} from './completion-sync';

jest.mock('@/components/challenges/useCompleteChallenge', () => ({
  refreshAfterCompletion: jest.fn(),
}));

jest.mock('@/lib/completion-outbox', () => ({
  listPendingCompletions: jest.fn(),
  markPendingCompletionAttempt: jest.fn(),
  removePendingCompletion: jest.fn(),
}));

jest.mock('@/lib/execute-pending-completion', () => ({
  executePendingCompletion: jest.fn(),
}));

jest.mock('@/lib/query-client-holder', () => ({
  getAppQueryClient: jest.fn(),
}));

const listPending = jest.mocked(listPendingCompletions);
const markAttempt = jest.mocked(markPendingCompletionAttempt);
const removePending = jest.mocked(removePendingCompletion);
const execute = jest.mocked(executePendingCompletion);
const getQueryClient = jest.mocked(getAppQueryClient);
const refresh = jest.mocked(refreshAfterCompletion);

function practiceEntry(
  overrides: Partial<PendingCompletion> = {},
): PendingCompletion {
  return {
    kind: 'record_practice',
    id: 'record_practice:session-1',
    createdAt: '2026-11-08T10:00:00.000Z',
    status: 'pending',
    attempts: 0,
    nextAttemptAt: null,
    lastErrorKind: null,
    appVersion: '1.0.0',
    lastAttemptAt: undefined,
    lastError: null,
    input: {
      metric: 'pushups' as const,
      source: 'in_app_pose' as const,
      count: 10,
      durationSeconds: 40,
      startedAt: '2026-11-08T10:00:00.000Z',
      endedAt: '2026-11-08T10:00:40.000Z',
      externalId: 'session-1',
    },
    ...overrides,
  } as PendingCompletion;
}

describe('flushPendingCompletions', () => {
  beforeEach(() => {
    resetFlushPendingCompletionsLock();
    listPending.mockReset();
    markAttempt.mockReset();
    removePending.mockReset();
    execute.mockReset();
    getQueryClient.mockReset();
    refresh.mockReset();
    getQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    } as never);
  });

  it('removes a successful entry and refreshes queries', async () => {
    const entry = practiceEntry();
    listPending.mockResolvedValue([entry]);
    execute.mockResolvedValue({
      kind: 'record_practice',
      result: { session: {} as never, totals: {} as never, creditedMatchIds: [] },
    });

    await flushPendingCompletions();

    expect(execute).toHaveBeenCalledWith(entry);
    expect(removePending).toHaveBeenCalledWith(entry.id);
    expect(refresh).toHaveBeenCalled();
  });

  it('keeps a retryable failure pending with backoff', async () => {
    const entry = practiceEntry();
    listPending.mockResolvedValue([entry]);
    execute.mockRejectedValue(new TypeError('Network request failed'));

    await flushPendingCompletions();

    expect(removePending).not.toHaveBeenCalled();
    expect(markAttempt).toHaveBeenCalledWith(
      entry.id,
      'Network request failed',
      expect.objectContaining({
        kind: 'retryable',
        status: 'pending',
      }),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('parks a permanent 4xx failure', async () => {
    const entry = practiceEntry();
    listPending.mockResolvedValue([entry]);
    execute.mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));

    await flushPendingCompletions();

    expect(markAttempt).toHaveBeenCalledWith(
      entry.id,
      'bad request',
      expect.objectContaining({
        kind: 'permanent',
        status: 'parked',
      }),
    );
  });

  it('skips until nextAttemptAt so reconnect cannot tight-loop', async () => {
    const entry = practiceEntry({
      nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
      lastError: 'Network request failed',
      lastErrorKind: 'retryable',
      attempts: 1,
    });
    listPending.mockResolvedValue([entry]);

    await flushPendingCompletions();

    expect(execute).not.toHaveBeenCalled();
    expect(removePending).not.toHaveBeenCalled();
  });

  it('skips parked entries until they are re-queued', async () => {
    const entry = practiceEntry({
      status: 'parked',
      lastErrorKind: 'permanent',
      attempts: 2,
    });
    listPending.mockResolvedValue([entry]);

    await flushPendingCompletions();

    expect(execute).not.toHaveBeenCalled();
  });
});
