import { describe, expect, it } from 'vitest';
import { periodReportOpenUrl } from './period-report-link.js';

describe('periodReportOpenUrl', () => {
  it('points at the report route for the day the window closed', () => {
    expect(
      periodReportOpenUrl('https://www.gethealthyapp.com/', 'month', '2026-10-31'),
    ).toBe('https://www.gethealthyapp.com/progress/report?period=month&on=2026-10-31');
  });
});
