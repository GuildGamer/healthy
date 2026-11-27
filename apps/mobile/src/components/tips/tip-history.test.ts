import type { HealthTip } from './constants/health-tips';
import { selectDailyTip } from './select-daily-tip';
import { earlierTips, tipDayLabel } from './tip-history';

const catalog: HealthTip[] = ['a', 'b', 'c', 'd'].map((id) => ({
  id,
  category: 'general',
  title: `Tip ${id}`,
  body: 'Body',
}));

describe('earlierTips', () => {
  it('replays the tip each earlier day gave, newest first, back to the day you joined', () => {
    const tips = earlierTips({
      catalog,
      categories: ['general'],
      todayKey: '2026-10-22',
      joinedDayKey: '2026-10-20',
    });

    expect(tips.map((item) => item.dayKey)).toEqual(['2026-10-21', '2026-10-20']);
    expect(tips[0]?.tip).toEqual(selectDailyTip(catalog, ['general'], '2026-10-21'));
  });

  it('lists a tip once, and never today’s', () => {
    const tips = earlierTips({
      catalog,
      categories: ['general'],
      todayKey: '2026-10-22',
      joinedDayKey: '2026-01-01',
    });
    const todayTip = selectDailyTip(catalog, ['general'], '2026-10-22');

    expect(tips).toHaveLength(catalog.length - 1);
    expect(tips.some((item) => item.tip.id === todayTip?.id)).toBe(false);
  });

  it('has nothing earlier on your first day', () => {
    expect(
      earlierTips({ catalog, categories: [], todayKey: '2026-10-22', joinedDayKey: '2026-10-22' }),
    ).toEqual([]);
  });
});

describe('tipDayLabel', () => {
  it('names yesterday, then weekdays, then dates', () => {
    expect(tipDayLabel('2026-10-21', '2026-10-22')).toBe('Yesterday');
    expect(tipDayLabel('2026-10-20', '2026-10-22')).toBe('Tuesday');
    expect(tipDayLabel('2026-10-12', '2026-10-22')).toBe('12 October');
  });
});
