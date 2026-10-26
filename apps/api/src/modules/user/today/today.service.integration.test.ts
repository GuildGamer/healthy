import type { PrismaClient } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import '../../../load-env.js';
import { createTestPrismaClient, resetDatabase } from '../../../../test/integration-db.js';
import { dayKeyFor, previousDayKey } from '../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { TodayService } from './today.service.js';

const user = { id: 'u-today', email: 'ada@example.com', name: 'Ada' };
const HOUR_MS = 60 * 60 * 1000;

let prisma: PrismaClient;
let today: TodayService;

async function seedUser(): Promise<void> {
  await prisma.user.create({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      updatedAt: new Date(),
      profile: { create: { timeZone: 'UTC' } },
    },
  });
}

async function seedChallenges(): Promise<{ readingId: string; pushupsId: string }> {
  const reading = await prisma.challenge.create({
    data: {
      slug: 'check-blood-pressure',
      title: 'Check your blood pressure',
      description: 'Log a reading.',
      category: 'hypertension',
      rewardPoints: 150,
      completionKind: 'vitals_bp',
      captureKind: 'structured_log',
    },
  });
  const pushups = await prisma.challenge.create({
    data: {
      slug: 'twenty-push-ups',
      title: 'Do 5 push-ups',
      description: 'Counted on-device.',
      category: 'general',
      rewardPoints: 150,
      captureKind: 'device_session',
      deviceMetric: 'pushups',
      targetCount: 5,
    },
  });

  return { readingId: reading.id, pushupsId: pushups.id };
}

async function seedOccurrence(
  challengeId: string,
  periodKey: string,
  completedAt: Date | null = null,
): Promise<string> {
  const enrollment = await prisma.challengeEnrollment.upsert({
    where: { userId_challengeId: { userId: user.id, challengeId } },
    create: { userId: user.id, challengeId, frequency: 'daily' },
    update: {},
    select: { id: true },
  });
  const occurrence = await prisma.userChallenge.create({
    data: {
      userId: user.id,
      challengeId,
      enrollmentId: enrollment.id,
      periodKey,
      status: completedAt ? 'completed' : 'pending',
      completedAt,
    },
  });
  return occurrence.id;
}

async function seedPushupLog(
  count: number,
  source: 'in_app_pose' | 'manual',
  endedAt: Date,
): Promise<void> {
  await prisma.deviceActivityLog.create({
    data: {
      userId: user.id,
      source,
      metric: 'pushups',
      count,
      durationSeconds: 60,
      startedAt: endedAt,
      endedAt,
      externalId: `${source}:${count}:${endedAt.toISOString()}`,
    },
  });
}

beforeAll(() => {
  prisma = createTestPrismaClient();
  today = new TodayService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('TodayService against Postgres', () => {
  it('reads every card’s details from history, without the readings themselves', async () => {
    const now = new Date();
    const dayKey = dayKeyFor('UTC', now);
    const threeDaysAgo = new Date(now.getTime() - 72 * HOUR_MS);
    await seedUser();
    const { readingId, pushupsId } = await seedChallenges();
    const readingToday = await seedOccurrence(readingId, dayKey);
    const pushupsToday = await seedOccurrence(pushupsId, dayKey);
    await seedOccurrence(readingId, dayKeyFor('UTC', threeDaysAgo), threeDaysAgo);
    await seedPushupLog(14, 'in_app_pose', now);
    await seedPushupLog(9, 'in_app_pose', now);
    await seedPushupLog(50, 'manual', now);

    const details = await today.details(user, now);
    const byId = new Map(details.occurrences.map((detail) => [detail.userChallengeId, detail]));

    expect(details).toMatchObject({
      dayKey,
      weekStartKey: periodKeyFor('weekly', 'UTC', now),
    });
    expect(byId.get(readingToday)).toMatchObject({
      lastCompletedDayKey: dayKeyFor('UTC', threeDaysAgo),
      bestMeasuredInPeriod: null,
      completedAt: null,
    });
    expect(byId.get(pushupsToday)).toMatchObject({
      lastCompletedDayKey: null,
      bestMeasuredInPeriod: 14,
      activeDayKeys: [dayKey],
    });
    expect(JSON.stringify(details)).not.toMatch(/systolic|diastolic/);
  });

  it('leaves yesterday’s sets out of today’s progress', async () => {
    const now = new Date();
    const dayKey = dayKeyFor('UTC', now);
    await seedUser();
    const { pushupsId } = await seedChallenges();
    const pushupsToday = await seedOccurrence(pushupsId, dayKey);
    await seedPushupLog(18, 'in_app_pose', new Date(`${previousDayKey(dayKey)}T12:00:00.000Z`));

    const details = await today.details(user, now);

    expect(details.occurrences).toEqual([
      expect.objectContaining({ userChallengeId: pushupsToday, bestMeasuredInPeriod: null }),
    ]);
  });
});
