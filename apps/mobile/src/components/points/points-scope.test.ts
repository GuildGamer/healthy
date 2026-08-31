import {
  emptyPointsCopy,
  filterPointsItems,
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
});
