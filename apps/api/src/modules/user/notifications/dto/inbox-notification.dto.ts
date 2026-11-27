import type { NotificationKind } from '@product/db';
import type { NotificationPayload } from '@product/contract';

export type InboxNotificationDto = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  payload: NotificationPayload | null;
};

export type NotificationInboxDto = {
  notifications: InboxNotificationDto[];
  unreadCount: number;
};
