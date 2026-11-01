import { closedWindowEndDay, reportHrefFromUrl } from './report-link';

/** Sunday 1 November 2026 local — morning after October closed. */
const AFTER_OCTOBER = new Date(2026, 10, 1, 9, 0, 0);

describe('closedWindowEndDay', () => {
  it('ends the previous month on its last calendar day', () => {
    expect(closedWindowEndDay('month', AFTER_OCTOBER)).toBe('2026-10-31');
  });

  it('ends the previous week on Sunday before this Monday', () => {
    // Wednesday 28 Oct 2026 — this week’s Monday is the 26th, previous Sunday the 25th.
    expect(closedWindowEndDay('week', new Date(2026, 9, 28, 12, 0, 0))).toBe('2026-10-25');
  });

  it('ends the previous year on 31 December', () => {
    expect(closedWindowEndDay('year', AFTER_OCTOBER)).toBe('2025-12-31');
  });
});

describe('reportHrefFromUrl', () => {
  it('maps the shared https report onto the screen, keeping the closed day', () => {
    expect(
      reportHrefFromUrl(
        'https://www.gethealthyapp.com/progress/report?period=month&on=2026-10-31',
      ),
    ).toBe('/progress/report?period=month&on=2026-10-31');
  });

  it('accepts the apex host and the path mail used to send', () => {
    expect(
      reportHrefFromUrl(
        'https://gethealthyapp.com/app/progress/report?period=week',
        AFTER_OCTOBER,
      ),
    ).toBe('/progress/report?period=week&on=2026-10-25');
  });

  it('maps the custom scheme as the webview fallback', () => {
    expect(reportHrefFromUrl('healthy://progress/report?period=year&on=2026-12-31')).toBe(
      '/progress/report?period=year&on=2026-12-31',
    );
  });

  it('accepts Expo’s path without a leading slash', () => {
    expect(
      reportHrefFromUrl('progress/report?period=month&on=2026-10-31'),
    ).toBe('/progress/report?period=month&on=2026-10-31');
  });

  it('fills the closed month when old mail only named the period', () => {
    expect(
      reportHrefFromUrl(
        'https://www.gethealthyapp.com/progress/report?period=month',
        AFTER_OCTOBER,
      ),
    ).toBe('/progress/report?period=month&on=2026-10-31');
  });

  it('fills the closed week and year when the day is missing', () => {
    expect(
      reportHrefFromUrl(
        'https://www.gethealthyapp.com/app/progress/report?period=week',
        AFTER_OCTOBER,
      ),
    ).toBe('/progress/report?period=week&on=2026-10-25');
    expect(
      reportHrefFromUrl(
        'https://www.gethealthyapp.com/progress/report?period=year',
        AFTER_OCTOBER,
      ),
    ).toBe('/progress/report?period=year&on=2025-12-31');
  });

  it('drops a period or day that is not one of ours', () => {
    expect(
      reportHrefFromUrl(
        'https://www.gethealthyapp.com/progress/report?period=day&on=October',
      ),
    ).toBe('/progress/report');
  });

  it('ignores the rest of the site', () => {
    expect(reportHrefFromUrl('https://www.gethealthyapp.com/progress/reports')).toBeNull();
    expect(reportHrefFromUrl('https://example.com/progress/report?period=month')).toBeNull();
    expect(reportHrefFromUrl('not a url')).toBeNull();
  });
});
