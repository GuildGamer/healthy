import { describe, expect, it, vi } from 'vitest';
import { FriendMilestoneNotifierService } from './friend-milestone-notifier.service.js';

const actorId = 'actor';
const beeId = 'bee';
const camId = 'cam';

function createPrismaMock() {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: actorId,
        profile: { displayName: 'Ada' },
      }),
    },
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({ timeZone: 'UTC' }),
      findMany: vi.fn().mockResolvedValue([
        { userId: beeId, timeZone: 'UTC' },
        { userId: camId, timeZone: 'UTC' },
      ]),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    engagementDelivery: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    analyticsEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    userChallenge: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

function createCrewsSpy(ids: string[] = [beeId, camId]) {
  return {
    allowedInviteeIds: vi.fn().mockResolvedValue(new Set(ids)),
  };
}

function createDeliverySpy() {
  return {
    send: vi.fn().mockResolvedValue({ sentCount: 1 }),
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock> = createPrismaMock(),
  crews: ReturnType<typeof createCrewsSpy> = createCrewsSpy(),
  delivery: ReturnType<typeof createDeliverySpy> = createDeliverySpy(),
) {
  return {
    service: new FriendMilestoneNotifierService(
      prisma as never,
      crews as never,
      delivery as never,
    ),
    prisma,
    crews,
    delivery,
  };
}

/** Midday UTC so quiet hours (21:00–07:59) do not apply. */
const midday = new Date('2026-10-24T12:00:00.000Z');

describe('FriendMilestoneNotifierService', () => {
  it('nudges inactive acquaintances with a contest CTA', async () => {
    const { service, prisma, delivery } = createService();

    await service.notifyAcquaintances({
      actorUserId: actorId,
      milestoneKey: 'streak_7',
      now: midday,
    });

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.send).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'friend_milestone',
        audience: 'group_opt_in',
        pushes: expect.arrayContaining([
          expect.objectContaining({
            userId: beeId,
            data: { destination: 'match_create', withUserId: actorId },
          }),
        ]),
      }),
    );
  });

  it('skips quiet hours for the recipient', async () => {
    const prisma = createPrismaMock();
    prisma.userProfile.findMany.mockResolvedValue([
      { userId: beeId, timeZone: 'UTC' },
    ]);
    const { service, delivery } = createService(prisma, createCrewsSpy([beeId]));

    await service.notifyAcquaintances({
      actorUserId: actorId,
      milestoneKey: 'streak_7',
      now: new Date('2026-10-24T22:30:00.000Z'),
    });

    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('skips recipients active in the last 18 hours', async () => {
    const prisma = createPrismaMock();
    prisma.analyticsEvent.findMany.mockResolvedValue([{ userId: beeId }]);
    const { service, delivery } = createService(prisma, createCrewsSpy([beeId]));

    await service.notifyAcquaintances({
      actorUserId: actorId,
      milestoneKey: 'streak_7',
      now: midday,
    });

    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('skips a second friend_milestone the same local day', async () => {
    const prisma = createPrismaMock();
    prisma.engagementDelivery.findMany.mockResolvedValue([
      { userId: beeId, sentAt: midday },
    ]);
    const { service, delivery } = createService(prisma, createCrewsSpy([beeId]));

    await service.notifyAcquaintances({
      actorUserId: actorId,
      milestoneKey: 'streak_14',
      now: midday,
    });

    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('does nothing when the actor has no acquaintances', async () => {
    const { service, delivery } = createService(
      createPrismaMock(),
      createCrewsSpy([]),
    );

    await service.notifyAcquaintances({
      actorUserId: actorId,
      milestoneKey: 'goal_ladder',
      now: midday,
    });

    expect(delivery.send).not.toHaveBeenCalled();
  });
});
