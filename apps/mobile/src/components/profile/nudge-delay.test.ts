import { nudgeDelayLabel, nudgeDelaySummary, nudgeLandingLabel } from './nudge-delay';

describe('nudge delay copy', () => {
  it('labels short waits in minutes and long ones in hours', () => {
    expect(nudgeDelayLabel(15)).toBe('15 min');
    expect(nudgeDelayLabel(60)).toBe('1 hour');
    expect(nudgeDelayLabel(120)).toBe('2 hours');
    expect(nudgeDelayLabel(90)).toBe('90 min');
  });

  it('summarises the chosen wait under the switch', () => {
    expect(nudgeDelaySummary(30)).toBe('After 30 minutes');
    expect(nudgeDelaySummary(60)).toBe('After 1 hour');
    expect(nudgeDelaySummary(120)).toBe('After 2 hours');
  });

  // Jest pins the phone's clock to 24-hour; the app follows the phone's setting.
  it('says when the nudge would land from now', () => {
    const now = new Date(2026, 9, 22, 9, 41);
    expect(nudgeLandingLabel(now, 15)).toBe('At 09:56');
    expect(nudgeLandingLabel(now, 120)).toBe('At 11:41');
  });

  it('wraps past midnight', () => {
    const lateEvening = new Date(2026, 9, 22, 23, 50);
    expect(nudgeLandingLabel(lateEvening, 30)).toBe('At 00:20');
  });
});
