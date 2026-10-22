import { inviteHrefFromUrl } from '@/lib/invite-link';

/**
 * An installed app receives the https invite directly. Signed-out recipients
 * still land on `app/match/[token]`, which sends them through onboarding.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return inviteHrefFromUrl(path) ?? path;
}
