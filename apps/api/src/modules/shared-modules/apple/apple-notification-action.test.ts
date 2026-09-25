import { NotificationTypeV2, Subtype } from '@apple/app-store-server-library';
import { describe, expect, it } from 'vitest';
import { appleNotificationAction } from './apple-notification-action.js';

describe('appleNotificationAction', () => {
  it('maps purchase and renewal notifications to renew', () => {
    expect(appleNotificationAction(NotificationTypeV2.SUBSCRIBED, Subtype.INITIAL_BUY)).toEqual({
      kind: 'renew',
    });
    expect(appleNotificationAction(NotificationTypeV2.DID_RENEW, undefined)).toEqual({
      kind: 'renew',
    });
    expect(
      appleNotificationAction(
        NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS,
        Subtype.AUTO_RENEW_ENABLED,
      ),
    ).toEqual({ kind: 'renew' });
  });

  it('maps auto-renew off to cancel', () => {
    expect(
      appleNotificationAction(
        NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS,
        Subtype.AUTO_RENEW_DISABLED,
      ),
    ).toEqual({ kind: 'cancel' });
  });

  it('maps billing failure and grace', () => {
    expect(
      appleNotificationAction(NotificationTypeV2.DID_FAIL_TO_RENEW, Subtype.GRACE_PERIOD),
    ).toEqual({ kind: 'renewal_failure', inGrace: true });
    expect(
      appleNotificationAction(NotificationTypeV2.DID_FAIL_TO_RENEW, undefined),
    ).toEqual({ kind: 'renewal_failure', inGrace: false });
  });

  it('maps expire and revoke', () => {
    expect(appleNotificationAction(NotificationTypeV2.EXPIRED, Subtype.VOLUNTARY)).toEqual({
      kind: 'expire',
    });
    expect(appleNotificationAction(NotificationTypeV2.REFUND, undefined)).toEqual({
      kind: 'revoke',
    });
  });

  it('ignores notifications that do not change entitlement', () => {
    expect(appleNotificationAction(NotificationTypeV2.TEST, undefined)).toEqual({
      kind: 'ignore',
    });
    expect(appleNotificationAction(NotificationTypeV2.PRICE_INCREASE, undefined)).toEqual({
      kind: 'ignore',
    });
  });
});
