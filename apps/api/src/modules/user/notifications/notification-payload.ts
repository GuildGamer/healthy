import {
  notificationPayloadSchema,
  type NotificationPayload,
} from '@product/contract';

/** Fail-soft parse of stored inbox / push destination data. */
export function parseNotificationPayload(
  value: unknown,
): NotificationPayload | null {
  if (value == null) {
    return null;
  }

  const parsed = notificationPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
