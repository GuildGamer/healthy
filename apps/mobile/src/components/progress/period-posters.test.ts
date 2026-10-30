import {
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
  it('uses the activity fill and period corner', () => {
    expect(
      metricPeriodPoster({
        metric: 'pushups',
        period: 'week',
        periodLabel: 'This week',
        count: 240,
        unit: 'push-ups',
        activeDays: 5,
        startDayKey: '2026-10-19',
        endDayKey: '2026-10-22',
      }),
    ).toEqual({
      kind: 'strength',
      label: 'Push-ups',
      value: '240',
      unit: 'push-ups',
      corner: 'This week',
    });
  });
});
