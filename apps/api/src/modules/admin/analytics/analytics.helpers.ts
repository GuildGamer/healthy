export function resolveRange(daysInput: number | undefined): {
  days: number;
  rangeStart: Date;
  weekStart: Date;
  now: Date;
} {
  const days = daysInput ?? 28;
  const now = new Date();
  const rangeStart = startOfUtcDay(addUtcDays(now, -days + 1));
  const weekStart = startOfUtcDay(addUtcDays(now, -6));
  return { days, rangeStart, weekStart, now };
}

export function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, numerator / denominator));
}

export function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function bucketByDay(
  dates: readonly Date[],
  rangeStart: Date,
  days: number,
): Array<{ day: string; count: number }> {
  const counts = new Map<string, number>();
  for (let index = 0; index < days; index += 1) {
    const key = dayKey(addUtcDays(rangeStart, index));
    counts.set(key, 0);
  }

  for (const date of dates) {
    const key = dayKey(date);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()].map(([day, count]) => ({ day, count }));
}

export function countryShares(
  codes: readonly (string | null | undefined)[],
): Array<{
  countryCode: string | null;
  members: number;
  share: number;
}> {
  const counts = new Map<string | null, number>();
  for (const code of codes) {
    const key = code ?? null;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = codes.length;
  return [...counts.entries()]
    .map(([countryCode, members]) => ({
      countryCode,
      members,
      share: rate(members, total),
    }))
    .sort((left, right) => right.members - left.members);
}

export function streakBucketKey(days: number): string {
  if (days <= 0) {
    return '0';
  }
  if (days <= 3) {
    return '1–3';
  }
  if (days <= 7) {
    return '4–7';
  }
  if (days <= 30) {
    return '8–30';
  }
  return '31+';
}

/**
 * True when the busiest day exceeds 2× the median daily count and at least
 * one event occurred. Empty or all-zero series is never a spike.
 */
export function isDailyCountSpike(dailyCounts: readonly number[]): boolean {
  const positive = dailyCounts.filter((count) => count > 0);
  if (positive.length === 0) {
    return false;
  }

  const sorted = [...positive].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : (sorted[mid] ?? 0);
  const peak = Math.max(...positive);
  return peak > 2 * median;
}

export type GroupNotificationToggle = {
  disabled: boolean;
};

/**
 * Pulls group-notification toggle flips out of `setting_changed` payloads.
 */
export function parseGroupNotificationToggle(
  properties: unknown,
): GroupNotificationToggle | null {
  if (!properties || typeof properties !== 'object') {
    return null;
  }

  const record = properties as Record<string, unknown>;
  if (record.setting !== 'groupNotificationsEnabled') {
    return null;
  }

  if (typeof record.value !== 'boolean') {
    return null;
  }

  return { disabled: record.value === false };
}

function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function addUtcDays(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}
