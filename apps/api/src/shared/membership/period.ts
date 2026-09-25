import type { MembershipInterval } from '@product/contract';

/**
 * Advance a paid-through timestamp by one plan interval.
 * Day-of-month is clamped so 31 Jan + 1 month is 28/29 Feb, not early March.
 */
export function addMembershipInterval(
  from: Date,
  interval: MembershipInterval,
): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();

  if (interval === 'year') {
    return utcClampedDate(year + 1, month, day, from);
  }

  return utcClampedDate(year, month + 1, day, from);
}

export function isEntitlementActive(
  endsAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (endsAt === null) {
    return true;
  }

  return endsAt.getTime() > now.getTime();
}

function utcClampedDate(
  year: number,
  monthIndex: number,
  day: number,
  source: Date,
): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfMonth);

  return new Date(
    Date.UTC(
      year,
      monthIndex,
      clampedDay,
      source.getUTCHours(),
      source.getUTCMinutes(),
      source.getUTCSeconds(),
      source.getUTCMilliseconds(),
    ),
  );
}
