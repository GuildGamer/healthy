import type { PrismaClient, UserChallengeCompletionOutcome } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import '../../../load-env.js';
import { createTestPrismaClient, resetDatabase } from '../../../../test/integration-db.js';
import { dayKeyFor, previousDayKey } from '../../../shared/utils/day-key.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { RemindersService } from '../reminders/reminders.service.js';
import { MeService } from './me.service.js';

const user = { id: 'u-me', email: 'ada@example.com', name: 'Ada' };

let prisma: PrismaClient;
let me: MeService;

function daysAgoKey(days: number): string {
  let key = dayKeyFor('UTC');
  for (let index = 0; index < days; index += 1) {
    key = previousDayKey(key);
  }
  return key;
}

async function seedDailyCompletions(
  challengeId: string,
  days: readonly number[],
  completionOutcome: UserChallengeCompletionOutcome | null,
): Promise<void> {
  await prisma.userChallenge.createMany({
    data: days.map((daysAgo) => ({
      userId: user.id,
      challengeId,
      periodKey: daysAgoKey(daysAgo),
      frequency: 'daily' as const,
      status: 'completed' as const,
      completionOutcome,
      completedAt: new Date(`${daysAgoKey(daysAgo)}T12:00:00.000Z`),
    })),
  });
}

beforeAll(() => {
  prisma = createTestPrismaClient();
  me = new MeService(prisma, new EnrollmentsService(prisma, new RemindersService(prisma)));
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('MeService against Postgres', () => {
  it('finds the best run across challenges, counting legacy rows but not penalized days', async () => {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        updatedAt: new Date(),
        profile: {
          create: { timeZone: 'UTC', currentStreakDays: 3, lastActiveDayKey: daysAgoKey(2) },
        },
      },
    });
    const [walk, water] = await Promise.all(
      ['walk', 'water'].map((slug) =>
        prisma.challenge.create({
          data: { slug, title: slug, description: slug, category: 'general', rewardPoints: 10 },
        }),
      ),
    );
    await seedDailyCompletions(walk!.id, [20, 19, 18], 'rewarded');
    await seedDailyCompletions(water!.id, [18, 17], null);
    await seedDailyCompletions(water!.id, [16], 'penalized');
    await seedDailyCompletions(walk!.id, [15, 14], 'rewarded');
    await seedDailyCompletions(walk!.id, [2], 'rewarded');

    await expect(me.getMe(user)).resolves.toMatchObject({
      currentStreakDays: 0,
      streakLapsedYesterday: true,
      bestStreakDays: 4,
    });
  });
});
