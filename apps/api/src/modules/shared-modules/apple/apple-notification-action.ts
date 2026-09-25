import { NotificationTypeV2, Subtype } from '@apple/app-store-server-library';

export type AppleNotificationAction =
  | { kind: 'renew' }
  | { kind: 'cancel' }
  | { kind: 'expire' }
  | { kind: 'revoke' }
  | { kind: 'renewal_failure'; inGrace: boolean }
  | { kind: 'ignore' };

export function appleNotificationAction(
  notificationType: string | undefined,
  subtype: string | undefined,
): AppleNotificationAction {
  if (
    notificationType === NotificationTypeV2.SUBSCRIBED ||
    notificationType === NotificationTypeV2.DID_RENEW ||
    notificationType === NotificationTypeV2.OFFER_REDEEMED ||
    notificationType === NotificationTypeV2.RENEWAL_EXTENDED
  ) {
    return { kind: 'renew' };
  }

  if (notificationType === NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS) {
    if (subtype === Subtype.AUTO_RENEW_DISABLED) {
      return { kind: 'cancel' };
    }

    if (subtype === Subtype.AUTO_RENEW_ENABLED) {
      return { kind: 'renew' };
    }
  }

  if (notificationType === NotificationTypeV2.DID_FAIL_TO_RENEW) {
    return {
      kind: 'renewal_failure',
      inGrace: subtype === Subtype.GRACE_PERIOD,
    };
  }

  if (
    notificationType === NotificationTypeV2.EXPIRED ||
    notificationType === NotificationTypeV2.GRACE_PERIOD_EXPIRED
  ) {
    return { kind: 'expire' };
  }

  if (
    notificationType === NotificationTypeV2.REFUND ||
    notificationType === NotificationTypeV2.REVOKE
  ) {
    return { kind: 'revoke' };
  }

  return { kind: 'ignore' };
}
