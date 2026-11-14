import { useSyncExternalStore } from 'react';
import {
  listPendingCompletions,
  subscribePendingCompletions,
  type PendingCompletion,
} from '@/lib/completion-outbox';

export type PendingSyncSnapshot = {
  pending: PendingCompletion[];
  parked: PendingCompletion[];
  pendingCount: number;
  parkedCount: number;
  /** Reps waiting to land, keyed by contest id. */
  pendingCountByMatchId: ReadonlyMap<string, number>;
  /** Reps waiting to land, keyed by device metric. */
  pendingCountByMetric: ReadonlyMap<string, number>;
};

const EMPTY: PendingSyncSnapshot = {
  pending: [],
  parked: [],
  pendingCount: 0,
  parkedCount: 0,
  pendingCountByMatchId: new Map(),
  pendingCountByMetric: new Map(),
};

let cached: PendingSyncSnapshot = EMPTY;
let loadInFlight: Promise<void> | null = null;

function countFromEntry(entry: PendingCompletion): number {
  if (entry.kind === 'submit_match_attempt') {
    return entry.input.count;
  }
  if (entry.kind === 'record_practice') {
    return entry.input.count ?? 0;
  }
  return entry.payload.deviceActivity?.count ?? 0;
}

function metricFromEntry(entry: PendingCompletion): string | null {
  if (entry.kind === 'submit_match_attempt') {
    return null;
  }
  if (entry.kind === 'record_practice') {
    return entry.input.metric;
  }
  return entry.payload.deviceActivity?.metric ?? null;
}

function matchIdFromEntry(entry: PendingCompletion): string | null {
  if (entry.kind === 'submit_match_attempt') {
    return entry.input.matchId;
  }
  return null;
}

function buildSnapshot(entries: PendingCompletion[]): PendingSyncSnapshot {
  const pending = entries.filter((entry) => entry.status === 'pending');
  const parked = entries.filter((entry) => entry.status === 'parked');
  const pendingCountByMatchId = new Map<string, number>();
  const pendingCountByMetric = new Map<string, number>();

  for (const entry of pending) {
    const count = countFromEntry(entry);
    const matchId = matchIdFromEntry(entry);
    if (matchId) {
      pendingCountByMatchId.set(matchId, (pendingCountByMatchId.get(matchId) ?? 0) + count);
    }
    const metric = metricFromEntry(entry);
    if (metric) {
      pendingCountByMetric.set(metric, (pendingCountByMetric.get(metric) ?? 0) + count);
    }
  }

  return {
    pending,
    parked,
    pendingCount: pending.length,
    parkedCount: parked.length,
    pendingCountByMatchId,
    pendingCountByMetric,
  };
}

const snapshotListeners = new Set<() => void>();

function notifySnapshotListeners(): void {
  for (const listener of snapshotListeners) {
    listener();
  }
}

function refreshSnapshot(): void {
  if (loadInFlight) {
    return;
  }
  loadInFlight = listPendingCompletions()
    .then((entries) => {
      cached = buildSnapshot(entries);
      notifySnapshotListeners();
    })
    .catch(() => {
      // Keep the last good snapshot; the next write will refresh.
    })
    .finally(() => {
      loadInFlight = null;
    });
}

function subscribe(listener: () => void): () => void {
  snapshotListeners.add(listener);
  const unsubscribeOutbox = subscribePendingCompletions(() => {
    refreshSnapshot();
  });
  refreshSnapshot();
  return () => {
    snapshotListeners.delete(listener);
    unsubscribeOutbox();
  };
}

function getSnapshot(): PendingSyncSnapshot {
  return cached;
}

/** Pending and parked set counts for Today, boards, and the success screen. */
export function usePendingSync(): PendingSyncSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Test helper. */
export function resetPendingSyncSnapshot(): void {
  cached = EMPTY;
}
