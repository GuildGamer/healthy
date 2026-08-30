import { postAuthRoute } from './post-auth-route';

describe('postAuthRoute', () => {
  it('sends a verified session into the app', () => {
    expect(postAuthRoute(true)).toBe('/(tabs)');
  });

  it('holds an unverified session on email OTP', () => {
    expect(postAuthRoute(false)).toBe('/verify-email');
  });
});
