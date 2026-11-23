/**
 * Maps a quiet-recap `/open` link onto the day deck (`/(tabs)`).
 *
 * `https://beatset.tech/open` is the mail CTA. `healthy://open` is the
 * fallback the website fires when the universal link stays in the browser.
 */

const CANONICAL_HOST = 'beatset.tech';
const APP_SCHEME = 'healthy:';
const OPEN_PATH = '/open';

const HOSTS = new Set([
  CANONICAL_HOST,
  'www.beatset.tech',
  'www.gethealthyapp.com',
  'gethealthyapp.com',
]);

export function openHrefFromUrl(value: string): '/(tabs)' | null {
  const url = openUrl(value.trim());
  if (!url) {
    return null;
  }

  return '/(tabs)';
}

function openUrl(value: string): URL | null {
  if (value === 'open' || value === '/open') {
    return openUrlFromPath('/open');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol === 'https:' || url.protocol === 'http:') {
    if (!HOSTS.has(url.hostname) || normalizePath(url.pathname) !== OPEN_PATH) {
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

  return openUrlFromPath(path);
}

function openUrlFromPath(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value, `https://${CANONICAL_HOST}`);
  } catch {
    return null;
  }

  if (normalizePath(url.pathname) !== OPEN_PATH) {
    return null;
  }

  return url;
}

function schemePath(url: URL): string | null {
  if (url.hostname === 'open' && (url.pathname === '/' || url.pathname === '')) {
    return OPEN_PATH;
  }

  const path = normalizePath(`${url.hostname ? `/${url.hostname}` : ''}${url.pathname}`);
  if (path !== OPEN_PATH) {
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
