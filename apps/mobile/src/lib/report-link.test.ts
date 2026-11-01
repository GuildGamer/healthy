import { reportHrefFromUrl } from './report-link';

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
      reportHrefFromUrl('https://gethealthyapp.com/app/progress/report?period=week'),
    ).toBe('/progress/report?period=week');
  });

  it('maps the custom scheme as the webview fallback', () => {
    expect(reportHrefFromUrl('healthy://progress/report?period=year&on=2026-12-31')).toBe(
      '/progress/report?period=year&on=2026-12-31',
    );
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
