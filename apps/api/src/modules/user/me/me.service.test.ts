import { describe, expect, it, vi } from 'vitest';
import { ORPCError } from '@orpc/server';
import { pseudonymFor } from '../leaderboard/pseudonym.js';
import { MeService } from './me.service.js';

type ProfileFixture = {
  displayName?: string | null;
  healthCategories: string[];
  pointsBalance: number;
  currentStreakDays: number;
  timeZone: string;
  countryCode?: string | null;
  reminderEnabled?: boolean;
  reminderMinute?: number;
  evidenceRemindersEnabled?: boolean;
  promotionalMessagesEnabled?: boolean;
  showOnLeaderboard?: boolean;
  membershipActive?: boolean;
};

function todayKey(timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function daysAgoKey(days: number, timeZone = 'UTC'): string {
  const date = new Date(`${todayKey(timeZone)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function createPrismaMock(
  profile: ProfileFixture | null = null,
  latestCompletionDayKey: string | null = null,
) {
  return {
    userProfile: {
      findUnique: vi.fn().mockResolvedValue(profile),
      upsert: vi.fn().mockResolvedValue(profile),
    },
    userChallenge: {
      findFirst: vi.fn().mockResolvedValue(
        latestCompletionDayKey ? { periodKey: latestCompletionDayKey } : null,
      ),
    },
  };
}

/** Enrolling defaults is exercised in its own suite; here it just has to exist. */
function createEnrollmentsMock() {
  return { enrollDefaultsFor: vi.fn().mockResolvedValue(undefined) };
}

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

describe('MeService', () => {
  it('returns the authenticated user with zeros when no profile exists', async () => {
    const service = new MeService(createPrismaMock(null) as never, createEnrollmentsMock() as never);

    await expect(service.getMe(user)).resolves.toEqual({
      id: 'u1',
      email: 'a@b.co',
      name: 'Ada',
      categories: [],
      pointsBalance: 0,
      currentStreakDays: 0,
      timeZone: 'UTC',
      countryCode: null,
      displayName: pseudonymFor('u1'),
      reminderEnabled: false,
      reminderMinute: 1140,
      evidenceRemindersEnabled: true,
      promotionalMessagesEnabled: false,
      showOnLeaderboard: true,
      inProgressNudgeEnabled: true,
      inProgressNudgeDelayMinutes: 30,
      healthLinkStatus: 'unknown',
      hasMembership: false,
      maxRemindersPerChallenge: 1,
    });
  });

  it('returns stored categories, points and time zone from the profile', async () => {
    const prisma = createPrismaMock(
      {
        healthCategories: ['hypertension', 'diabetes'],
        pointsBalance: 350,
        currentStreakDays: 4,
        timeZone: 'Asia/Singapore',
        displayName: 'Ada L',
        reminderEnabled: true,
        reminderMinute: 480,
      },
      todayKey('Asia/Singapore'),
    );
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(service.getMe(user)).resolves.toEqual({
      id: 'u1',
      email: 'a@b.co',
      name: 'Ada',
      categories: ['hypertension', 'diabetes'],
      pointsBalance: 350,
      currentStreakDays: 4,
      timeZone: 'Asia/Singapore',
      countryCode: null,
      displayName: 'Ada L',
      reminderEnabled: true,
      reminderMinute: 480,
      evidenceRemindersEnabled: true,
      promotionalMessagesEnabled: false,
      showOnLeaderboard: true,
      inProgressNudgeEnabled: true,
      inProgressNudgeDelayMinutes: 30,
      healthLinkStatus: 'unknown',
      hasMembership: false,
      maxRemindersPerChallenge: 1,
    });
  });

  it('keeps the streak alive when the last completion was yesterday', async () => {
    const prisma = createPrismaMock(
      {
        healthCategories: [],
        pointsBalance: 0,
        currentStreakDays: 6,
        timeZone: 'UTC',
      },
      daysAgoKey(1),
    );
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(service.getMe(user)).resolves.toMatchObject({
      currentStreakDays: 6,
    });
  });

  it('expires a stale streak when the last completion is older than yesterday', async () => {
    const prisma = createPrismaMock(
      {
        healthCategories: [],
        pointsBalance: 900,
        currentStreakDays: 12,
        timeZone: 'UTC',
      },
      daysAgoKey(3),
    );
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(service.getMe(user)).resolves.toMatchObject({
      pointsBalance: 900,
      currentStreakDays: 0,
    });
  });

  it('rejects unauthenticated callers with ORPC UNAUTHORIZED', async () => {
    const service = new MeService(createPrismaMock() as never, createEnrollmentsMock() as never);

    await expect(service.getMe(null)).rejects.toBeInstanceOf(ORPCError);
  });

  it('upserts categories and returns the updated profile', async () => {
    const profile: ProfileFixture = {
      healthCategories: ['asthma'],
      pointsBalance: 0,
      currentStreakDays: 0,
      timeZone: 'UTC',
    };
    const prisma = createPrismaMock(profile);
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(
      service.updateCategories(user, ['asthma']),
    ).resolves.toMatchObject({
      categories: ['asthma'],
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
    const service = new MeService(createPrismaMock() as never, createEnrollmentsMock() as never);

    await expect(
      service.updateCategories({ id: 'u1', email: 'a@b.co' }, []),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it('stores a valid time zone', async () => {
    const profile: ProfileFixture = {
      healthCategories: [],
      pointsBalance: 0,
      currentStreakDays: 0,
      timeZone: 'Europe/London',
    };
    const prisma = createPrismaMock(profile);
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(
      service.updateTimeZone(user, 'Europe/London'),
    ).resolves.toMatchObject({ timeZone: 'Europe/London' });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', timeZone: 'Europe/London' },
      update: { timeZone: 'Europe/London' },
    });
  });

  it('rejects an unrecognised time zone without writing', async () => {
    const prisma = createPrismaMock();
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(
      service.updateTimeZone(user, 'Mars/Olympus_Mons'),
    ).rejects.toBeInstanceOf(ORPCError);
    expect(prisma.userProfile.upsert).not.toHaveBeenCalled();
  });

  it('stores a valid country code', async () => {
    const profile: ProfileFixture = {
      healthCategories: [],
      pointsBalance: 0,
      currentStreakDays: 0,
      timeZone: 'UTC',
      countryCode: 'KE',
    };
    const prisma = createPrismaMock(profile);
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(service.updateCountry(user, 'ke')).resolves.toMatchObject({
      countryCode: 'KE',
    });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', countryCode: 'KE' },
      update: { countryCode: 'KE' },
    });
  });

  it('rejects an unrecognised country without writing', async () => {
    const prisma = createPrismaMock();
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(service.updateCountry(user, 'XX')).rejects.toBeInstanceOf(
      ORPCError,
    );
    expect(prisma.userProfile.upsert).not.toHaveBeenCalled();
  });

  it('stores a reminder time within the day', async () => {
    const prisma = createPrismaMock({
      healthCategories: [],
      pointsBalance: 0,
      currentStreakDays: 0,
      timeZone: 'UTC',
      reminderEnabled: true,
      reminderMinute: 450,
    });
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(service.updateReminder(user, true, 450)).resolves.toMatchObject(
      { reminderEnabled: true, reminderMinute: 450 },
    );

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', reminderEnabled: true, reminderMinute: 450 },
      update: { reminderEnabled: true, reminderMinute: 450 },
    });
  });

  it.each([-1, 1440, 12.5])(
    'rejects reminder minute %p without writing',
    async (minute) => {
      const prisma = createPrismaMock();
      const service = new MeService(prisma as never, createEnrollmentsMock() as never);

      await expect(
        service.updateReminder(user, true, minute),
      ).rejects.toBeInstanceOf(ORPCError);
      expect(prisma.userProfile.upsert).not.toHaveBeenCalled();
    },
  );

  it('stores the designed Profile notification toggles', async () => {
    const prisma = createPrismaMock({
      healthCategories: [],
      pointsBalance: 0,
      currentStreakDays: 0,
      timeZone: 'UTC',
      reminderEnabled: true,
      evidenceRemindersEnabled: false,
      promotionalMessagesEnabled: true,
      showOnLeaderboard: false,
      membershipActive: true,
    });
    const service = new MeService(prisma as never, createEnrollmentsMock() as never);

    await expect(
      service.updateNotificationSettings(user, {
        reminderEnabled: true,
        evidenceRemindersEnabled: false,
        promotionalMessagesEnabled: true,
        showOnLeaderboard: false,
        inProgressNudgeEnabled: true,
        inProgressNudgeDelayMinutes: 30,
      }),
    ).resolves.toMatchObject({
      reminderEnabled: true,
      evidenceRemindersEnabled: false,
      promotionalMessagesEnabled: true,
      showOnLeaderboard: false,
      inProgressNudgeEnabled: true,
      inProgressNudgeDelayMinutes: 30,
    });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: {
        userId: 'u1',
        reminderEnabled: true,
        evidenceRemindersEnabled: false,
        promotionalMessagesEnabled: true,
        showOnLeaderboard: false,
        inProgressNudgeEnabled: true,
        inProgressNudgeDelayMinutes: 30,
      },
      update: {
        reminderEnabled: true,
        evidenceRemindersEnabled: false,
        promotionalMessagesEnabled: true,
        showOnLeaderboard: false,
        inProgressNudgeEnabled: true,
        inProgressNudgeDelayMinutes: 30,
      },
    });
  });
});
