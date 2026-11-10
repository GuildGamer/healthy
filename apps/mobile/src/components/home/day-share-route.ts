import type { DayShareContent } from './types/day-share';

/** Route params for `/share/day` — all strings, as a URL carries them. */
export function dayShareParams(content: DayShareContent): Record<string, string> {
  return {
    weekday: content.weekday,
    dateLabel: content.dateLabel,
    completedCount: String(content.completedCount),
    totalCount: String(content.totalCount),
    pointsToday: String(content.pointsToday),
    streakDays: String(content.streakDays),
  };
}

/** Reads day share content back from the route, or null when a link is incomplete. */
export function parseDayShareContent(
  params: Partial<Record<keyof DayShareContent, string>>,
): DayShareContent | null {
  const { weekday, dateLabel, completedCount, totalCount, pointsToday, streakDays } = params;
  if (!weekday || !dateLabel || !completedCount || !totalCount || !pointsToday || !streakDays) {
    return null;
  }

  const completed = Number(completedCount);
  const total = Number(totalCount);
  const points = Number(pointsToday);
  const streak = Number(streakDays);
  if (
    !Number.isFinite(completed) ||
    !Number.isFinite(total) ||
    !Number.isFinite(points) ||
    !Number.isFinite(streak)
  ) {
    return null;
  }

  return {
    weekday,
    dateLabel,
    completedCount: completed,
    totalCount: total,
    pointsToday: points,
    streakDays: streak,
  };
}
