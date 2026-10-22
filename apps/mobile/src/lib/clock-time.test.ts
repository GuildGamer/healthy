import { getCalendars } from 'expo-localization';
import { formatClockTime, usesTwentyFourHourClock } from './clock-time';

const { formatClockTime: formatActual, usesTwentyFourHourClock: twentyFourHourActual } =
  jest.requireActual<typeof import('./clock-time')>('./clock-time');

const mockedGetCalendars = jest.mocked(getCalendars);

function phoneClock(uses24hourClock: boolean | null) {
  mockedGetCalendars.mockReturnValue([
    { calendar: null, timeZone: 'UTC', uses24hourClock, firstWeekday: 2 },
  ]);
}

afterEach(() => phoneClock(null));

describe('clock time on the phone', () => {
  it('shows the 24-hour clock when the phone’s switch is on, whatever the locale', () => {
    phoneClock(true);

    expect(twentyFourHourActual()).toBe(true);
    expect(formatActual(new Date(2026, 9, 22, 8, 10))).toBe('08:10');
    expect(formatActual(18 * 60 + 5)).toBe('18:05');
  });

  it('shows the 12-hour clock when the phone’s switch is off', () => {
    phoneClock(false);

    expect(twentyFourHourActual()).toBe(false);
    expect(formatActual(18 * 60 + 5)).toMatch(/^6:05\s?(PM|pm|p\.m\.)$/);
  });

  it('falls back to the locale when the phone does not say', () => {
    phoneClock(null);

    expect(twentyFourHourActual('en-GB')).toBe(true);
    expect(twentyFourHourActual('en-US')).toBe(false);
  });
});

describe('clock time in a pinned locale', () => {
  it('follows a 24-hour locale with two-digit hours, ignoring the phone', () => {
    phoneClock(false);

    expect(formatActual(new Date(2026, 9, 22, 8, 10), 'en-GB')).toBe('08:10');
    expect(formatActual(18 * 60 + 5, 'de-DE')).toBe('18:05');
  });

  it('follows a 12-hour locale with its day period', () => {
    expect(formatActual(new Date(2026, 9, 22, 18, 5), 'en-US')).toMatch(/^6:05\sPM$/);
    expect(formatActual(0, 'en-US')).toMatch(/^12:00\sAM$/);
  });

  it('is pinned to the 24-hour clock across the test suite', () => {
    phoneClock(false);

    expect(formatClockTime(750)).toBe('12:30');
    expect(usesTwentyFourHourClock()).toBe(true);
  });
});
