import { describe, expect, it, vi } from 'vitest';
import { BoardMoveNotifierService } from './board-move-notifier.service.js';

const notice = {
  matchId: 'm1',
  attemptOrEventId: 'a1',
  actorUserId: 'bee',
  actorDisplayName: 'Bee',
  actorScoreBefore: 25,
  actorScoreAfter: 40,
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
  it('skips the actor and uses urgent copy when they passed a mate', async () => {
    const prisma = createPrismaMock();
    const { service, delivery } = createService(prisma);

    await service.notifyParticipants(notice);

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'host',
          kind: 'social',
          title: 'Stay ahead',
          body: 'Bee just passed you, 40 to your 30.',
          payload: { matchId: 'm1' },
          idempotencyKey: 'match_board_move:m1:a1:host',
        },
        {
          userId: 'cam',
          kind: 'social',
          title: 'See the board',
          body: 'Bee just scored, 40 to your 100.',
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
          title: 'Stay ahead',
          body: 'Bee just passed you, 40 to your 30.',
          data: { matchId: 'm1' },
        },
        {
          userId: 'cam',
          title: 'See the board',
          body: 'Bee just scored, 40 to your 100.',
          data: { matchId: 'm1' },
        },
      ],
    });
  });

  it('uses on-your-heels copy when the actor is close behind', async () => {
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
          title: 'Stay ahead',
          body: 'Bee is on your heels, 28 to your 30.',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('uses matched-you copy when scores are tied', async () => {
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
          title: 'Stay ahead',
          body: 'Bee matched you, 30 to your 30.',
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
