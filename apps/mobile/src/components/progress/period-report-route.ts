export type ReportPeriod = 'week' | 'month' | 'year';

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function reportPeriodFromParam(value: string | string[] | undefined): ReportPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'month' || raw === 'year') {
    return raw;
  }
  return 'week';
}

/** The closed day a recap email named. Absent means the member's today. */
export function onDayFromParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && DAY_KEY_PATTERN.test(raw)) {
    return raw;
  }
  return undefined;
}

/** Query string for `/share/report`. */
export function reportShareHref(input: {
  period: ReportPeriod;
  onDay?: string;
}): string {
  const parts = [`period=${encodeURIComponent(input.period)}`];
  if (input.onDay) {
    parts.push(`on=${encodeURIComponent(input.onDay)}`);
  }
  return `/share/report?${parts.join('&')}`;
}
