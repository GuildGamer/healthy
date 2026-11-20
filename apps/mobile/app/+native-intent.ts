import { inviteHrefFromUrl } from '@/lib/invite-link';
import { reportHrefFromUrl } from '@/lib/report-link';
import { dispatchWalkControlUrl, isWalkControlUrl } from '@/lib/walk-control';

/**
 * Rewrites OS deep links before Expo Router resolves them.
 *
 * Lock-screen Pause / Resume is not a page — swallow it so the router stays
 * on the walk screen. Invite links map onto `match/[token]`. Recap emails
 * map onto `progress/report`, including the `/app/progress/report` path
 * older mail used.
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

  return reportHrefFromUrl(path) ?? inviteHrefFromUrl(path) ?? path;
}
