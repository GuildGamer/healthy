/** After sign-in or launch, unverified members finish email OTP first. */
export function postAuthRoute(emailVerified: boolean): '/(tabs)' | '/verify-email' {
  return emailVerified ? '/(tabs)' : '/verify-email';
}
