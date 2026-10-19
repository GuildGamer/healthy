/**
 * After sign-in / launch, finish profile gaps before the main app.
 * Order: identity → country → categories → email OTP (if still unverified).
 *
 * Challenge-first (distribution): a pending invite only requires a name so the
 * recipient can accept and act; country / categories / verify resume afterward.
 */
export type PostAuthState = {
  emailVerified: boolean;
  name: string | null | undefined;
  countryCode: string | null | undefined;
  categoryCount: number;
  /** SecureStore still holds a match invite token. */
  hasPendingInvite: boolean;
};

export type PostAuthHref =
  | '/complete-country'
  | '/category-selection'
  | '/verify-email'
  | '/(tabs)'
  | `/match/${string}`;

export function postAuthRoute(state: PostAuthState): PostAuthHref {
  const hasName = Boolean(state.name?.trim());

  if (state.hasPendingInvite) {
    if (!hasName) {
      return '/complete-country';
    }

    return '/(tabs)';
  }

  if (!hasName || !state.countryCode) {
    return '/complete-country';
  }

  if (state.categoryCount < 1) {
    return '/category-selection';
  }

  if (!state.emailVerified) {
    return '/verify-email';
  }

  return '/(tabs)';
}

/** After categories are saved, skip OTP when the provider already verified email. */
export function routeAfterCategories(emailVerified: boolean): '/(tabs)' | '/verify-email' {
  return emailVerified ? '/(tabs)' : '/verify-email';
}

/** True when the user still owes profile steps deferred for an invite. */
export function hasDeferredOnboarding(state: Omit<PostAuthState, 'hasPendingInvite'>): boolean {
  const hasName = Boolean(state.name?.trim());
  if (!hasName || !state.countryCode) {
    return true;
  }

  if (state.categoryCount < 1) {
    return true;
  }

  return !state.emailVerified;
}
