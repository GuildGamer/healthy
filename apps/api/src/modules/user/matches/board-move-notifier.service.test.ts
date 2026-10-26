import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardMoveNotifierService } from './board-move-notifier.service.js';

const NOW = new Date('2026-10-26T10:00:00.000Z');

const notice = {
  matchId: 'm1',
  attemptOrEventId: 'a1',
  actorUserId: 'bee',
  actorDisplayName: 'Bee',
  actorScoreBefore: 25,
  actorScoreAfter: 40,
  // 26 hours after NOW.
  endsAt: '2026-10-27T12:00:00.000Z',
  recipients: [
    { userId: 'bee', score: 40 },
    { userId: 'host', score: 30 },
    { userId: 'cam', score: 100 },
  ],
};

function createPrismaMock() {
  return {
    notification: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
  };
}

function createDelivery() {
  return {
    send: vi.fn().mockResolvedValue({
      sentCount: 2,
      messageCount: 2,
      usersWithDevice: ['host', 'cam'],
      usersWithoutDevice: [],
    }),
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  delivery = createDelivery(),
) {
  const service = new BoardMoveNotifierService(prisma as never, delivery as never);

  return { service, delivery };
}

describe('BoardMoveNotifierService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips the actor and names the rival when they passed a mate', async () => {
    const prisma = createPrismaMock();
    const { service, delivery } = createService(prisma);

    await service.notifyParticipants(notice);

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'host',
          kind: 'social',
          title: 'Bee passed you',
          body: '40 to your 30 · 1 day left',
          payload: { matchId: 'm1' },
          idempotencyKey: 'match_board_move:m1:a1:host',
        },
        {
          userId: 'cam',
          kind: 'social',
          title: 'Bee scored',
          body: '40 to your 100 · 1 day left',
          payload: { matchId: 'm1' },
          idempotencyKey: 'match_board_move:m1:a1:cam',
        },
      ],
      skipDuplicates: true,
    });
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'board_move',
      audience: 'group_opt_in',
      pushes: [
        {
          userId: 'host',
          title: 'Bee passed you',
          body: '40 to your 30 · 1 day left',
          data: { matchId: 'm1' },
        },
        {
          userId: 'cam',
          title: 'Bee scored',
          body: '40 to your 100 · 1 day left',
          data: { matchId: 'm1' },
        },
      ],
    });
  });

  it('uses closing-in copy when the actor is close behind', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(prisma);

    await service.notifyParticipants({
      ...notice,
      actorScoreBefore: 20,
      actorScoreAfter: 28,
      recipients: [{ userId: 'host', score: 30 }],
    });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'host',
          title: "Bee's closing in",
          body: '28 to your 30 · 1 day left',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('uses caught-you copy when scores are tied', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(prisma);

    await service.notifyParticipants({
      ...notice,
      actorScoreBefore: 20,
      actorScoreAfter: 30,
      recipients: [{ userId: 'host', score: 30 }],
    });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          title: 'Bee caught you',
          body: 'Both on 30 · 1 day left',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('does not notify when the only recipient is the actor', async () => {
    const prisma = createPrismaMock();
    const { service, delivery } = createService(prisma);

    await service.notifyParticipants({
      ...notice,
      recipients: [{ userId: 'bee', score: 40 }],
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('is idempotent so a retried attempt does not spam', async () => {
    const prisma = createPrismaMock();
    prisma.notification.findMany.mockResolvedValue([
      { idempotencyKey: 'match_board_move:m1:a1:host' },
      { idempotencyKey: 'match_board_move:m1:a1:cam' },
    ]);
    const { service, delivery } = createService(prisma);

    await service.notifyParticipants(notice);

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
      usersWithoutDevice: ['host'],
    });
    const { service } = createService(prisma, delivery);

    await service.notifyParticipants({
      ...notice,
      recipients: [{ userId: 'host', score: 30 }],
    });

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.send).toHaveBeenCalled();
  });
});
