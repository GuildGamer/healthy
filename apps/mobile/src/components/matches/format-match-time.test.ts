import { formatMatchTimeLeft } from './format-match-time';

describe('formatMatchTimeLeft', () => {
  const now = new Date('2026-09-04T12:00:00.000Z');

  it('names days, hours, and minutes still on the clock', () => {
    expect(formatMatchTimeLeft('2026-09-06T12:00:00.000Z', now)).toBe(
      '2 days left',
    );
    expect(formatMatchTimeLeft('2026-09-04T15:00:00.000Z', now)).toBe(
      '3 hours left',
    );
    expect(formatMatchTimeLeft('2026-09-04T12:05:00.000Z', now)).toBe(
      '5 minutes left',
    );
  });

  it('says ended once the window is past', () => {
    expect(formatMatchTimeLeft('2026-09-04T11:00:00.000Z', now)).toBe('Ended');
  });
});
