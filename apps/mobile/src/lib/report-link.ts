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

export function reportHrefFromUrl(value: string): `/progress/report${string}` | null {
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
  }

  const query = params.toString();
  return query ? `/progress/report?${query}` : '/progress/report';
}

function reportUrl(value: string): URL | null {
  if (value.startsWith('/')) {
    return reportUrlFromPath(value);
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
