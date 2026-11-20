/**
 * Maps an invite URL onto `app/match/[token]`.
 *
 * New shares are `https://beatset.tech/match/<token>`. `www.beatset.tech` is
 * accepted if a link arrives that way. The previous site stays accepted so
 * invites already sent still open the app. `healthy://` is only the fallback
 * the website fires from inside a webview.
 */

const CANONICAL_INVITE_HOST = 'beatset.tech';
const APP_SCHEME = 'healthy:';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const INVITE_PATH_PATTERN = /^\/match\/([A-Za-z0-9_-]{8,64})\/?$/;

const INVITE_HOSTS = new Set([
  CANONICAL_INVITE_HOST,
  'www.beatset.tech',
  'www.gethealthyapp.com',
  'gethealthyapp.com',
]);

export function inviteHrefFromUrl(value: string): `/match/${string}` | null {
  const url = parseUrl(value);
  if (!url) {
    return null;
  }

  const token = tokenFromInviteUrl(url);
  if (!token) {
    return null;
  }

  return `/match/${token}`;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

function tokenFromInviteUrl(url: URL): string | null {
  if (url.protocol === 'https:' || url.protocol === 'http:') {
    return tokenFromWebInvite(url);
  }

  if (url.protocol === APP_SCHEME) {
    return tokenFromAppScheme(url);
  }

  return null;
}

function tokenFromWebInvite(url: URL): string | null {
  if (!INVITE_HOSTS.has(url.hostname)) {
    return null;
  }

  return INVITE_PATH_PATTERN.exec(url.pathname)?.[1] ?? null;
}

function tokenFromAppScheme(url: URL): string | null {
  const fromPath = INVITE_PATH_PATTERN.exec(url.pathname)?.[1];
  if (fromPath) {
    return fromPath;
  }

  if (url.hostname !== 'match') {
    return null;
  }

  const token = url.pathname.replace(/^\/+|\/+$/g, '');
  if (!TOKEN_PATTERN.test(token)) {
    return null;
  }

  return token;
}
