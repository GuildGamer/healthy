import { describe, expect, it, vi } from 'vitest';
import { CrewSeatNotifierService } from './crew-seat-notifier.service.js';

function createPrismaMock() {
  return {
    notification: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

function createDelivery() {
  return {
    send: vi.fn().mockResolvedValue({
      sentCount: 1,
      messageCount: 1,
      usersWithDevice: ['bee'],
      usersWithoutDevice: [],
    }),
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  delivery = createDelivery(),
) {
  const service = new CrewSeatNotifierService(
    prisma as never,
    delivery as never,
  );

  return { service, delivery };
}

function notice(
  overrides: Partial<{
    matchId: string;
    hostName: string;
    activityNoun: string;
    userIds: readonly string[];
  }> = {},
) {
  return {
    matchId: 'm1',
    hostName: 'Ada',
    activityNoun: 'push-up',
    userIds: ['bee', 'cam'] as readonly string[],
    ...overrides,
  };
}

describe('CrewSeatNotifierService', () => {
  it('writes one inbox row per seat and pushes to their devices', async () => {
    const prisma = createPrismaMock();
    const { service, delivery } = createService(prisma);

    await service.notifySeated(notice());

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'bee',
          kind: 'social',
          body: 'Ada added you to a push-up contest. Open it to take part.',
          payload: { matchId: 'm1' },
          idempotencyKey: 'crew_seat:m1:bee',
        }),
        expect.objectContaining({
          userId: 'cam',
          payload: { matchId: 'm1' },
          idempotencyKey: 'crew_seat:m1:cam',
        }),
      ],
      skipDuplicates: true,
    });
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'crew_seat',
      audience: 'group_opt_in',
      pushes: [
        expect.objectContaining({ userId: 'bee', data: { matchId: 'm1' } }),
        expect.objectContaining({ userId: 'cam', data: { matchId: 'm1' } }),
      ],
    });
  });

  it('names the host and the exercise in what it sends', async () => {
    const prisma = createPrismaMock();
    const { service, delivery } = createService(prisma);

    await service.notifySeated(notice({ userIds: ['bee'] }));

    const [input] = delivery.send.mock.calls[0] as [
      { pushes: { title: string; body: string }[] },
    ];
    const text = `${input.pushes[0]?.title} ${input.pushes[0]?.body}`;
    expect(text).toMatch(/Ada/);
    expect(text).toMatch(/push-up/);
    expect(text).toMatch(/group challenge/i);
  });

  it('is idempotent, so a retried creation cannot notify twice', async () => {
    const prisma = createPrismaMock();
    prisma.notification.findMany.mockResolvedValue([
      { idempotencyKey: 'crew_seat:m1:bee' },
    ]);
    const { service, delivery } = createService(prisma);

    await service.notifySeated(notice());

    // Bee already knows; only Cam is new.
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'cam' })],
      skipDuplicates: true,
    });
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'crew_seat',
      audience: 'group_opt_in',
      pushes: [expect.objectContaining({ userId: 'cam' })],
    });
  });

  it('does nothing at all when everyone has already been told', async () => {
    const prisma = createPrismaMock();
    prisma.notification.findMany.mockResolvedValue([
      { idempotencyKey: 'crew_seat:m1:bee' },
    ]);
    const { service, delivery } = createService(prisma);

    await service.notifySeated(notice({ userIds: ['bee'] }));

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('keeps the inbox row even when delivery finds no device', async () => {
    const prisma = createPrismaMock();
    const delivery = createDelivery();
    delivery.send.mockResolvedValue({
      sentCount: 0,
      messageCount: 0,
      usersWithDevice: [],
      usersWithoutDevice: ['bee'],
    });
    const { service } = createService(prisma, delivery);

    await service.notifySeated(notice({ userIds: ['bee'] }));

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.send).toHaveBeenCalled();
  });

  it('stays quiet when a contest seats nobody', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(prisma);

    await service.notifySeated(notice({ userIds: [] }));

    expect(prisma.notification.findMany).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
