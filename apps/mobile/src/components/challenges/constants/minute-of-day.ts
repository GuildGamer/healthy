export type DayPeriod = 'am' | 'pm';

export type ClockTime = {
  hour12: number;
  minute: number;
  period: DayPeriod;
};

export function clockTimeFromMinuteOfDay(minuteOfDay: number): ClockTime {
  const hour24 = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const period: DayPeriod = hour24 < 12 ? 'am' : 'pm';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return { hour12, minute, period };
}

export function minuteOfDayFromClockTime(time: ClockTime): number {
  const hour24 = (time.hour12 % 12) + (time.period === 'pm' ? 12 : 0);
  return hour24 * 60 + time.minute;
}
