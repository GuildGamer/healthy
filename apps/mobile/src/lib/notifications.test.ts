import { formatReminderMinute } from './notifications';

const EIGHT_AM = 8 * 60;
const SEVEN_PM = 19 * 60;

describe('formatReminderMinute', () => {
  it.each([
    [0, '12:00 am'],
    [EIGHT_AM, '8:00 am'],
    [12 * 60, '12:00 pm'],
    [SEVEN_PM + 30, '7:30 pm'],
    [1439, '11:59 pm'],
  ])('formats %p as %p', (minute, expected) => {
    expect(formatReminderMinute(minute)).toBe(expected);
  });
});
