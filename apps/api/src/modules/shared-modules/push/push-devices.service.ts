import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../database/prisma.tokens.js';
import type { DevicePlatform, PushDeviceDto } from './dto/push-device.dto.js';

@Injectable()
export class PushDevicesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Expo hands out a token per installation, and the same token can follow a
   * device to a different account. Claiming it on register keeps a shared phone
   * from pushing the previous user's reminders.
   */
  async register(
    currentUser: AuthenticatedUser | null | undefined,
    expoPushToken: string,
    platform: DevicePlatform,
  ): Promise<PushDeviceDto> {
    const user = requireUser(currentUser);

    const device = await this.prisma.pushDevice.upsert({
      where: { expoPushToken },
      create: {
        userId: user.id,
        expoPushToken,
        platform,
      },
      update: {
        userId: user.id,
        platform,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });

    return this.toDto(device);
  }

  /** Signing out silences the device without discarding its history. */
  async unregister(
    currentUser: AuthenticatedUser | null | undefined,
    expoPushToken: string,
  ): Promise<{ success: true }> {
    const user = requireUser(currentUser);

    await this.prisma.pushDevice.updateMany({
      where: { expoPushToken, userId: user.id },
      data: { isActive: false },
    });

    return { success: true };
  }

  /**
   * Active devices for habit, reminder, completion, and admin pushes — no
   * group-notification opt-out filter.
   */
  async activeDevicesFor(
    userIds: readonly string[],
  ): Promise<{ userId: string; expoPushToken: string }[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.prisma.pushDevice.findMany({
      where: {
        userId: { in: [...userIds] },
        isActive: true,
      },
      select: { userId: true, expoPushToken: true },
    });
  }

  /**
   * Where group pushes (cheers, nudges, board moves, seats, joins) may go:
   * active devices of members who have not turned group notifications off.
   * A member with no profile yet keeps the default, which is on.
   */
  async groupPushDevicesFor(
    userIds: readonly string[],
  ): Promise<{ userId: string; expoPushToken: string }[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.prisma.pushDevice.findMany({
      where: {
        userId: { in: [...userIds] },
        isActive: true,
        user: {
          OR: [{ profile: { is: null } }, { profile: { is: { groupNotificationsEnabled: true } } }],
        },
      },
      select: { userId: true, expoPushToken: true },
    });
  }

  /** Retires tokens the provider reported as gone for good. */
  async deactivateTokens(expoPushTokens: readonly string[]): Promise<void> {
    if (expoPushTokens.length === 0) {
      return;
    }

    await this.prisma.pushDevice.updateMany({
      where: { expoPushToken: { in: [...expoPushTokens] } },
      data: { isActive: false },
    });
  }

  private toDto(device: {
    expoPushToken: string;
    platform: string;
    isActive: boolean;
  }): PushDeviceDto {
    return {
      expoPushToken: device.expoPushToken,
      platform: device.platform === 'ios' ? 'ios' : 'android',
      isActive: device.isActive,
    };
  }
}
