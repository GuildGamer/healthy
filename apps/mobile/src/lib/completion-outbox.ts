import type {
  CompleteChallengeInput,
  RecordPracticeSessionInput,
  SubmitMatchAttemptInput,
  UserChallengeStatus,
} from '@product/client';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const INDEX_KEY = 'completion_outbox_v1';

export type PendingSyncStatus = 'pending' | 'parked';
export type PendingErrorKind = 'retryable' | 'permanent' | null;

type PendingBase = {
  /** Stable dedupe key for this logical piece of work. */
  id: string;
  createdAt: string;
  status: PendingSyncStatus;
  attempts: number;
  nextAttemptAt: string | null;
  lastAttemptAt?: string;
  lastError?: string | null;
  lastErrorKind: PendingErrorKind;
  /** App version when this entry was last written or parked. */
  appVersion: string;
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
  | Omit<
      PendingCompleteChallenge,
      | 'id'
      | 'createdAt'
      | 'lastAttemptAt'
      | 'lastError'
      | 'status'
      | 'attempts'
      | 'nextAttemptAt'
      | 'lastErrorKind'
      | 'appVersion'
    >
  | Omit<
      PendingRecordPractice,
      | 'id'
      | 'createdAt'
      | 'lastAttemptAt'
      | 'lastError'
      | 'status'
      | 'attempts'
      | 'nextAttemptAt'
      | 'lastErrorKind'
      | 'appVersion'
    >
  | Omit<
      PendingSubmitMatchAttempt,
      | 'id'
      | 'createdAt'
      | 'lastAttemptAt'
      | 'lastError'
      | 'status'
      | 'attempts'
      | 'nextAttemptAt'
      | 'lastErrorKind'
      | 'appVersion'
    >;

type Index = Record<string, PendingCompletion>;

type Listener = () => void;

let writeChain: Promise<void> = Promise.resolve();
const listeners = new Set<Listener>();

export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Lets UI subscribe to outbox changes without polling SecureStore. */
export function subscribePendingCompletions(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Serialises every outbox read/write so a live save and a background flush
 * cannot overwrite each other.
 */
function withOutboxLock<T>(work: () => Promise<T>): Promise<T> {
  const run = writeChain.then(work, work);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

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
  notifyListeners();
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

  const attemptId = input.input.clientAttemptId ?? `anon:${input.input.matchId}`;
  return `submit_match_attempt:${attemptId}`;
}

function normalizeEntry(entry: PendingCompletion): PendingCompletion {
  return {
    ...entry,
    status: entry.status ?? 'pending',
    attempts: entry.attempts ?? 0,
    nextAttemptAt: entry.nextAttemptAt ?? null,
    lastError: entry.lastError ?? null,
    lastErrorKind: entry.lastErrorKind ?? null,
    appVersion: entry.appVersion ?? currentAppVersion(),
  };
}

/**
 * Loads the index and re-queues parked entries after an app update. Entries
 * are never dropped silently.
 */
export async function loadPendingCompletionsIndex(
  now = Date.now(),
  appVersion = currentAppVersion(),
): Promise<Index> {
  return withOutboxLock(async () => {
    const index = await readIndex();
    const next: Index = {};
    let changed = false;

    for (const [id, raw] of Object.entries(index)) {
      const entry = normalizeEntry(raw);
      if (entry.status === 'parked' && entry.appVersion !== appVersion) {
        next[id] = {
          ...entry,
          status: 'pending',
          nextAttemptAt: new Date(now).toISOString(),
          lastErrorKind: null,
          appVersion,
        };
        changed = true;
        continue;
      }
      next[id] = entry;
    }

    if (changed || Object.keys(next).length !== Object.keys(index).length) {
      await writeIndex(next);
    }

    return next;
  });
}

/** @deprecated Prefer loadPendingCompletionsIndex — kept for older call sites. */
export async function prunePendingCompletions(now = Date.now()): Promise<Index> {
  return loadPendingCompletionsIndex(now);
}

/**
 * Queues a completion (or updates an existing one with the same dedupe key).
 * Preserves `createdAt` on update so FIFO order stays stable across retries.
 */
export async function upsertPendingCompletion(
  input: PendingCompletionInput,
): Promise<PendingCompletion> {
  return withOutboxLock(async () => {
    const index = await readIndex();
    const normalized: Index = {};
    for (const [id, raw] of Object.entries(index)) {
      normalized[id] = normalizeEntry(raw);
    }

    const id = completionDedupeKey(input);
    const existing = normalized[id];
    const createdAt = existing?.createdAt ?? new Date().toISOString();
    const appVersion = currentAppVersion();

    let entry: PendingCompletion;
    const base = {
      id,
      createdAt,
      status: 'pending' as const,
      attempts: existing?.attempts ?? 0,
      nextAttemptAt: existing?.nextAttemptAt ?? null,
      lastAttemptAt: existing?.lastAttemptAt,
      lastError: existing?.lastError ?? null,
      lastErrorKind: existing?.lastErrorKind ?? null,
      appVersion,
    };

    if (input.kind === 'complete_challenge') {
      entry = {
        ...base,
        kind: 'complete_challenge',
        userChallengeId: input.userChallengeId,
        occurrenceStatus: input.occurrenceStatus,
        payload: input.payload,
      };
    } else if (input.kind === 'record_practice') {
      entry = {
        ...base,
        kind: 'record_practice',
        input: input.input,
      };
    } else {
      entry = {
        ...base,
        kind: 'submit_match_attempt',
        input: input.input,
      };
    }

    normalized[id] = entry;
    await writeIndex(normalized);
    return entry;
  });
}

export async function getPendingCompletion(id: string): Promise<PendingCompletion | null> {
  const index = await loadPendingCompletionsIndex();
  const entry = index[id];
  return entry ? normalizeEntry(entry) : null;
}

export async function removePendingCompletion(id: string): Promise<void> {
  return withOutboxLock(async () => {
    const index = await readIndex();
    if (!(id in index)) {
      return;
    }
    delete index[id];
    await writeIndex(index);
  });
}

export async function markPendingCompletionAttempt(
  id: string,
  error: string | null,
  options: {
    kind?: PendingErrorKind;
    nextAttemptAt?: string | null;
    status?: PendingSyncStatus;
  } = {},
): Promise<void> {
  return withOutboxLock(async () => {
    const index = await readIndex();
    const existing = index[id];
    if (!existing) {
      return;
    }
    const normalized = normalizeEntry(existing);
    index[id] = {
      ...normalized,
      attempts: normalized.attempts + 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: error,
      lastErrorKind: options.kind ?? normalized.lastErrorKind,
      nextAttemptAt:
        options.nextAttemptAt !== undefined ? options.nextAttemptAt : normalized.nextAttemptAt,
      status: options.status ?? normalized.status,
      appVersion: currentAppVersion(),
    };
    await writeIndex(index);
  });
}

/** Oldest first so a start-before-complete pair stays ordered when queued that way. */
export async function listPendingCompletions(): Promise<PendingCompletion[]> {
  const index = await loadPendingCompletionsIndex();
  return Object.values(index)
    .map(normalizeEntry)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Snapshot for UI without going through the async lock twice. */
export async function snapshotPendingCompletions(): Promise<PendingCompletion[]> {
  return listPendingCompletions();
}

/** Manual retry: move parked entries back to pending and try again now. */
export async function requeueParkedCompletions(): Promise<void> {
  return withOutboxLock(async () => {
    const index = await readIndex();
    let changed = false;
    const now = new Date().toISOString();
    for (const [id, raw] of Object.entries(index)) {
      const entry = normalizeEntry(raw);
      if (entry.status !== 'parked') {
        continue;
      }
      index[id] = {
        ...entry,
        status: 'pending',
        nextAttemptAt: now,
        lastErrorKind: null,
        appVersion: currentAppVersion(),
      };
      changed = true;
    }
    if (changed) {
      await writeIndex(index);
    }
  });
}
