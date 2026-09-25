import {
  emptyPointsCopy,
  filterPointsItems,
  formatActivityAmount,
  formatPointsDelta,
} from './points-scope';

const items = [
  { id: '1', delta: 20, reason: 'Walk', createdAt: '2026-08-30T10:00:00.000Z' },
  { id: '2', delta: -25, reason: 'Skipped photo', createdAt: '2026-08-30T11:00:00.000Z' },
  { id: '3', delta: 150, reason: 'Gym', createdAt: '2026-08-30T12:00:00.000Z' },
];

describe('points scope', () => {
  it('splits earned from penalties and keeps catalog order', () => {
    expect(filterPointsItems(items, 'all')).toHaveLength(3);
    expect(filterPointsItems(items, 'earned').map((item) => item.id)).toEqual([
      '1',
      '3',
    ]);
    expect(filterPointsItems(items, 'penalties').map((item) => item.id)).toEqual([
      '2',
    ]);
  });

  it('names empty states and signed deltas', () => {
    expect(emptyPointsCopy('penalties')).toBe('No penalties yet.');
    expect(formatPointsDelta(20)).toBe('+20');
    expect(formatPointsDelta(-25)).toBe('-25');
  });

  it('keeps unscored practice out of earned and penalties', () => {
    const practice = {
      id: '4',
      delta: 0,
      reason: 'Push-up practice',
      createdAt: '2026-08-30T13:00:00.000Z',
      kind: 'practice' as const,
      count: 24,
    };
    const feed = [...items.map(withPointsKind), practice];

    expect(filterPointsItems(feed, 'all')).toHaveLength(4);
    expect(filterPointsItems(feed, 'earned').map((item) => item.id)).toEqual([
      '1',
      '3',
    ]);
    expect(filterPointsItems(feed, 'penalties').map((item) => item.id)).toEqual([
      '2',
    ]);
  });

  it('shows reps instead of a zero delta on a practice row', () => {
    expect(
      formatActivityAmount({ kind: 'practice', delta: 0, count: 24 }),
    ).toBe('24 reps');
    expect(formatActivityAmount({ kind: 'practice', delta: 0, count: 1 })).toBe(
      '1 rep',
    );
    expect(
      formatActivityAmount({ kind: 'points', delta: 20, count: null }),
    ).toBe('+20');
  });
});

function withPointsKind(item: (typeof items)[number]) {
  return { ...item, kind: 'points' as const, count: null };
}
