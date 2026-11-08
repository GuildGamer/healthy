import type {
  CompleteChallengeInput,
  RecordPracticeSessionInput,
  SubmitMatchAttemptInput,
  UserChallengeStatus,
} from '@product/client';
import * as SecureStore from 'expo-secure-store';

const INDEX_KEY = 'completion_outbox_v1';
/** Pending completions older than this are dropped so SecureStore stays small. */
const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type PendingBase = {
  /** Stable dedupe key for this logical piece of work. */
  id: string;
  createdAt: string;
  lastAttemptAt?: string;
  lastError?: string | null;
};

export type PendingCompleteChallenge = PendingBase & {
  kind: 'complete_challenge';
  userChallengeId: string;
  occurrenceStatus: UserChallengeStatus;
  payload: Omit<CompleteChallengeInput, 'userChallengeId'>;
};

export type PendingRecordPractice = PendingBase & {
  kind: 'record_practice';
  input: RecordPracticeSessionInput;
};

export type PendingSubmitMatchAttempt = PendingBase & {
  kind: 'submit_match_attempt';
  input: SubmitMatchAttemptInput;
};

export type PendingCompletion =
  | PendingCompleteChallenge
  | PendingRecordPractice
  | PendingSubmitMatchAttempt;

export type PendingCompletionInput =
  | Omit<PendingCompleteChallenge, 'id' | 'createdAt' | 'lastAttemptAt' | 'lastError'>
  | Omit<PendingRecordPractice, 'id' | 'createdAt' | 'lastAttemptAt' | 'lastError'>
  | Omit<PendingSubmitMatchAttempt, 'id' | 'createdAt' | 'lastAttemptAt' | 'lastError'>;

type Index = Record<string, PendingCompletion>;

async function readIndex(): Promise<Index> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Index;
  } catch {
    return {};
  }
}

async function writeIndex(index: Index): Promise<void> {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(index));
}

/** One pending row per logical set / attempt. */
export function completionDedupeKey(input: PendingCompletionInput): string {
  if (input.kind === 'complete_challenge') {
    const externalId = input.payload.deviceActivity?.externalId;
    if (externalId) {
      return `complete_challenge:${input.userChallengeId}:${externalId}`;
    }
    return `complete_challenge:${input.userChallengeId}`;
  }

  if (input.kind === 'record_practice') {
    return `record_practice:${input.input.externalId}`;
  }

  return `submit_match_attempt:${input.input.clientAttemptId}`;
}

function normalizeEntry(entry: PendingCompletion): PendingCompletion {
  return {
    ...entry,
    lastError: entry.lastError ?? null,
  };
}

/** Drops entries older than 7 days. */
export async function prunePendingCompletions(now = Date.now()): Promise<Index> {
  const index = await readIndex();
  const next: Index = {};
  let changed = false;

  for (const [id, raw] of Object.entries(index)) {
    const entry = normalizeEntry(raw);
    const age = now - Date.parse(entry.createdAt);
    if (!Number.isFinite(age) || age > PENDING_MAX_AGE_MS) {
      changed = true;
      continue;
    }
    next[id] = entry;
  }

  if (changed || Object.keys(next).length !== Object.keys(index).length) {
    await writeIndex(next);
  }

  return next;
}

/**
 * Queues a completion (or updates an existing one with the same dedupe key).
 * Preserves `createdAt` on update so FIFO order stays stable across retries.
 */
export async function upsertPendingCompletion(
  input: PendingCompletionInput,
): Promise<PendingCompletion> {
  const index = await prunePendingCompletions();
  const id = completionDedupeKey(input);
  const existing = index[id];
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const lastAttemptAt = existing?.lastAttemptAt;
  const lastError = existing?.lastError ?? null;

  let entry: PendingCompletion;
  if (input.kind === 'complete_challenge') {
    entry = {
      kind: 'complete_challenge',
      id,
      createdAt,
      lastAttemptAt,
      lastError,
      userChallengeId: input.userChallengeId,
      occurrenceStatus: input.occurrenceStatus,
      payload: input.payload,
    };
  } else if (input.kind === 'record_practice') {
    entry = {
      kind: 'record_practice',
      id,
      createdAt,
      lastAttemptAt,
      lastError,
      input: input.input,
    };
  } else {
    entry = {
      kind: 'submit_match_attempt',
      id,
      createdAt,
      lastAttemptAt,
      lastError,
      input: input.input,
    };
  }

  index[id] = entry;
  await writeIndex(index);
  return entry;
}

export async function getPendingCompletion(id: string): Promise<PendingCompletion | null> {
  const index = await prunePendingCompletions();
  const entry = index[id];
  return entry ? normalizeEntry(entry) : null;
}

export async function removePendingCompletion(id: string): Promise<void> {
  const index = await readIndex();
  if (!(id in index)) {
    return;
  }
  delete index[id];
  await writeIndex(index);
}

export async function markPendingCompletionAttempt(
  id: string,
  error: string | null,
): Promise<void> {
  const index = await readIndex();
  const existing = index[id];
  if (!existing) {
    return;
  }
  index[id] = {
    ...normalizeEntry(existing),
    lastAttemptAt: new Date().toISOString(),
    lastError: error,
  };
  await writeIndex(index);
}

/** Oldest first so a start-before-complete pair stays ordered when queued that way. */
export async function listPendingCompletions(): Promise<PendingCompletion[]> {
  const index = await prunePendingCompletions();
  return Object.values(index)
    .map(normalizeEntry)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
