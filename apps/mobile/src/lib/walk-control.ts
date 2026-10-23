/**
 * Lock-screen Pause / Resume opens the app with these URLs. The active walk
 * recorder registers itself so deep-link handling can forward the tap without
 * Expo Router treating it as a page.
 */

export type WalkControlAction = 'pause' | 'resume';

type WalkControlHandler = {
  pause: () => void;
  resume: () => void;
};

let handler: WalkControlHandler | null = null;

export function setWalkControlHandler(next: WalkControlHandler | null): void {
  handler = next;
}

/** Paths the Live Activity Pause / Resume links open (scheme is `healthy`). */
export const WALK_CONTROL_PAUSE_URL = 'healthy://walk-control/pause';
export const WALK_CONTROL_RESUME_URL = 'healthy://walk-control/resume';

/**
 * Reads a Pause / Resume deep link. Accepts the full scheme URL from the Live
 * Activity Link, and the path-only forms Expo Router may pass into
 * `+native-intent`.
 */
export function walkControlActionFromUrl(url: string): WalkControlAction | null {
  const route = walkControlRoute(url);
  if (route === 'walk-control/pause') {
    return 'pause';
  }

  if (route === 'walk-control/resume') {
    return 'resume';
  }

  return null;
}

function walkControlRoute(value: string): string {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'healthy:') {
      return [parsed.hostname, parsed.pathname.replace(/^\//, '')]
        .filter((part) => part.length > 0)
        .join('/');
    }
  } catch {
    // Path-only strings are not absolute URLs.
  }

  return trimmed.replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Forwards a deep link to the active recorder, if any. */
export function dispatchWalkControlUrl(url: string): boolean {
  const action = walkControlActionFromUrl(url);
  if (!action || !handler) {
    return false;
  }

  if (action === 'pause') {
    handler.pause();
  } else {
    handler.resume();
  }

  return true;
}

/** True when the URL is a walk control deep link, even with no recorder yet. */
export function isWalkControlUrl(url: string): boolean {
  return walkControlActionFromUrl(url) !== null;
}
