import { inviteHrefFromUrl } from '@/lib/invite-link';
import { dispatchWalkControlUrl, isWalkControlUrl } from '@/lib/walk-control';

/**
 * Rewrites OS deep links before Expo Router resolves them.
 *
 * Lock-screen Pause / Resume is not a page — swallow it so the router stays
 * on the walk screen. Invite https / healthy:// links map onto `match/[token]`.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string | null {
  if (isWalkControlUrl(path)) {
    dispatchWalkControlUrl(path);
    return null;
  }

  return inviteHrefFromUrl(path) ?? path;
}
