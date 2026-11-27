import { describe, expect, it, vi } from 'vitest';
import { ORPCError } from '@orpc/server';
import { FREE_CAMERA_COUNTING_STARTS } from '../../../shared/membership/entitlements.js';
import { CameraCountingService } from './camera-counting.service.js';

vi.mock('../../../shared/membership/resolve-membership-active.js', () => ({
  resolveMembershipActive: vi.fn(),
}));

import { resolveMembershipActive } from '../../../shared/membership/resolve-membership-active.js';

const resolveMembership = vi.mocked(resolveMembershipActive);

type StartRow = {
  id: string;
  userId: string;
  clientStartId: string;
  context: string;
};

function createPrismaMock(rows: StartRow[] = []) {
  const store = [...rows];

  const api = {
    cameraCountingStart: {
      findUnique: vi.fn(async ({ where }: { where: { userId_clientStartId: { userId: string; clientStartId: string } } }) => {
        const key = where.userId_clientStartId;
        return (
          store.find(
            (row) => row.userId === key.userId && row.clientStartId === key.clientStartId,
          ) ?? null
        );
      }),
      count: vi.fn(async ({ where }: { where: { userId: string } }) => {
        return store.filter((row) => row.userId === where.userId).length;
      }),
      create: vi.fn(async ({ data }: { data: Omit<StartRow, 'id'> & { id?: string } }) => {
        const row: StartRow = {
          id: data.id ?? `ccs_${store.length + 1}`,
          userId: data.userId,
          clientStartId: data.clientStartId,
          context: data.context,
        };
        store.push(row);
        return row;
      }),
    },
    $transaction: vi.fn(async (callback: (tx: typeof api) => Promise<unknown>) => callback(api)),
  };

  return { prisma: api, store };
}

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

describe('CameraCountingService.start', () => {
  it('allows members without recording a start', async () => {
    const { prisma, store } = createPrismaMock();
    resolveMembership.mockResolvedValue(true);
    const service = new CameraCountingService(prisma as never);

    await expect(
      service.start(user, {
        context: 'practice',
        clientStartId: 'start-1',
        challengeId: 'ch-1',
      }),
    ).resolves.toEqual({ freeCameraStartsRemaining: null });

    expect(store).toHaveLength(0);
    expect(prisma.cameraCountingStart.create).not.toHaveBeenCalled();
  });

  it('records the first and second free starts', async () => {
    const { prisma } = createPrismaMock();
    resolveMembership.mockResolvedValue(false);
    const service = new CameraCountingService(prisma as never);

    await expect(
      service.start(user, {
        context: 'challenge',
        clientStartId: 'start-1',
        userChallengeId: 'uc-1',
      }),
    ).resolves.toEqual({ freeCameraStartsRemaining: FREE_CAMERA_COUNTING_STARTS - 1 });

    await expect(
      service.start(user, {
        context: 'match',
        clientStartId: 'start-2',
        matchId: 'm-1',
      }),
    ).resolves.toEqual({ freeCameraStartsRemaining: 0 });
  });

  it('refuses a third free start', async () => {
    const { prisma } = createPrismaMock([
      { id: '1', userId: 'u1', clientStartId: 'a', context: 'challenge' },
      { id: '2', userId: 'u1', clientStartId: 'b', context: 'practice' },
    ]);
    resolveMembership.mockResolvedValue(false);
    const service = new CameraCountingService(prisma as never);

    await expect(
      service.start(user, {
        context: 'practice',
        clientStartId: 'start-3',
        challengeId: 'ch-1',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      data: { reason: 'membership_required' },
    });
    await expect(
      service.start(user, {
        context: 'practice',
        clientStartId: 'start-3',
        challengeId: 'ch-1',
      }),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it('does not consume a second start for the same clientStartId', async () => {
    const { prisma, store } = createPrismaMock();
    resolveMembership.mockResolvedValue(false);
    const service = new CameraCountingService(prisma as never);

    const input = {
      context: 'practice' as const,
      clientStartId: 'retry-me',
      challengeId: 'ch-1',
    };

    await expect(service.start(user, input)).resolves.toEqual({
      freeCameraStartsRemaining: 1,
    });
    await expect(service.start(user, input)).resolves.toEqual({
      freeCameraStartsRemaining: 1,
    });
    expect(store).toHaveLength(1);
  });
});
