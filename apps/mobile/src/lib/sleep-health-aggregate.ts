const MS_PER_MINUTE = 60_000;

/** One sleep segment from a health store before aggregation. */
export type SleepInterval = {
  startMs: number;
  endMs: number;
  kind: 'asleep' | 'in_bed';
};

export type AggregatedSleepNight = {
  wentToBedAt: string;
  wokeUpAt: string;
  durationMinutes: number;
  inBedOnly: boolean;
};

/** Local 18:00 yesterday → 12:00 today — the usual overnight sleep window. */
export function lastNightSleepQueryBounds(now: Date = new Date()): { start: Date; end: Date } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 18, 0, 0, 0);
  return { start, end };
}

/**
 * Merges overlapping or touching intervals of the same kind, then returns the
 * longest contiguous block. Prefer asleep segments; fall back to in-bed only.
 */
export function aggregateLastNightSleep(intervals: SleepInterval[]): AggregatedSleepNight | null {
  const asleep = mergeOverlapping(intervals.filter((interval) => interval.kind === 'asleep'));
  if (asleep.length > 0) {
    return nightFromLongest(asleep, false);
  }

  const inBed = mergeOverlapping(intervals.filter((interval) => interval.kind === 'in_bed'));
  if (inBed.length > 0) {
    return nightFromLongest(inBed, true);
  }

  return null;
}

type TimeBlock = { startMs: number; endMs: number };

function mergeOverlapping(intervals: TimeBlock[]): TimeBlock[] {
  const valid = intervals
    .filter((interval) => interval.endMs > interval.startMs)
    .sort((left, right) => left.startMs - right.startMs);

  const first = valid[0];
  if (!first) {
    return [];
  }

  const merged: TimeBlock[] = [{ startMs: first.startMs, endMs: first.endMs }];

  for (let index = 1; index < valid.length; index += 1) {
    const next = valid[index];
    const current = merged[merged.length - 1];
    if (!next || !current) {
      continue;
    }

    if (next.startMs <= current.endMs) {
      current.endMs = Math.max(current.endMs, next.endMs);
      continue;
    }

    merged.push({ startMs: next.startMs, endMs: next.endMs });
  }

  return merged;
}

function nightFromLongest(blocks: TimeBlock[], inBedOnly: boolean): AggregatedSleepNight {
  let longest: TimeBlock | null = null;
  for (const candidate of blocks) {
    if (!longest || candidate.endMs - candidate.startMs > longest.endMs - longest.startMs) {
      longest = candidate;
    }
  }

  // Callers only pass a non-empty merged list.
  if (!longest) {
    throw new Error('nightFromLongest requires at least one block');
  }

  return {
    wentToBedAt: new Date(longest.startMs).toISOString(),
    wokeUpAt: new Date(longest.endMs).toISOString(),
    durationMinutes: Math.round((longest.endMs - longest.startMs) / MS_PER_MINUTE),
    inBedOnly,
  };
}
