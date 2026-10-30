import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { TrackAnalyticsEventInput } from '@product/contract';
import { apiClient } from '../api';
import { getAnalyticsInstallId } from './install-id';
import { getAnalyticsSessionId } from './session';

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_AT_COUNT = 20;

type QueuedEvent = TrackAnalyticsEventInput;

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

function platform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function enqueueAnalyticsEvent(
  event: Omit<QueuedEvent, 'anonymousId' | 'context'> & {
    anonymousId?: string;
    context?: QueuedEvent['context'];
  },
): void {
  queue.push({
    ...event,
    context: {
      platform: platform(),
      appVersion: appVersion(),
      sessionId: getAnalyticsSessionId(),
      emitter: 'mobile',
      ...event.context,
    },
  });

  ensureFlushTimer();
  if (queue.length >= FLUSH_AT_COUNT) {
    void flushAnalyticsQueue();
  }
}

function ensureFlushTimer(): void {
  if (flushTimer != null) {
    return;
  }
  flushTimer = setInterval(() => {
    void flushAnalyticsQueue();
  }, FLUSH_INTERVAL_MS);
}

export async function flushAnalyticsQueue(): Promise<void> {
  if (flushing || queue.length === 0) {
    return;
  }

  flushing = true;
  const batch = queue.splice(0, 50);
  try {
    const installId = await getAnalyticsInstallId();
    const events = batch.map((event) => ({
      ...event,
      anonymousId: event.anonymousId ?? installId,
    }));

    if (events.length === 1) {
      await apiClient.trackAnalyticsEvent(events[0]!);
    } else {
      await apiClient.trackAnalyticsEventsBatch({ events });
    }
  } catch {
    // Analytics must never block product paths; drop failed batches.
  } finally {
    flushing = false;
  }
}

/** Test-only: drain without network. */
export function __drainAnalyticsQueueForTests(): QueuedEvent[] {
  return queue.splice(0, queue.length);
}
