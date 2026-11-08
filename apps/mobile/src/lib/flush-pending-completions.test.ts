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
} from './flush-pending-completions';

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
  overrides: Pick<Partial<PendingCompletion>, 'lastAttemptAt' | 'lastError'> = {},
): PendingCompletion {
  return {
    kind: 'record_practice',
    id: 'record_practice:session-1',
    createdAt: '2026-11-08T10:00:00.000Z',
    lastAttemptAt: overrides.lastAttemptAt,
    lastError: overrides.lastError ?? null,
    input: {
      metric: 'pushups',
      source: 'in_app_pose',
      count: 10,
      durationSeconds: 40,
      startedAt: '2026-11-08T10:00:00.000Z',
      endedAt: '2026-11-08T10:00:40.000Z',
      externalId: 'session-1',
    },
  };
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

  it('keeps a failed entry and records the error', async () => {
    const entry = practiceEntry();
    listPending.mockResolvedValue([entry]);
    execute.mockRejectedValue(new TypeError('Network request failed'));

    await flushPendingCompletions();

    expect(removePending).not.toHaveBeenCalled();
    expect(markAttempt).toHaveBeenCalledWith(entry.id, 'Network request failed');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('skips a recent failed attempt so reconnect cannot tight-loop', async () => {
    const entry = practiceEntry({
      lastAttemptAt: new Date().toISOString(),
      lastError: 'Network request failed',
    });
    listPending.mockResolvedValue([entry]);

    await flushPendingCompletions();

    expect(execute).not.toHaveBeenCalled();
    expect(removePending).not.toHaveBeenCalled();
  });
});
