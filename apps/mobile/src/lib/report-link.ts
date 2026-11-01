/**
 * Maps a recap email link onto `app/progress/report`.
 *
 * Shared links are `https://www.gethealthyapp.com/progress/report`. The apex
 * host still 308s to www, and mail already sent used `/app/progress/report`.
 * `healthy://` is the fallback the website fires when the universal link
 * stays in the browser.
 */

const CANONICAL_HOST = 'www.gethealthyapp.com';
const APEX_HOST = 'gethealthyapp.com';
const APP_SCHEME = 'healthy:';
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PERIODS = new Set(['week', 'month', 'year']);
const REPORT_PATHS = new Set(['/progress/report', '/app/progress/report']);

const HOSTS = new Set([CANONICAL_HOST, APEX_HOST]);

type ReportPeriod = 'week' | 'month' | 'year';

/**
 * Last day of the window that just closed, in the device's local calendar.
 * Used when an old recap link names a period but not the day.
 */
export function closedWindowEndDay(period: ReportPeriod, now: Date = new Date()): string {
  if (period === 'month') {
    return localDayKey(new Date(now.getFullYear(), now.getMonth(), 0));
  }

  if (period === 'year') {
    return `${now.getFullYear() - 1}-12-31`;
  }

  const weekday = now.getDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  return localDayKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1));
}

export function reportHrefFromUrl(
  value: string,
  now: Date = new Date(),
): `/progress/report${string}` | null {
  const url = reportUrl(value.trim());
  if (!url) {
    return null;
  }

  const params = new URLSearchParams();
  const period = url.searchParams.get('period');
  if (period && PERIODS.has(period)) {
    params.set('period', period);
  }

  const onDay = url.searchParams.get('on');
  if (onDay && DAY_KEY_PATTERN.test(onDay)) {
    params.set('on', onDay);
  } else if (period === 'week' || period === 'month' || period === 'year') {
    params.set('on', closedWindowEndDay(period, now));
  }

  const query = params.toString();
  return query ? `/progress/report?${query}` : '/progress/report';
}

function localDayKey(at: Date): string {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function reportUrl(value: string): URL | null {
  if (value.startsWith('/')) {
    return reportUrlFromPath(value);
  }

  // Expo's extractExpoPathFromURL drops the leading slash.
  if (value.startsWith('progress/report') || value.startsWith('app/progress/report')) {
    return reportUrlFromPath(`/${value}`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol === 'https:' || url.protocol === 'http:') {
    if (!HOSTS.has(url.hostname) || !REPORT_PATHS.has(normalizePath(url.pathname))) {
      return null;
    }

    return url;
  }

  if (url.protocol !== APP_SCHEME) {
    return null;
  }

  const path = schemePath(url);
  if (!path) {
    return null;
  }

  return reportUrlFromPath(`${path}${url.search}`);
}

function reportUrlFromPath(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value, `https://${CANONICAL_HOST}`);
  } catch {
    return null;
  }

  if (!REPORT_PATHS.has(normalizePath(url.pathname))) {
    return null;
  }

  return url;
}

function schemePath(url: URL): string | null {
  if (url.hostname === 'progress' && normalizePath(url.pathname) === '/report') {
    return '/progress/report';
  }

  const path = normalizePath(`${url.hostname ? `/${url.hostname}` : ''}${url.pathname}`);
  if (!REPORT_PATHS.has(path)) {
    return null;
  }

  return path;
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
