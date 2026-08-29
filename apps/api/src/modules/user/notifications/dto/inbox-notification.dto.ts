import type { NotificationKind } from '@product/db';

export type InboxNotificationDto = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationInboxDto = {
  notifications: InboxNotificationDto[];
  unreadCount: number;
};
