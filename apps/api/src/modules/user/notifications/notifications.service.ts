import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import type { NotificationInboxDto } from './dto/inbox-notification.dto.js';

const INBOX_PAGE_SIZE = 50;

@Injectable()
export class NotificationsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listInbox(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<NotificationInboxDto> {
    const user = requireUser(currentUser);

    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: INBOX_PAGE_SIZE,
      }),
      this.prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    return {
      notifications: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        isRead: row.readAt !== null,
        createdAt: row.createdAt.toISOString(),
      })),
      unreadCount,
    };
  }

  /**
   * Opening the inbox marks everything the caller can currently see as read.
   * Safe to retry: already-read rows stay read.
   */
  async markAllRead(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<{ unreadCount: number }> {
    const user = requireUser(currentUser);

    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return { unreadCount: 0 };
  }
}
