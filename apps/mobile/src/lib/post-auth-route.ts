/**
 * After sign-in / launch, finish profile gaps before the main app.
 * Order: email OTP (email sign-ups, while the code is fresh) → name and
 * country → the one-time reminders ask.
 *
 * Challenge-first (distribution): a pending invite only requires a name so the
 * recipient can accept and act; country / verify resume afterward.
 */
export type PostAuthState = {
  emailVerified: boolean;
  name: string | null | undefined;
  countryCode: string | null | undefined;
  /** SecureStore still holds a match invite token. */
  hasPendingInvite: boolean;
  /** Reminders are on, the phone already answered, or this person said Not now. */
  remindersAsked: boolean;
};

export type PostAuthHref =
  | '/complete-country'
  | '/category-selection'
  | '/verify-email'
  | '/reminders-intro'
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

  if (!state.emailVerified) {
    return '/verify-email';
  }

  if (!hasName || !state.countryCode) {
    return '/complete-country';
  }

  if (!state.remindersAsked) {
    return '/reminders-intro';
  }

  return '/(tabs)';
}

/** True when the user still owes profile steps deferred for an invite. */
export function hasDeferredOnboarding(
  state: Omit<PostAuthState, 'hasPendingInvite' | 'remindersAsked'>,
): boolean {
  const hasName = Boolean(state.name?.trim());
  if (!hasName || !state.countryCode) {
    return true;
  }

  return !state.emailVerified;
}
