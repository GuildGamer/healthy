import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type {
  SendAdminNotificationInput,
  SendAdminNotificationOutput,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdminPermission,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import type { Mailer } from '../../shared-modules/mail/mailer.js';
import { MAILER } from '../../shared-modules/mail/mail.tokens.js';
import type { PushMessage, PushSender } from '../../shared-modules/push/push-sender.js';
import { PUSH_SENDER } from '../../shared-modules/push/push-sender.js';
import { PushDevicesService } from '../../shared-modules/push/push-devices.service.js';

type AudienceMember = {
  id: string;
  email: string;
};

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly pushDevices: PushDevicesService,
  ) {}

  async send(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: SendAdminNotificationInput,
  ): Promise<SendAdminNotificationOutput> {
    const admin = requireAdminPermission(currentAdmin, 'support');

    const replayed = await this.findReplay(input.idempotencyKey);
    if (replayed) {
      return { ...replayed, replayed: true };
    }

    if (input.destination === 'challenge' && input.challengeId) {
      const challenge = await this.prisma.challenge.findUnique({
        where: { id: input.challengeId },
        select: { id: true },
      });
      if (!challenge) {
        throw new ORPCError('NOT_FOUND', { message: 'Challenge not found' });
      }
    }

    const audience = await this.resolveAudience(input);
    const summary: SendAdminNotificationOutput = {
      audienceCount: audience.length,
      pushSentCount: 0,
      emailSentCount: 0,
      inboxWrittenCount: 0,
      skippedNoDeviceCount: 0,
      replayed: false,
    };

    if (audience.length === 0) {
      await this.recordAudit(admin.id, input, summary);
      return summary;
    }

    if (input.sendInbox) {
      summary.inboxWrittenCount = await this.writeInbox(audience, input);
    }

    if (input.sendPush) {
      const pushResult = await this.sendPush(audience, input);
      summary.pushSentCount = pushResult.sentCount;
      summary.skippedNoDeviceCount = pushResult.skippedNoDeviceCount;
    }

    if (input.sendEmail) {
      summary.emailSentCount = await this.sendEmail(audience, input);
    }

    await this.recordAudit(admin.id, input, summary);
    return summary;
  }

  private async findReplay(
    idempotencyKey: string,
  ): Promise<Omit<SendAdminNotificationOutput, 'replayed'> | null> {
    const events = await this.prisma.adminAuditEvent.findMany({
      where: { action: 'notification_broadcast' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { payload: true },
    });

    for (const event of events) {
      const payload = event.payload;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        continue;
      }

      const record = payload as Record<string, unknown>;
      if (record.idempotencyKey !== idempotencyKey) {
        continue;
      }

      const result = record.result;
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        continue;
      }

      const summary = result as Record<string, unknown>;
      return {
        audienceCount: numberOrZero(summary.audienceCount),
        pushSentCount: numberOrZero(summary.pushSentCount),
        emailSentCount: numberOrZero(summary.emailSentCount),
        inboxWrittenCount: numberOrZero(summary.inboxWrittenCount),
        skippedNoDeviceCount: numberOrZero(summary.skippedNoDeviceCount),
      };
    }

    return null;
  }

  private async resolveAudience(
    input: SendAdminNotificationInput,
  ): Promise<AudienceMember[]> {
    if (input.audience === 'member') {
      const member = await this.prisma.user.findUnique({
        where: { id: input.memberUserId },
        select: { id: true, email: true },
      });

      if (!member) {
        throw new ORPCError('NOT_FOUND', { message: 'Member not found' });
      }

      return [member];
    }

    return this.prisma.user.findMany({
      where: { profile: { reminderEnabled: true } },
      select: { id: true, email: true },
    });
  }

  private async writeInbox(
    audience: readonly AudienceMember[],
    input: SendAdminNotificationInput,
  ): Promise<number> {
    const result = await this.prisma.notification.createMany({
      data: audience.map((member) => ({
        userId: member.id,
        kind: 'reminder' as const,
        title: input.title,
        body: input.body,
        idempotencyKey: `admin_broadcast:${input.idempotencyKey}:${member.id}`,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  private async sendPush(
    audience: readonly AudienceMember[],
    input: SendAdminNotificationInput,
  ): Promise<{ sentCount: number; skippedNoDeviceCount: number }> {
    const devices = await this.prisma.pushDevice.findMany({
      where: {
        userId: { in: audience.map((member) => member.id) },
        isActive: true,
      },
      select: { userId: true, expoPushToken: true },
    });

    const usersWithDevice = new Set(devices.map((device) => device.userId));
    const skippedNoDeviceCount = audience.filter(
      (member) => !usersWithDevice.has(member.id),
    ).length;

    if (devices.length === 0) {
      return { sentCount: 0, skippedNoDeviceCount };
    }

    const data = this.pushData(input);
    const messages: PushMessage[] = devices.map((device) => ({
      expoPushToken: device.expoPushToken,
      title: input.title,
      body: input.body,
      data,
    }));

    const result = await this.pushSender.send(messages);
    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    return { sentCount: result.sentCount, skippedNoDeviceCount };
  }

  private pushData(input: SendAdminNotificationInput): Record<string, string> {
    if (input.destination === 'challenges') {
      return { destination: 'challenges' };
    }

    if (input.destination === 'challenge' && input.challengeId) {
      return {
        destination: 'challenge',
        challengeId: input.challengeId,
      };
    }

    return { destination: 'today' };
  }

  private async sendEmail(
    audience: readonly AudienceMember[],
    input: SendAdminNotificationInput,
  ): Promise<number> {
    let sentCount = 0;

    for (const member of audience) {
      try {
        await this.mailer.sendMessage({
          to: member.email,
          subject: input.title,
          text: input.body,
        });
        sentCount += 1;
      } catch (error) {
        this.logger.error(
          `Admin broadcast email failed for ${member.id}`,
          error,
        );
      }
    }

    return sentCount;
  }

  private async recordAudit(
    adminUserId: string,
    input: SendAdminNotificationInput,
    summary: SendAdminNotificationOutput,
  ): Promise<void> {
    await this.prisma.adminAuditEvent.create({
      data: {
        adminUserId,
        action: 'notification_broadcast',
        targetMemberUserId:
          input.audience === 'member' ? input.memberUserId : null,
        reason: input.title,
        payload: {
          idempotencyKey: input.idempotencyKey,
          title: input.title,
          body: input.body,
          sendPush: input.sendPush,
          sendEmail: input.sendEmail,
          sendInbox: input.sendInbox,
          audience: input.audience,
          destination: input.destination,
          challengeId: input.challengeId ?? null,
          result: {
            audienceCount: summary.audienceCount,
            pushSentCount: summary.pushSentCount,
            emailSentCount: summary.emailSentCount,
            inboxWrittenCount: summary.inboxWrittenCount,
            skippedNoDeviceCount: summary.skippedNoDeviceCount,
          },
        },
      },
    });
  }
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
