import { describe, expect, it, vi } from 'vitest';
import { ORPCError } from '@orpc/server';
import { MeService } from './me.service.js';

function createPrismaMock(
  profile: {
    healthCategories: string[];
    pointsBalance: number;
    currentStreakDays: number;
  } | null = null,
) {
  return {
    userProfile: {
      findUnique: vi.fn().mockResolvedValue(profile),
      upsert: vi.fn().mockResolvedValue(profile),
    },
  };
}

describe('MeService', () => {
  it('returns the authenticated user with zeros when no profile exists', async () => {
    const prisma = createPrismaMock(null);
    const service = new MeService(prisma as never);

    await expect(
      service.getMe({ id: 'u1', email: 'a@b.co', name: 'Ada' }),
    ).resolves.toEqual({
      id: 'u1',
      email: 'a@b.co',
      name: 'Ada',
      categories: [],
      pointsBalance: 0,
      currentStreakDays: 0,
    });
  });

  it('returns stored health categories and points from the profile', async () => {
    const prisma = createPrismaMock({
      healthCategories: ['hypertension', 'diabetes'],
      pointsBalance: 350,
      currentStreakDays: 4,
    });
    const service = new MeService(prisma as never);

    await expect(
      service.getMe({ id: 'u1', email: 'a@b.co', name: 'Ada' }),
    ).resolves.toEqual({
      id: 'u1',
      email: 'a@b.co',
      name: 'Ada',
      categories: ['hypertension', 'diabetes'],
      pointsBalance: 350,
      currentStreakDays: 4,
    });
  });

  it('rejects unauthenticated callers with ORPC UNAUTHORIZED', async () => {
    const service = new MeService(createPrismaMock() as never);

    await expect(service.getMe(null)).rejects.toBeInstanceOf(ORPCError);
  });

  it('upserts categories and returns the updated profile', async () => {
    const prisma = createPrismaMock({
      healthCategories: ['asthma'],
      pointsBalance: 0,
      currentStreakDays: 0,
    });
    prisma.userProfile.findUnique.mockResolvedValue({
      healthCategories: ['asthma'],
      pointsBalance: 0,
      currentStreakDays: 0,
    });
    const service = new MeService(prisma as never);

    await expect(
      service.updateCategories({ id: 'u1', email: 'a@b.co', name: 'Ada' }, [
        'asthma',
      ]),
    ).resolves.toEqual({
      id: 'u1',
      email: 'a@b.co',
      name: 'Ada',
      categories: ['asthma'],
      pointsBalance: 0,
      currentStreakDays: 0,
    });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: {
        userId: 'u1',
        healthCategories: ['asthma'],
      },
      update: {
        healthCategories: ['asthma'],
      },
    });
  });

  it('rejects empty category updates', async () => {
    const service = new MeService(createPrismaMock() as never);

    await expect(
      service.updateCategories({ id: 'u1', email: 'a@b.co' }, []),
    ).rejects.toBeInstanceOf(ORPCError);
  });
});
