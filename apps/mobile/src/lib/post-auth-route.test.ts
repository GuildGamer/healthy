import { postAuthRoute, routeAfterCategories } from './post-auth-route';

describe('postAuthRoute', () => {
  const complete = {
    emailVerified: true,
    name: 'Ada',
    countryCode: 'KE',
    categoryCount: 1,
  };

  it('sends a complete verified profile into the app', () => {
    expect(postAuthRoute(complete)).toBe('/(tabs)');
  });

  it('asks for country (and name) before categories', () => {
    expect(
      postAuthRoute({ ...complete, countryCode: null }),
    ).toBe('/complete-country');
    expect(postAuthRoute({ ...complete, name: '  ' })).toBe('/complete-country');
  });

  it('asks for health categories once country is set', () => {
    expect(
      postAuthRoute({ ...complete, categoryCount: 0 }),
    ).toBe('/category-selection');
  });

  it('holds an unverified session on email OTP after profile is complete', () => {
    expect(
      postAuthRoute({ ...complete, emailVerified: false }),
    ).toBe('/verify-email');
  });
});

describe('routeAfterCategories', () => {
  it('skips OTP when the provider already verified email', () => {
    expect(routeAfterCategories(true)).toBe('/(tabs)');
    expect(routeAfterCategories(false)).toBe('/verify-email');
  });
});
