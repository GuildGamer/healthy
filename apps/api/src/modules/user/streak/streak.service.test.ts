import { describe, expect, it, vi } from 'vitest';
import { dayKeyFor, previousDayKey } from '../../../shared/utils/day-key.js';
import { StreakService } from './streak.service.js';

const TIME_ZONE = 'Asia/Singapore';

function createPrismaMock(profile: {
  currentStreakDays: number;
  bestStreakDays: number;
  lastActiveDayKey: string | null;
}) {
  return {
    userProfile: {
      upsert: vi.fn(async () => ({ ...profile, timeZone: TIME_ZONE })),
      update: vi.fn(async () => ({})),
    },
  };
}

function createFriendMilestonesSpy() {
  return { notifyAcquaintances: vi.fn(async () => undefined) };
}

describe('StreakService.recordActiveDay', () => {
  it('extends yesterday’s run in the member’s own zone and keeps the best run', async () => {
    const todayKey = dayKeyFor(TIME_ZONE);
    const prisma = createPrismaMock({
      currentStreakDays: 6,
      bestStreakDays: 6,
      lastActiveDayKey: previousDayKey(todayKey),
    });

    const advance = await new StreakService(prisma as never).recordActiveDay('u1');

    expect(advance).toEqual({ currentStreakDays: 7, advanced: true });
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { currentStreakDays: 7, bestStreakDays: 7, lastActiveDayKey: todayKey },
    });
  });

  it('writes nothing when today already counted, so retries are free', async () => {
    const prisma = createPrismaMock({
      currentStreakDays: 3,
      bestStreakDays: 10,
      lastActiveDayKey: dayKeyFor(TIME_ZONE),
    });

    const advance = await new StreakService(prisma as never).recordActiveDay('u1');

    expect(advance).toEqual({ currentStreakDays: 3, advanced: false });
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('writes through the transaction it is handed', async () => {
    const prisma = createPrismaMock({ currentStreakDays: 0, bestStreakDays: 0, lastActiveDayKey: null });
    const tx = createPrismaMock({ currentStreakDays: 0, bestStreakDays: 0, lastActiveDayKey: null });

    await new StreakService(prisma as never).recordActiveDay('u1', tx as never);

    expect(tx.userProfile.update).toHaveBeenCalled();
    expect(prisma.userProfile.upsert).not.toHaveBeenCalled();
  });
});

describe('StreakService.announceMilestone', () => {
  const prisma = createPrismaMock({ currentStreakDays: 0, bestStreakDays: 0, lastActiveDayKey: null });

  it('nudges acquaintances on the day a milestone is reached', async () => {
    const friends = createFriendMilestonesSpy();

    await new StreakService(prisma as never, friends as never).announceMilestone('u1', {
      currentStreakDays: 7,
      advanced: true,
    });

    expect(friends.notifyAcquaintances).toHaveBeenCalledWith({
      actorUserId: 'u1',
      milestoneKey: 'streak_7',
    });
  });

  it('stays quiet on a repeat activity that did not move the streak', async () => {
    const friends = createFriendMilestonesSpy();

    await new StreakService(prisma as never, friends as never).announceMilestone('u1', {
      currentStreakDays: 7,
      advanced: false,
    });

    expect(friends.notifyAcquaintances).not.toHaveBeenCalled();
  });
});
