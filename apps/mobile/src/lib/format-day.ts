/** `3 Nov`: a date close enough that the year goes without saying. */
export function formatDayMonth(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** `3 Nov 2027`. */
export function formatDayMonthYear(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
