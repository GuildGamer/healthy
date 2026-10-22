import { getCalendars } from 'expo-localization';

const MINUTES_PER_HOUR = 60;
/** 1 pm, which reads "13" only on a 24-hour clock. */
const AFTERNOON_PROBE = new Date(2000, 0, 1, 13, 0);

/** An instant, or a local wall-clock minute past midnight such as a reminder's. */
export type ClockValue = Date | number;

function toDate(value: ClockValue): Date {
  if (value instanceof Date) {
    return value;
  }

  return new Date(2000, 0, 1, Math.floor(value / MINUTES_PER_HOUR), value % MINUTES_PER_HOUR);
}

/** The locale's own clock, for when the phone does not say which it shows. */
function localeUsesTwentyFourHourClock(locale?: string): boolean {
  const { hourCycle } = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
  if (hourCycle) {
    return hourCycle === 'h23' || hourCycle === 'h24';
  }

  return new Intl.DateTimeFormat(locale, { hour: 'numeric' })
    .format(AFTERNOON_PROBE)
    .includes('13');
}

/**
 * True when the phone shows times on the 24-hour clock: its 24-hour switch on
 * iOS and Android, else the locale's default. A pinned locale skips the phone.
 */
export function usesTwentyFourHourClock(locale?: string): boolean {
  const phoneSetting = locale ? null : (getCalendars()[0]?.uses24hourClock ?? null);
  return phoneSetting ?? localeUsesTwentyFourHourClock(locale);
}

/**
 * "18:05" or "6:05 PM": a time the way the phone's own clock shows it. Pass a
 * locale only to pin the output, as tests do; the app always uses the phone's.
 */
export function formatClockTime(value: ClockValue, locale?: string): string {
  // Engines differ on padding a numeric 24-hour hour, so ask for two digits.
  const isTwentyFourHour = usesTwentyFourHourClock(locale);
  return new Intl.DateTimeFormat(locale, {
    hour: isTwentyFourHour ? '2-digit' : 'numeric',
    minute: '2-digit',
    hourCycle: isTwentyFourHour ? 'h23' : 'h12',
  }).format(toDate(value));
}
