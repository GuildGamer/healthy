import { describe, expect, it, vi } from 'vitest';
import { EngagementDeliveryService } from './engagement-delivery.service.js';

function createPrisma() {
  return {
    engagementDelivery: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function createPushSender() {
  return {
    send: vi.fn().mockResolvedValue({ sentCount: 2, rejectedTokens: [] }),
  };
}

function createPushDevices(options?: {
  active?: Array<{ userId: string; expoPushToken: string }>;
  group?: Array<{ userId: string; expoPushToken: string }>;
}) {
  return {
    activeDevicesFor: vi.fn().mockResolvedValue(options?.active ?? []),
    groupPushDevicesFor: vi.fn().mockResolvedValue(options?.group ?? []),
    deactivateTokens: vi.fn().mockResolvedValue(undefined),
  };
}

function createHoldout(
  assignments: Map<string, { experimentKey: string; variantKey: string }> = new Map(),
) {
  return {
    assignmentsFor: vi.fn().mockResolvedValue(assignments),
  };
}

describe('EngagementDeliveryService', () => {
  it('injects engagementDeliveryId and writes a delivery row after send', async () => {
    const prisma = createPrisma();
    const pushSender = createPushSender();
    const pushDevices = createPushDevices({
      active: [
        { userId: 'u1', expoPushToken: 'token-a' },
        { userId: 'u1', expoPushToken: 'token-b' },
        { userId: 'u2', expoPushToken: 'token-c' },
      ],
    });
    const holdout = createHoldout(
      new Map([
        ['u1', { experimentKey: 'engagement_holdout_v1', variantKey: 'treatment' }],
        ['u2', { experimentKey: 'engagement_holdout_v1', variantKey: 'holdout' }],
      ]),
    );
    const service = new EngagementDeliveryService(
      prisma as never,
      pushSender as never,
      pushDevices as never,
      holdout as never,
    );

    const result = await service.send({
      source: 'habit_slot',
      audience: 'all_devices',
      pushes: [
        {
          userId: 'u1',
          title: 'Do one now',
          body: 'Got a few minutes?',
          data: { destination: 'today' },
        },
        {
          userId: 'u2',
          title: 'Do one now',
          body: 'Got a few minutes?',
          data: { destination: 'today' },
        },
      ],
    });

    expect(pushSender.send).toHaveBeenCalled();
    const messages = pushSender.send.mock.calls[0]?.[0] as Array<{
      data: Record<string, string>;
      expoPushToken: string;
      threadId?: string;
      channelId?: string;
    }>;
    expect(messages).toHaveLength(3);
    expect(messages[0]?.data.engagementDeliveryId).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
    expect(messages[0]?.data.destination).toBe('today');
    expect(messages[0]?.threadId).toBe('habits');
    expect(messages[0]?.channelId).toBe('habits');
    expect(prisma.engagementDelivery.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'u1',
            source: 'habit_slot',
            templateKey: 'habit_slot',
            copyVersion: 'v1',
            experimentKey: 'engagement_holdout_v1',
            variantKey: 'treatment',
          }),
          expect.objectContaining({
            userId: 'u2',
            variantKey: 'holdout',
          }),
        ]),
        skipDuplicates: true,
      }),
    );
    expect(result.deliveryIdsByUserId.u1).toBeTruthy();
    expect(result.deliveryIdsByUserId.u2).toBeTruthy();
    expect(result.messageCount).toBe(3);
  });

  it('lists users without a device and does not call the provider when nobody has one', async () => {
    const prisma = createPrisma();
    const pushSender = createPushSender();
    const pushDevices = createPushDevices({ active: [] });
    const service = new EngagementDeliveryService(
      prisma as never,
      pushSender as never,
      pushDevices as never,
      createHoldout() as never,
    );

    const result = await service.send({
      source: 'admin_broadcast',
      audience: 'all_devices',
      pushes: [
        {
          userId: 'u1',
          title: 'Hello',
          body: 'World',
          data: { destination: 'today' },
        },
      ],
    });

    expect(pushSender.send).not.toHaveBeenCalled();
    expect(prisma.engagementDelivery.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      sentCount: 0,
      messageCount: 0,
      usersWithDevice: [],
      usersWithoutDevice: ['u1'],
      deliveryIdsByUserId: {},
    });
  });

  it('uses groupPushDevicesFor for group_opt_in audience', async () => {
    const pushSender = createPushSender();
    pushSender.send.mockResolvedValue({ sentCount: 1, rejectedTokens: [] });
    const pushDevices = createPushDevices({
      group: [{ userId: 'u1', expoPushToken: 'token-g' }],
    });
    const service = new EngagementDeliveryService(
      createPrisma() as never,
      pushSender as never,
      pushDevices as never,
      createHoldout() as never,
    );

    await service.send({
      source: 'invite_accepted',
      audience: 'group_opt_in',
      pushes: [
        {
          userId: 'u1',
          title: 'See who joined',
          body: 'Bee accepted.',
          data: { matchId: 'm1' },
        },
      ],
    });

    expect(pushDevices.groupPushDevicesFor).toHaveBeenCalledWith(['u1']);
    expect(pushDevices.activeDevicesFor).not.toHaveBeenCalled();
    const messages = pushSender.send.mock.calls[0]?.[0] as Array<{
      threadId?: string;
      channelId?: string;
    }>;
    expect(messages[0]?.threadId).toBeUndefined();
    expect(messages[0]?.channelId).toBeUndefined();
  });

  it('deactivates rejected tokens', async () => {
    const pushSender = createPushSender();
    pushSender.send.mockResolvedValue({
      sentCount: 0,
      rejectedTokens: ['bad-token'],
    });
    const pushDevices = createPushDevices({
      active: [{ userId: 'u1', expoPushToken: 'bad-token' }],
    });
    const prisma = createPrisma();
    const service = new EngagementDeliveryService(
      prisma as never,
      pushSender as never,
      pushDevices as never,
      createHoldout() as never,
    );

    await service.send({
      source: 'completion',
      audience: 'all_devices',
      pushes: [
        {
          userId: 'u1',
          title: 'Done',
          body: 'Nice work',
          data: { destination: 'challenge', challengeId: 'c1' },
        },
      ],
    });

    expect(pushDevices.deactivateTokens).toHaveBeenCalledWith(['bad-token']);
    expect(prisma.engagementDelivery.createMany).not.toHaveBeenCalled();
  });

  it('returns zeros and skips the provider for empty input', async () => {
    const pushSender = createPushSender();
    const pushDevices = createPushDevices();
    const service = new EngagementDeliveryService(
      createPrisma() as never,
      pushSender as never,
      pushDevices as never,
      createHoldout() as never,
    );

    const result = await service.send({
      source: 'habit_slot',
      audience: 'all_devices',
      pushes: [],
    });

    expect(pushDevices.activeDevicesFor).not.toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
    expect(result.deliveryIdsByUserId).toEqual({});
  });

  it('marks openedAt only when still null', async () => {
    const prisma = createPrisma();
    const service = new EngagementDeliveryService(
      prisma as never,
      createPushSender() as never,
      createPushDevices() as never,
      createHoldout() as never,
    );

    await service.markOpened('delivery-1');

    expect(prisma.engagementDelivery.updateMany).toHaveBeenCalledWith({
      where: { id: 'delivery-1', openedAt: null },
      data: { openedAt: expect.any(Date) },
    });
  });
});
