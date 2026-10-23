import { sleepDurationLabel, sleepDurationMinutes, sleepWindow } from './sleep-window';

describe('sleepWindow', () => {
  it('puts a night that crosses midnight on yesterday and today', () => {
    const now = new Date(2026, 9, 23, 10, 0, 0);
    const window = sleepWindow(23 * 60, 7 * 60, now);

    expect(new Date(window.wentToBedAt)).toEqual(new Date(2026, 9, 22, 23, 0, 0));
    expect(new Date(window.wokeUpAt)).toEqual(new Date(2026, 9, 23, 7, 0, 0));
  });

  it('uses yesterday’s wake when that clock time has not happened yet today', () => {
    const now = new Date(2026, 9, 23, 5, 0, 0);
    const window = sleepWindow(23 * 60, 7 * 60, now);

    expect(new Date(window.wentToBedAt)).toEqual(new Date(2026, 9, 21, 23, 0, 0));
    expect(new Date(window.wokeUpAt)).toEqual(new Date(2026, 9, 22, 7, 0, 0));
  });

  it('keeps bedtime and wake on the same day when bedtime is earlier', () => {
    const now = new Date(2026, 9, 23, 18, 0, 0);
    const window = sleepWindow(13 * 60, 15 * 60, now);

    expect(new Date(window.wentToBedAt)).toEqual(new Date(2026, 9, 23, 13, 0, 0));
    expect(new Date(window.wokeUpAt)).toEqual(new Date(2026, 9, 23, 15, 0, 0));
  });
});

describe('sleepDurationLabel', () => {
  it('formats hours and minutes', () => {
    expect(sleepDurationLabel(445)).toBe('7h 25m');
    expect(sleepDurationLabel(480)).toBe('8h');
    expect(sleepDurationLabel(45)).toBe('45m');
  });
});

describe('sleepDurationMinutes', () => {
  it('counts whole minutes between the two instants', () => {
    expect(
      sleepDurationMinutes({
        wentToBedAt: new Date(2026, 9, 22, 23, 0, 0).toISOString(),
        wokeUpAt: new Date(2026, 9, 23, 7, 25, 0).toISOString(),
      }),
    ).toBe(505);
  });
});
