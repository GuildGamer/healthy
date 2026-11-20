import { daySquaresFor, dayStripUnit } from './group-days';

const strip = {
  dayKeys: ['2026-10-22', '2026-10-23', '2026-10-24'],
  todayKey: '2026-10-23',
};

describe('daySquaresFor', () => {
  it('fills the days you moved the board and marks today', () => {
    expect(daySquaresFor(strip, ['2026-10-22'])).toEqual([
      { dayKey: '2026-10-22', letter: 'T', isHit: true, isToday: false },
      { dayKey: '2026-10-23', letter: 'F', isHit: false, isToday: true },
      { dayKey: '2026-10-24', letter: 'S', isHit: false, isToday: false },
    ]);
  });

  it('counts the unit from the squares', () => {
    expect(dayStripUnit(strip)).toBe('of 3 days');
  });
});
