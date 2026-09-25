export type PointsScope = 'all' | 'earned' | 'penalties';

export interface PointsLedgerItem {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
  kind: 'points' | 'practice';
  count: number | null;
}

export const POINTS_SCOPES: readonly {
  id: PointsScope;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'penalties', label: 'Penalties' },
];

export function filterPointsItems<T extends Pick<PointsLedgerItem, 'delta'>>(
  items: readonly T[],
  scope: PointsScope,
): T[] {
  if (scope === 'earned') {
    return items.filter((item) => item.delta > 0);
  }

  if (scope === 'penalties') {
    return items.filter((item) => item.delta < 0);
  }

  return [...items];
}

export function emptyPointsCopy(scope: PointsScope): string {
  if (scope === 'earned') {
    return 'Complete a challenge to earn your first points.';
  }

  if (scope === 'penalties') {
    return 'No penalties yet.';
  }

  return 'Complete a challenge to see your first points.';
}

export function formatLedgerTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPointsDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/**
 * Practice earns nothing, so its row trades the points column for the reps that
 * were actually done. Rendering `+0` there would read as a broken reward.
 */
export function formatActivityAmount(
  item: Pick<PointsLedgerItem, 'kind' | 'delta' | 'count'>,
): string {
  if (item.kind !== 'practice') {
    return formatPointsDelta(item.delta);
  }

  const reps = item.count ?? 0;

  return reps === 1 ? '1 rep' : `${reps} reps`;
}
