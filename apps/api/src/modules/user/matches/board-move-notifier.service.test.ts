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
    pushDevice: {
      findMany: vi.fn().mockResolvedValue([
        { userId: 'host', expoPushToken: 'ExponentPushToken[host]' },
        { userId: 'cam', expoPushToken: 'ExponentPushToken[cam]' },
      ]),
    },
  };
}

function createPushSender() {
  return {
    send: vi.fn().mockResolvedValue({ sentCount: 2, rejectedTokens: [] }),
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  pushSender = createPushSender(),
) {
  const pushDevices = { deactivateTokens: vi.fn() };
  const service = new BoardMoveNotifierService(
    prisma as never,
    pushSender,
    pushDevices as never,
  );

  return { service, pushSender, pushDevices };
}

describe('BoardMoveNotifierService', () => {
  it('skips the actor and uses urgent copy when they passed a mate', async () => {
    const prisma = createPrismaMock();
    const { service, pushSender } = createService(prisma);

    await service.notifyParticipants(notice);

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'host',
          kind: 'social',
          title: 'Stay ahead',
          body: 'Bee just passed you.',
          payload: { matchId: 'm1' },
          idempotencyKey: 'match_board_move:m1:a1:host',
        },
        {
          userId: 'cam',
          kind: 'social',
          title: 'See the board',
          body: 'Bee just scored.',
          payload: { matchId: 'm1' },
          idempotencyKey: 'match_board_move:m1:a1:cam',
        },
      ],
      skipDuplicates: true,
    });
    expect(pushSender.send).toHaveBeenCalledWith([
      {
        expoPushToken: 'ExponentPushToken[host]',
        title: 'Stay ahead',
        body: 'Bee just passed you.',
        data: { matchId: 'm1' },
      },
      {
        expoPushToken: 'ExponentPushToken[cam]',
        title: 'See the board',
        body: 'Bee just scored.',
        data: { matchId: 'm1' },
      },
    ]);
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
          body: 'Bee is on your heels.',
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
          body: 'Bee matched you.',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('does not notify when the only recipient is the actor', async () => {
    const prisma = createPrismaMock();
    const { service, pushSender } = createService(prisma);

    await service.notifyParticipants({
      ...notice,
      recipients: [{ userId: 'bee', score: 40 }],
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('is idempotent so a retried attempt does not spam', async () => {
    const prisma = createPrismaMock();
    prisma.notification.findMany.mockResolvedValue([
      { idempotencyKey: 'match_board_move:m1:a1:host' },
      { idempotencyKey: 'match_board_move:m1:a1:cam' },
    ]);
    const { service, pushSender } = createService(prisma);

    await service.notifyParticipants(notice);

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('keeps the inbox row when a recipient has no device', async () => {
    const prisma = createPrismaMock();
    prisma.pushDevice.findMany.mockResolvedValue([]);
    const { service, pushSender } = createService(prisma);

    await service.notifyParticipants({
      ...notice,
      recipients: [{ userId: 'host', score: 30 }],
    });

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('retires tokens the provider rejected', async () => {
    const prisma = createPrismaMock();
    const pushSender = {
      send: vi.fn().mockResolvedValue({
        sentCount: 0,
        rejectedTokens: ['ExponentPushToken[host]'],
      }),
    };
    const { service, pushDevices } = createService(prisma, pushSender);

    await service.notifyParticipants({
      ...notice,
      recipients: [{ userId: 'host', score: 30 }],
    });

    expect(pushDevices.deactivateTokens).toHaveBeenCalledWith([
      'ExponentPushToken[host]',
    ]);
  });
});
