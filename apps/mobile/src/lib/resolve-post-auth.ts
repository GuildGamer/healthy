import { apiClient } from './api';
import { getSessionData, isEmailVerified, waitForSession } from './auth-client';
import { claimDeferredInviteToken, isMatchInviteToken } from './deferred-invite';
import { peekPendingMatchToken, takePendingMatchToken } from './pending-match-token';
import { postAuthRoute, type PostAuthHref } from './post-auth-route';
import { hasAnsweredRemindersIntro } from './reminders-intro';

/**
 * Load session + `/me` and pick the next onboarding / app route.
 * Call after email login, Google OAuth, or cold launch with a cookie.
 *
 * Always attempts deferred-invite claim first (fail-soft) so Store installs
 * that land on onboarding still keep the Match token in SecureStore.
 */
export async function resolvePostAuthHref(): Promise<PostAuthHref | null> {
  await claimDeferredInviteToken();

  const hasSession = await waitForSession();
  if (!hasSession) {
    return null;
  }

  const session = await getSessionData();
  const me = await apiClient.me();
  const pendingToken = await peekPendingMatchToken();
  const hasPendingInvite = isMatchInviteToken(pendingToken);
  const remindersAsked = await hasAnsweredRemindersIntro(me.reminderEnabled);

  const route = postAuthRoute({
    emailVerified: isEmailVerified(session),
    name: me.name ?? session?.user.name,
    countryCode: me.countryCode,
    categoryCount: me.categories.length,
    hasPendingInvite,
    remindersAsked,
  });

  if (route !== '/(tabs)') {
    return route;
  }

  if (pendingToken) {
    const token = await takePendingMatchToken();
    if (token) {
      return `/match/${token}`;
    }
  }

  return route;
}
