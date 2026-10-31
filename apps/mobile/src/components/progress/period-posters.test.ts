import {
  metricPeriodFacts,
  metricPeriodPoster,
  periodReportPoster,
  periodReportRunLine,
} from './period-posters';

describe('periodReportPoster', () => {
  it('builds a streak poster for the week', () => {
    expect(
      periodReportPoster({
        period: 'week',
        periodLabel: 'Oct 19–22',
        activeDays: 6,
        highlight: { metric: 'pushups', count: 240, unit: 'push-ups' },
        startDayKey: '2026-10-19',
        endDayKey: '2026-10-22',
      }),
    ).toEqual({
      kind: 'streak',
      label: 'Week recap',
      value: '6',
      unit: 'days active',
      corner: 'Oct 19–22',
      facts: [{ label: 'Push-ups', value: '240' }],
    });
  });

  it('puts the highlight on the brand line', () => {
    expect(
      periodReportRunLine({
        period: 'week',
        periodLabel: 'Oct 19–22',
        activeDays: 6,
        highlight: { metric: 'pushups', count: 240, unit: 'push-ups' },
        startDayKey: '2026-10-19',
        endDayKey: '2026-10-22',
      }),
    ).toBe('240 push-ups');
  });
});

describe('metricPeriodPoster', () => {
  it('uses the activity fill, period corner, and fact strip', () => {
    expect(
      metricPeriodPoster({
        metric: 'pushups',
        period: 'week',
        periodLabel: 'This week',
        count: 240,
        unit: 'push-ups',
        activeDays: 5,
        windowDays: 7,
        bestDay: { dayKey: '2026-10-20', count: 80 },
        avgPerDay: 34,
        startDayKey: '2026-10-19',
        endDayKey: '2026-10-22',
      }),
    ).toEqual({
      kind: 'strength',
      label: 'Push-ups',
      value: '240',
      unit: 'push-ups',
      corner: 'This week',
      facts: [
        { label: 'Best day', value: '80' },
        { label: 'Days on', value: '5' },
        { label: 'Avg / day', value: '34' },
      ],
    });
  });
});

describe('metricPeriodFacts', () => {
  it('shows an em dash when there is no best day', () => {
    expect(
      metricPeriodFacts({
        metric: 'pushups',
        period: 'week',
        periodLabel: 'This week',
        count: 0,
        unit: 'push-ups',
        activeDays: 0,
        windowDays: 4,
        bestDay: null,
        avgPerDay: 0,
        startDayKey: '2026-10-19',
        endDayKey: '2026-10-22',
      }),
    ).toEqual([
      { label: 'Best day', value: '—' },
      { label: 'Days on', value: '0' },
      { label: 'Avg / day', value: '0' },
    ]);
  });
});
