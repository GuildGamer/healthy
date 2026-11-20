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
  actorRank: 1,
  // 26 hours after NOW.
  endsAt: '2026-10-27T12:00:00.000Z',
  recipients: [
    { userId: 'bee', score: 40, rank: 1 },
    { userId: 'host', score: 30, rank: 2 },
    { userId: 'cam', score: 100, rank: 3 },
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

function clearCoalesceContext(userIds: readonly string[] = ['host', 'cam']) {
  return {
    loadForNotify: vi.fn().mockResolvedValue({
      historyByRecipient: new Map(
        userIds.map((userId) => [userId, { pushedInCoalesceWindow: false }]),
      ),
    }),
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  delivery = createDelivery(),
  pushContext = clearCoalesceContext(),
) {
  const service = new BoardMoveNotifierService(
    prisma as never,
    delivery as never,
    pushContext as never,
  );

  return { service, delivery, pushContext };
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
          data: { matchId: 'm1', actorUserId: 'bee' },
          situation: 'ahead',
          templateKey: 'board_move',
        },
        {
          userId: 'cam',
          title: 'Bee scored',
          body: '40 to your 100 · 1 day left',
          data: { matchId: 'm1', actorUserId: 'bee' },
          situation: 'routine',
          templateKey: 'board_move',
        },
      ],
    });
  });

  it('uses closing-in copy when the actor is close behind', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(
      prisma,
      createDelivery(),
      clearCoalesceContext(['host']),
    );

    await service.notifyParticipants({
      ...notice,
      actorScoreBefore: 20,
      actorScoreAfter: 28,
      actorRank: 2,
      recipients: [{ userId: 'host', score: 30, rank: 1 }],
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
    const { service } = createService(
      prisma,
      createDelivery(),
      clearCoalesceContext(['host']),
    );

    await service.notifyParticipants({
      ...notice,
      actorScoreBefore: 20,
      actorScoreAfter: 30,
      actorRank: 1,
      recipients: [{ userId: 'host', score: 30, rank: 1 }],
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
      recipients: [{ userId: 'bee', score: 40, rank: 1 }],
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
    const { service } = createService(
      prisma,
      delivery,
      clearCoalesceContext(['host']),
    );

    await service.notifyParticipants({
      ...notice,
      recipients: [{ userId: 'host', score: 30, rank: 2 }],
    });

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.send).toHaveBeenCalled();
  });

  it('writes inbox for every routine set but coalesces lock-screen pushes', async () => {
    const prisma = createPrismaMock();
    const delivery = createDelivery();
    const pushContext = {
      loadForNotify: vi
        .fn()
        .mockResolvedValueOnce({
          historyByRecipient: new Map([
            ['host', { pushedInCoalesceWindow: false }],
          ]),
        })
        .mockResolvedValueOnce({
          historyByRecipient: new Map([
            ['host', { pushedInCoalesceWindow: true }],
          ]),
        })
        .mockResolvedValueOnce({
          historyByRecipient: new Map([
            ['host', { pushedInCoalesceWindow: true }],
          ]),
        }),
    };
    const { service } = createService(prisma, delivery, pushContext);

    await service.notifyParticipants({
      ...notice,
      attemptOrEventId: 'a1',
      actorScoreBefore: 0,
      actorScoreAfter: 10,
      actorRank: 2,
      recipients: [{ userId: 'host', score: 100, rank: 1 }],
    });
    await service.notifyParticipants({
      ...notice,
      attemptOrEventId: 'a2',
      actorScoreBefore: 10,
      actorScoreAfter: 20,
      actorRank: 2,
      recipients: [{ userId: 'host', score: 100, rank: 1 }],
    });
    await service.notifyParticipants({
      ...notice,
      attemptOrEventId: 'a3',
      actorScoreBefore: 20,
      actorScoreAfter: 30,
      actorRank: 2,
      recipients: [{ userId: 'host', score: 100, rank: 1 }],
    });

    expect(prisma.notification.createMany).toHaveBeenCalledTimes(3);
    expect(delivery.send).toHaveBeenCalledTimes(1);
    expect(delivery.send).toHaveBeenCalledWith(
      expect.objectContaining({
        pushes: [
          expect.objectContaining({
            userId: 'host',
            situation: 'routine',
          }),
        ],
      }),
    );
  });

  it('still pushes a competitive escalation inside the coalesce window', async () => {
    const prisma = createPrismaMock();
    const delivery = createDelivery();
    const pushContext = {
      loadForNotify: vi
        .fn()
        .mockResolvedValueOnce({
          historyByRecipient: new Map([
            ['host', { pushedInCoalesceWindow: false }],
          ]),
        })
        .mockResolvedValueOnce({
          historyByRecipient: new Map([
            ['host', { pushedInCoalesceWindow: true }],
          ]),
        }),
    };
    const { service } = createService(prisma, delivery, pushContext);

    await service.notifyParticipants({
      ...notice,
      attemptOrEventId: 'a1',
      actorScoreBefore: 0,
      actorScoreAfter: 10,
      actorRank: 2,
      recipients: [{ userId: 'host', score: 100, rank: 1 }],
    });
    await service.notifyParticipants({
      ...notice,
      attemptOrEventId: 'a2',
      actorScoreBefore: 25,
      actorScoreAfter: 40,
      actorRank: 1,
      recipients: [{ userId: 'host', score: 30, rank: 2 }],
    });

    expect(delivery.send).toHaveBeenCalledTimes(2);
    expect(delivery.send.mock.calls[1]?.[0].pushes).toEqual([
      expect.objectContaining({
        userId: 'host',
        situation: 'ahead',
        title: 'Bee passed you',
      }),
    ]);
  });

  it('announces routine when the coalesce window is clear', async () => {
    const prisma = createPrismaMock();
    const delivery = createDelivery();
    const { service } = createService(prisma, delivery);

    await service.notifyParticipants(notice);

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'board_move',
      audience: 'group_opt_in',
      pushes: [
        expect.objectContaining({
          userId: 'host',
          situation: 'ahead',
        }),
        expect.objectContaining({
          userId: 'cam',
          situation: 'routine',
        }),
      ],
    });
  });

  it('skips delivery entirely when every recipient is coalesced routine', async () => {
    const prisma = createPrismaMock();
    const delivery = createDelivery();
    const pushContext = {
      loadForNotify: vi.fn().mockResolvedValue({
        historyByRecipient: new Map([
          ['host', { pushedInCoalesceWindow: true }],
        ]),
      }),
    };
    const { service } = createService(prisma, delivery, pushContext);

    await service.notifyParticipants({
      ...notice,
      actorScoreBefore: 0,
      actorScoreAfter: 10,
      actorRank: 2,
      recipients: [{ userId: 'host', score: 100, rank: 1 }],
    });

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.send).not.toHaveBeenCalled();
  });
});
