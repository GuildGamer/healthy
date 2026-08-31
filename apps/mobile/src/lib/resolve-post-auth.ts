import { apiClient } from './api';
import { getSessionData, isEmailVerified, waitForSession } from './auth-client';
import { postAuthRoute, type PostAuthHref } from './post-auth-route';

/**
 * Load session + `/me` and pick the next onboarding / app route.
 * Call after email login, Google OAuth, or cold launch with a cookie.
 */
export async function resolvePostAuthHref(): Promise<PostAuthHref | null> {
  const hasSession = await waitForSession();
  if (!hasSession) {
    return null;
  }

  const session = await getSessionData();
  const me = await apiClient.me();

  return postAuthRoute({
    emailVerified: isEmailVerified(session),
    name: me.name ?? session?.user.name,
    countryCode: me.countryCode,
    categoryCount: me.categories.length,
  });
}
