import {
  clockTimeFromMinuteOfDay,
  minuteOfDayFromClockTime,
} from './minute-of-day';

describe('minute-of-day', () => {
  it.each([
    [0, { hour12: 12, minute: 0, period: 'am' }],
    [480, { hour12: 8, minute: 0, period: 'am' }],
    [720, { hour12: 12, minute: 0, period: 'pm' }],
    [1140, { hour12: 7, minute: 0, period: 'pm' }],
    [1439, { hour12: 11, minute: 59, period: 'pm' }],
  ] as const)('round-trips %p', (minuteOfDay, clock) => {
    expect(clockTimeFromMinuteOfDay(minuteOfDay)).toEqual(clock);
    expect(minuteOfDayFromClockTime(clock)).toBe(minuteOfDay);
  });
});
