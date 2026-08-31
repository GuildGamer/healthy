/**
 * After sign-in / launch, finish profile gaps before the main app.
 * Order: identity + country → categories → email OTP (if still unverified).
 */
export type PostAuthState = {
  emailVerified: boolean;
  name: string | null | undefined;
  countryCode: string | null | undefined;
  categoryCount: number;
};

export type PostAuthHref =
  | '/complete-country'
  | '/category-selection'
  | '/verify-email'
  | '/(tabs)';

export function postAuthRoute(state: PostAuthState): PostAuthHref {
  const hasName = Boolean(state.name?.trim());
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
