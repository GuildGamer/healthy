import { membershipStoreName, refusalFrom, refusalLink, refusalMessage } from './account-deletion';

const appleRefusal = {
  reason: 'subscription_renewing' as const,
  store: 'apple' as const,
  renewsAt: '2026-11-03T09:00:00.000Z',
};

describe('account deletion refusal', () => {
  it('reads the refusal from an API error', () => {
    expect(refusalFrom({ code: 'CONFLICT', data: appleRefusal })).toEqual(appleRefusal);
  });

  it('treats any other failure as a plain failure', () => {
    expect(refusalFrom(new Error('Network request failed'))).toBeNull();
    expect(refusalFrom({ data: { reason: 'something_else' } })).toBeNull();
    expect(refusalFrom(null)).toBeNull();
  });

  it('says when the plan renews and where to cancel it', () => {
    expect(refusalMessage(appleRefusal)).toBe(
      'Your membership renews on 3 Nov. Cancel it in the App Store first, then delete your account.',
    );
    expect(refusalLink({ ...appleRefusal, store: 'google' })?.label).toBe('Manage in Google Play');
  });

  it('has no store link for a web plan', () => {
    expect(refusalLink({ ...appleRefusal, store: 'web' })).toBeNull();
    expect(refusalMessage({ ...appleRefusal, store: 'web' })).toBe(
      'Your membership renews on 3 Nov. Cancel it first, then delete your account.',
    );
  });

  it('names the store of the phone in the warning', () => {
    expect(membershipStoreName('ios')).toBe('the App Store');
    expect(membershipStoreName('android')).toBe('Google Play');
  });
});
