import {
  hasDeferredOnboarding,
  postAuthRoute,
  routeAfterCategories,
} from './post-auth-route';

describe('postAuthRoute', () => {
  const complete = {
    emailVerified: true,
    name: 'Ada',
    countryCode: 'KE',
    categoryCount: 1,
    hasPendingInvite: false,
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

  it('skips country, categories, and verify when an invite is pending', () => {
    expect(
      postAuthRoute({
        ...complete,
        countryCode: null,
        categoryCount: 0,
        emailVerified: false,
        hasPendingInvite: true,
      }),
    ).toBe('/(tabs)');
  });

  it('still requires a name before an invite can proceed', () => {
    expect(
      postAuthRoute({
        ...complete,
        name: '  ',
        hasPendingInvite: true,
      }),
    ).toBe('/complete-country');
  });
});

describe('routeAfterCategories', () => {
  it('skips OTP when the provider already verified email', () => {
    expect(routeAfterCategories(true)).toBe('/(tabs)');
    expect(routeAfterCategories(false)).toBe('/verify-email');
  });
});

describe('hasDeferredOnboarding', () => {
  it('detects incomplete invitee profiles', () => {
    expect(
      hasDeferredOnboarding({
        emailVerified: true,
        name: 'Ada',
        countryCode: null,
        categoryCount: 0,
      }),
    ).toBe(true);
  });
});
