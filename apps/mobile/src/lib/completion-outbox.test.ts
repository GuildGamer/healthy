import * as SecureStore from 'expo-secure-store';
import {
  completionDedupeKey,
  getPendingCompletion,
  listPendingCompletions,
  loadPendingCompletionsIndex,
  removePendingCompletion,
  upsertPendingCompletion,
  type PendingCompletionInput,
} from './completion-outbox';

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);

function practiceInput(
  input?: PendingCompletionInput & { kind: 'record_practice' },
): PendingCompletionInput {
  if (input) {
    return input;
  }

  return {
    kind: 'record_practice',
    input: {
      metric: 'pushups',
      source: 'in_app_pose',
      count: 10,
      durationSeconds: 40,
      startedAt: '2026-11-08T12:00:00.000Z',
      endedAt: '2026-11-08T12:00:40.000Z',
      externalId: 'in-app-pose:uc-1:2026-11-08T12:00:00.000Z',
    },
  };
}

describe('completion-outbox', () => {
  beforeEach(() => {
    getItemAsync.mockReset();
    setItemAsync.mockReset();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue(undefined);
  });

  it('builds stable dedupe keys per kind', () => {
    expect(
      completionDedupeKey({
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
            externalId: 'in-app-pose:uc-1:start',
          },
        },
      }),
    ).toBe('complete_challenge:uc-1:in-app-pose:uc-1:start');

    expect(completionDedupeKey(practiceInput())).toBe(
      'record_practice:in-app-pose:uc-1:2026-11-08T12:00:00.000Z',
    );

    expect(
      completionDedupeKey({
        kind: 'submit_match_attempt',
        input: {
          matchId: 'm1',
          count: 15,
          durationSeconds: 50,
          source: 'in_app_pose',
          clientAttemptId: 'match-attempt:m1:start',
        },
      }),
    ).toBe('submit_match_attempt:match-attempt:m1:start');
  });

  it('upserts and lists oldest first', async () => {
    const first = await upsertPendingCompletion(practiceInput());
    getItemAsync.mockResolvedValue(
      JSON.stringify({
        [first.id]: first,
      }),
    );

    const second = await upsertPendingCompletion({
      kind: 'submit_match_attempt',
      input: {
        matchId: 'm1',
        count: 12,
        durationSeconds: 40,
        source: 'in_app_pose',
        clientAttemptId: 'match-attempt:m1:later',
      },
    });

    const written = JSON.parse(String(setItemAsync.mock.calls.at(-1)?.[1])) as Record<
      string,
      { id: string; createdAt: string }
    >;
    written[first.id] = { ...first, createdAt: '2026-11-08T10:00:00.000Z' };
    written[second.id] = { ...second, createdAt: '2026-11-08T11:00:00.000Z' };
    getItemAsync.mockResolvedValue(JSON.stringify(written));

    const listed = await listPendingCompletions();
    expect(listed.map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it('dedupes on upsert and keeps the original createdAt', async () => {
    const first = await upsertPendingCompletion(practiceInput());
    getItemAsync.mockResolvedValue(JSON.stringify({ [first.id]: first }));

    const updated = await upsertPendingCompletion(
      practiceInput({
        kind: 'record_practice',
        input: {
          metric: 'pushups',
          source: 'in_app_pose',
          count: 12,
          durationSeconds: 45,
          startedAt: '2026-11-08T12:00:00.000Z',
          endedAt: '2026-11-08T12:00:45.000Z',
          externalId: 'in-app-pose:uc-1:2026-11-08T12:00:00.000Z',
        },
      }),
    );

    expect(updated.id).toBe(first.id);
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.kind).toBe('record_practice');
    if (updated.kind === 'record_practice') {
      expect(updated.input.count).toBe(12);
    }
  });

  it('removes a pending entry', async () => {
    const entry = await upsertPendingCompletion(practiceInput());
    getItemAsync.mockResolvedValue(JSON.stringify({ [entry.id]: entry }));

    await removePendingCompletion(entry.id);

    const written = JSON.parse(String(setItemAsync.mock.calls.at(-1)?.[1]));
    expect(written[entry.id]).toBeUndefined();
  });

  it('keeps old parked entries instead of dropping them', async () => {
    const oldId = 'record_practice:old';
    getItemAsync.mockResolvedValue(
      JSON.stringify({
        [oldId]: {
          ...practiceInput(),
          id: oldId,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'parked',
          attempts: 2,
          nextAttemptAt: null,
          lastErrorKind: 'permanent',
          appVersion: '1.0.0',
        },
      }),
    );

    const index = await loadPendingCompletionsIndex(Date.now(), '1.0.0');
    expect(Object.keys(index)).toEqual([oldId]);
    expect(index[oldId]?.status).toBe('parked');
  });

  it('re-queues parked entries after an app version change', async () => {
    const parkedId = 'record_practice:parked';
    getItemAsync.mockResolvedValue(
      JSON.stringify({
        [parkedId]: {
          ...practiceInput(),
          id: parkedId,
          createdAt: '2026-11-08T10:00:00.000Z',
          status: 'parked',
          attempts: 3,
          nextAttemptAt: null,
          lastErrorKind: 'permanent',
          appVersion: '1.0.0',
        },
      }),
    );

    const index = await loadPendingCompletionsIndex(Date.now(), '1.1.0');
    expect(index[parkedId]?.status).toBe('pending');
    expect(index[parkedId]?.appVersion).toBe('1.1.0');
  });

  it('serialises concurrent upserts so neither write is lost', async () => {
    let stored: string | null = null;
    getItemAsync.mockImplementation(async () => stored);
    setItemAsync.mockImplementation(async (_key, value) => {
      stored = String(value);
    });

    await Promise.all([
      upsertPendingCompletion(practiceInput()),
      upsertPendingCompletion({
        kind: 'submit_match_attempt',
        input: {
          matchId: 'm1',
          count: 8,
          durationSeconds: 30,
          source: 'in_app_pose',
          clientAttemptId: 'match-attempt:m1:a',
        },
      }),
    ]);

    const written = JSON.parse(String(stored)) as Record<string, { id: string }>;
    expect(Object.keys(written).sort()).toEqual([
      'record_practice:in-app-pose:uc-1:2026-11-08T12:00:00.000Z',
      'submit_match_attempt:match-attempt:m1:a',
    ]);
  });

  it('loads a single entry', async () => {
    const entry = await upsertPendingCompletion(practiceInput());
    getItemAsync.mockResolvedValue(JSON.stringify({ [entry.id]: entry }));

    const loaded = await getPendingCompletion(entry.id);
    expect(loaded?.id).toBe(entry.id);
    expect(await getPendingCompletion('missing')).toBeNull();
  });
});
