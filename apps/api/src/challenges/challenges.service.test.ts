import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { ChallengesService } from './challenges.service.js';

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

function createAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'uc1',
    userId: 'u1',
    challengeId: 'c1',
    dayKey: '2026-08-29',
    status: 'pending',
    startedAt: null,
    completedAt: null,
    challenge: {
      title: 'Walk 20 minutes',
      description: 'A brisk walk after lunch.',
      category: 'general',
      rewardPoints: 20,
    },
    ...overrides,
  };
}

function createPrismaMock(assignment: ReturnType<typeof createAssignment> | null) {
  return {
    userChallenge: {
      findUnique: vi.fn().mockResolvedValue(assignment),
      findUniqueOrThrow: vi.fn().mockResolvedValue(assignment),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe('ChallengesService.start', () => {
  it('rejects unauthenticated callers with ORPC UNAUTHORIZED', async () => {
    const service = new ChallengesService(createPrismaMock(null) as never);

    await expect(service.start(null, 'uc1')).rejects.toBeInstanceOf(ORPCError);
  });

  it('rejects an assignment belonging to another user', async () => {
    const prisma = createPrismaMock(createAssignment({ userId: 'someone-else' }));
    const service = new ChallengesService(prisma as never);

    await expect(service.start(user, 'uc1')).rejects.toBeInstanceOf(ORPCError);
    expect(prisma.userChallenge.updateMany).not.toHaveBeenCalled();
  });

  it('moves a pending assignment to in_progress', async () => {
    const prisma = createPrismaMock(createAssignment());
    prisma.userChallenge.findUniqueOrThrow.mockResolvedValue(
      createAssignment({ status: 'in_progress', startedAt: new Date() }),
    );
    const service = new ChallengesService(prisma as never);

    const result = await service.start(user, 'uc1');

    expect(result.challenge).toMatchObject({
      id: 'uc1',
      title: 'Walk 20 minutes',
      rewardPoints: 20,
      status: 'in_progress',
    });
    expect(prisma.userChallenge.updateMany).toHaveBeenCalledWith({
      where: { id: 'uc1', status: 'pending' },
      data: { status: 'in_progress', startedAt: expect.any(Date) },
    });
  });

  it('is a no-op for an already completed assignment', async () => {
    const completed = createAssignment({
      status: 'completed',
      completedAt: new Date(),
    });
    const prisma = createPrismaMock(completed);
    prisma.userChallenge.updateMany.mockResolvedValue({ count: 0 });
    const service = new ChallengesService(prisma as never);

    const result = await service.start(user, 'uc1');

    expect(result.challenge.status).toBe('completed');
  });
});
