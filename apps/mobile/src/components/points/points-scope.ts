export type PointsScope = 'all' | 'earned' | 'penalties';

export interface PointsLedgerItem {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
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
