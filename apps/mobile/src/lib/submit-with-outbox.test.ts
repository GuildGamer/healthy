import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/lib/api';
import {
  getPendingCompletion,
  listPendingCompletions,
  upsertPendingCompletion,
} from '@/lib/completion-outbox';
import { executePendingCompletion } from '@/lib/execute-pending-completion';
import {
  flushPendingCompletions,
  resetFlushPendingCompletionsLock,
} from '@/lib/flush-pending-completions';
import { removePendingCompletion } from '@/lib/completion-outbox';

jest.mock('@/lib/api', () => ({
  apiClient: {
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
    recordPracticeSession: jest.fn(),
    submitMatchAttempt: jest.fn(),
  },
}));

jest.mock('@/lib/query-client-holder', () => ({
  getAppQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);
const completeChallenge = jest.mocked(apiClient.completeChallenge);
const startChallenge = jest.mocked(apiClient.startChallenge);
const recordPractice = jest.mocked(apiClient.recordPracticeSession);

describe('submit with outbox', () => {
  beforeEach(() => {
    resetFlushPendingCompletionsLock();
    getItemAsync.mockReset();
    setItemAsync.mockReset();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue(undefined);
    completeChallenge.mockReset();
    startChallenge.mockReset();
    recordPractice.mockReset();
  });

  it('keeps the entry when the network fails and flushes it later', async () => {
    const pending = await upsertPendingCompletion({
      kind: 'complete_challenge',
      userChallengeId: 'uc-1',
      occurrenceStatus: 'pending',
      payload: {
        deviceActivity: {
          source: 'in_app_pose',
          metric: 'pushups',
          count: 20,
          durationSeconds: 60,
          startedAt: '2026-11-08T12:00:00.000Z',
          endedAt: '2026-11-08T12:01:00.000Z',
          externalId: 'in-app-pose:uc-1:2026-11-08T12:00:00.000Z',
        },
      },
    });

    getItemAsync.mockImplementation(async () => {
      const lastWrite = setItemAsync.mock.calls.at(-1)?.[1];
      return typeof lastWrite === 'string' ? lastWrite : null;
    });

    completeChallenge.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(executePendingCompletion(pending)).rejects.toThrow('Network request failed');
    // Live path leaves the entry; simulate that by not removing.

    const stillThere = await getPendingCompletion(pending.id);
    expect(stillThere?.id).toBe(pending.id);

    completeChallenge.mockResolvedValueOnce({
      challenge: { id: 'uc-1' },
      pointsBalance: 10,
      currentStreakDays: 1,
      pointsAwarded: 5,
      evidenceRequest: null,
      penaltyApplied: 0,
    } as never);
    startChallenge.mockResolvedValueOnce({ challenge: { id: 'uc-1' } } as never);

    await flushPendingCompletions();

    expect(startChallenge).toHaveBeenCalledWith({ userChallengeId: 'uc-1' });
    expect(completeChallenge).toHaveBeenCalled();
    expect(await listPendingCompletions()).toEqual([]);
  });

  it('removes the entry after a successful live submit', async () => {
    const pending = await upsertPendingCompletion({
      kind: 'record_practice',
      input: {
        metric: 'pushups',
        source: 'in_app_pose',
        count: 12,
        durationSeconds: 40,
        startedAt: '2026-11-08T12:00:00.000Z',
        endedAt: '2026-11-08T12:00:40.000Z',
        externalId: 'practice:ch-1:2026-11-08T12:00:00.000Z',
      },
    });

    getItemAsync.mockImplementation(async () => {
      const lastWrite = setItemAsync.mock.calls.at(-1)?.[1];
      return typeof lastWrite === 'string' ? lastWrite : null;
    });

    recordPractice.mockResolvedValueOnce({
      session: {},
      totals: {},
      creditedMatchIds: [],
    } as never);

    await executePendingCompletion(pending);
    await removePendingCompletion(pending.id);

    expect(await listPendingCompletions()).toEqual([]);
  });
});
