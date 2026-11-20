import type { MeOutput } from '@product/client';
import { ordinal } from '@/components/home/today-labels';
import type { BoardStanding } from '@/components/leaderboard';
import { formatPoints } from '@/components/points';
import type { ProgressStat } from './ProgressStats';

const NO_PLACE = '—';

function placeValue(standing: BoardStanding): string {
  if (standing.kind === 'ranked') {
    return ordinal(standing.rank);
  }

  return standing.kind === 'hidden' ? 'Hidden' : NO_PLACE;
}

/** The run with its record beside it, points, and this week's place. */
export function youStats(
  me: Pick<MeOutput, 'currentStreakDays' | 'bestStreakDays' | 'pointsBalance'>,
  standing: BoardStanding,
): ProgressStat[] {
  const hasOlderRecord = me.bestStreakDays > me.currentStreakDays;

  return [
    {
      value: String(me.currentStreakDays),
      aside: hasOlderRecord ? `best ${me.bestStreakDays}` : null,
      label: 'day run',
      testID: 'progress-stat-run',
    },
    { value: formatPoints(me.pointsBalance), label: 'points', testID: 'progress-stat-points' },
    { value: placeValue(standing), label: 'this week', testID: 'progress-stat-place' },
  ];
}
