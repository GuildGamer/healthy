import { hasDeferredOnboarding, postAuthRoute } from './post-auth-route';

describe('postAuthRoute', () => {
  const complete = {
    emailVerified: true,
    name: 'Ada',
    countryCode: 'KE',
    categoryCount: 1,
    hasPendingInvite: false,
    remindersAsked: true,
  };

  it('sends a complete verified profile into the app', () => {
    expect(postAuthRoute(complete)).toBe('/(tabs)');
  });

  it('asks for name and country once verified, before categories', () => {
    expect(postAuthRoute({ ...complete, countryCode: null })).toBe('/complete-country');
    expect(postAuthRoute({ ...complete, name: '  ' })).toBe('/complete-country');
  });

  it('asks for health categories once country is set', () => {
    expect(postAuthRoute({ ...complete, categoryCount: 0 })).toBe('/category-selection');
  });

  it('verifies an email sign-up first, before the profile steps', () => {
    expect(postAuthRoute({ ...complete, emailVerified: false })).toBe('/verify-email');
    expect(
      postAuthRoute({
        ...complete,
        emailVerified: false,
        name: '',
        countryCode: null,
        categoryCount: 0,
      }),
    ).toBe('/verify-email');
  });

  it('asks about reminders once, as the last step before the app', () => {
    expect(postAuthRoute({ ...complete, remindersAsked: false })).toBe('/reminders-intro');
    expect(postAuthRoute({ ...complete, emailVerified: false, remindersAsked: false })).toBe(
      '/verify-email',
    );
  });

  it('skips country, categories, and verify when an invite is pending', () => {
    expect(
      postAuthRoute({
        ...complete,
        countryCode: null,
        categoryCount: 0,
        emailVerified: false,
        hasPendingInvite: true,
        remindersAsked: false,
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
