import { hasDeferredOnboarding, postAuthRoute } from './post-auth-route';

describe('postAuthRoute', () => {
  const complete = {
    emailVerified: true,
    name: 'Ada',
    countryCode: 'KE',
    hasPendingInvite: false,
    remindersAsked: true,
  };

  it('sends a complete verified profile into the app', () => {
    expect(postAuthRoute(complete)).toBe('/(tabs)');
  });

  it('asks for name and country once verified', () => {
    expect(postAuthRoute({ ...complete, countryCode: null })).toBe('/complete-country');
    expect(postAuthRoute({ ...complete, name: '  ' })).toBe('/complete-country');
  });

  it('does not gate on health categories', () => {
    expect(postAuthRoute(complete)).toBe('/(tabs)');
  });

  it('verifies an email sign-up first, before the profile steps', () => {
    expect(postAuthRoute({ ...complete, emailVerified: false })).toBe('/verify-email');
    expect(
      postAuthRoute({
        ...complete,
        emailVerified: false,
        name: '',
        countryCode: null,
      }),
    ).toBe('/verify-email');
  });

  it('asks about reminders once, as the last step before the app', () => {
    expect(postAuthRoute({ ...complete, remindersAsked: false })).toBe('/reminders-intro');
    expect(postAuthRoute({ ...complete, emailVerified: false, remindersAsked: false })).toBe(
      '/verify-email',
    );
  });

  it('skips country and verify when an invite is pending', () => {
    expect(
      postAuthRoute({
        ...complete,
        countryCode: null,
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
      }),
    ).toBe(true);
  });

  it('does not treat missing categories as deferred', () => {
    expect(
      hasDeferredOnboarding({
        emailVerified: true,
        name: 'Ada',
        countryCode: 'KE',
      }),
    ).toBe(false);
  });
});
