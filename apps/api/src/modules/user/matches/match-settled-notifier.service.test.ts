import { describe, expect, it, vi } from 'vitest';
import { MatchSettledNotifierService } from './match-settled-notifier.service.js';

function createPrismaMock(existingKeys: string[] = []) {
  return {
    notification: {
      findMany: vi.fn().mockResolvedValue(
        existingKeys.map((idempotencyKey) => ({ idempotencyKey })),
      ),
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

function notice(
  overrides: Partial<{
    matchId: string;
    contestTitle: string;
    winnerUserId: string | null;
    winnerDisplayName: string | null;
    recipientUserIds: readonly string[];
  }> = {},
) {
  return {
    matchId: 'm1',
    contestTitle: 'Push-up Sunday',
    winnerUserId: 'ada',
    winnerDisplayName: 'Ada',
    recipientUserIds: ['ada', 'bee'] as readonly string[],
    ...overrides,
  };
}

describe('MatchSettledNotifierService', () => {
  it('writes winner and other copy, and pushes with the result destination', async () => {
    const prisma = createPrismaMock();
    const delivery = createDelivery();
    const service = new MatchSettledNotifierService(
      prisma as never,
      delivery as never,
    );

    await service.notifyParticipants(notice());

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'ada',
          title: 'You won Push-up Sunday',
          body: 'See the final board.',
          payload: { matchId: 'm1', destination: 'match_result' },
          idempotencyKey: 'match_settled:m1:ada',
        }),
        expect.objectContaining({
          userId: 'bee',
          title: 'Push-up Sunday is over',
          body: 'Ada took it. See the final board.',
          payload: { matchId: 'm1', destination: 'match_result' },
          idempotencyKey: 'match_settled:m1:bee',
        }),
      ],
      skipDuplicates: true,
    });
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'match_settled',
      audience: 'group_opt_in',
      pushes: [
        expect.objectContaining({
          userId: 'ada',
          data: { matchId: 'm1', destination: 'match_result' },
        }),
        expect.objectContaining({
          userId: 'bee',
          data: { matchId: 'm1', destination: 'match_result' },
        }),
      ],
    });
  });

  it('skips recipients who already have the inbox row', async () => {
    const prisma = createPrismaMock(['match_settled:m1:ada', 'match_settled:m1:bee']);
    const delivery = createDelivery();
    const service = new MatchSettledNotifierService(
      prisma as never,
      delivery as never,
    );

    await service.notifyParticipants(notice());

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('does nothing when nobody accepted', async () => {
    const prisma = createPrismaMock();
    const delivery = createDelivery();
    const service = new MatchSettledNotifierService(
      prisma as never,
      delivery as never,
    );

    await service.notifyParticipants(notice({ recipientUserIds: [] }));

    expect(prisma.notification.findMany).not.toHaveBeenCalled();
    expect(delivery.send).not.toHaveBeenCalled();
  });
});
