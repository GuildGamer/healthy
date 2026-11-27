import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics.service.js';

function createPrismaMock() {
  return {
    analyticsEvent: {
      create: vi.fn().mockResolvedValue({ id: 'evt1' }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    match: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe('AnalyticsService', () => {
  it('stores the event and stamps firstOpenedAt on challenge_link_opened', async () => {
    const prisma = createPrismaMock();
    const service = new AnalyticsService(prisma as never);

    await expect(
      service.track(null, {
        name: 'challenge_link_opened',
        anonymousId: 'anon-1',
        properties: { inviteToken: 'invite_token_1', source: 'web_invite' },
        context: { emitter: 'web', platform: 'web' },
      }),
    ).resolves.toEqual({ ok: true });

    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'challenge_link_opened',
          anonymousId: 'anon-1',
          emitter: 'web',
          platform: 'web',
        }),
      }),
    );
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { inviteToken: 'invite_token_1', firstOpenedAt: null },
      data: { firstOpenedAt: expect.any(Date) },
    });
  });

  it('skips invite stamp when inviteToken is missing', async () => {
    const prisma = createPrismaMock();
    const service = new AnalyticsService(prisma as never);

    await service.track(null, {
      name: 'challenge_link_opened',
      properties: {},
    });

    expect(prisma.match.updateMany).not.toHaveBeenCalled();
  });

  it('marks push opened when engagementDeliveryId is present', async () => {
    const prisma = createPrismaMock();
    const engagementDelivery = {
      markOpened: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AnalyticsService(
      prisma as never,
      engagementDelivery as never,
    );

    await service.track(
      { id: 'u1', email: 'a@b.c' },
      {
        name: 'push_opened',
        properties: { engagementDeliveryId: 'del-1' },
      },
    );

    expect(engagementDelivery.markOpened).toHaveBeenCalledWith('del-1');
  });

  it('clamps occurredAt far in the future to now + 24h', async () => {
    const prisma = createPrismaMock();
    const service = new AnalyticsService(prisma as never);
    const farFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    await service.track(null, {
      name: 'user_active',
      properties: {},
      occurredAt: farFuture.toISOString(),
    });

    const data = prisma.analyticsEvent.create.mock.calls[0]?.[0]?.data as {
      occurredAt: Date;
    };
    expect(data.occurredAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 24 * 60 * 60 * 1000 + 1_000,
    );
  });

  it('stores a batch and runs side effects per event', async () => {
    const prisma = createPrismaMock();
    const service = new AnalyticsService(prisma as never);

    await service.trackBatch(null, [
      {
        name: 'app_opened',
        properties: { coldStart: true },
        context: { emitter: 'mobile' },
      },
      {
        name: 'challenge_link_opened',
        properties: { inviteToken: 'invite_token_1' },
      },
    ]);

    expect(prisma.analyticsEvent.createMany).toHaveBeenCalled();
    expect(prisma.match.updateMany).toHaveBeenCalled();
  });
});
