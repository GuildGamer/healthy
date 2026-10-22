import type { DayShareContent } from './types/day-share';

type DayShareHero = { value: string; unit: string };

type DayShareFact = { label: string; value: string };

/** A run is the shareable fact; on its first day the day's count stands in. */
export function dayShareHero(content: DayShareContent): DayShareHero {
  if (content.streakDays > 1) {
    return { value: String(content.streakDays), unit: 'days running' };
  }

  return {
    value: String(content.completedCount),
    unit: content.completedCount === 1 ? 'challenge done' : 'challenges done',
  };
}

/** Counts only: no challenge name, condition or reading ever leaves the phone. */
export function dayShareFacts(content: DayShareContent): DayShareFact[] {
  const points = { label: 'Points', value: `+${content.pointsToday}` };
  if (content.streakDays > 1) {
    return [
      { label: 'Finished', value: `${content.completedCount} of ${content.totalCount}` },
      points,
    ];
  }

  return [points, { label: 'Run', value: content.streakDays === 1 ? 'Day one' : 'Fresh start' }];
}
