import type { PrismaClient } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../load-env.js';
import { createTestPrismaClient, resetDatabase } from '../../../../test/integration-db.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { ChallengesService } from '../challenges/challenges.service.js';
import { StreakService } from '../streak/index.js';
import { TodayService } from '../today/today.service.js';
import { PracticeService } from './practice.service.js';

const user = { id: 'u-partial', email: 'ada@example.com', name: 'Ada' };

let prisma: PrismaClient;
let practice: PracticeService;
let challenges: ChallengesService;
let today: TodayService;

async function seedWalkOccurrence(): Promise<string> {
  await prisma.user.create({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      updatedAt: new Date(),
      profile: { create: { timeZone: 'UTC' } },
    },
  });
  const walk = await prisma.challenge.create({
    data: {
      slug: 'ten-minute-walk',
      title: 'Take a ten-minute walk',
      description: 'Move for ten minutes.',
      category: 'general',
      rewardPoints: 150,
      captureKind: 'device_session',
      deviceMetric: 'walk',
      targetDurationMinutes: 10,
    },
  });
  const enrollment = await prisma.challengeEnrollment.create({
    data: { userId: user.id, challengeId: walk.id, frequency: 'daily' },
  });
  const occurrence = await prisma.userChallenge.create({
    data: {
      userId: user.id,
      challengeId: walk.id,
      enrollmentId: enrollment.id,
      periodKey: periodKeyFor('daily', 'UTC', new Date()),
      status: 'in_progress',
      startedAt: new Date(),
    },
  });
  return occurrence.id;
}

function walkSession(occurrenceId: string, startedAt: Date, durationSeconds: number) {
  return {
    metric: 'walk',
    source: 'in_app_gps',
    durationSeconds,
    distanceMeters: durationSeconds,
    startedAt: startedAt.toISOString(),
    endedAt: new Date(startedAt.getTime() + durationSeconds * 1000).toISOString(),
    externalId: `in-app-gps:${occurrenceId}:${startedAt.toISOString()}`,
  } as const;
}

beforeAll(() => {
  prisma = createTestPrismaClient();
  const streak = new StreakService(prisma);
  const matches = { creditPosePractice: vi.fn(async () => [] as string[]) };
  practice = new PracticeService(prisma, streak, matches as never);
  challenges = new ChallengesService(prisma, practice, streak, undefined, () => 1);
  today = new TodayService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('saving a session that fell short', () => {
  it('fills the card without completing the challenge or awarding points', async () => {
    const occurrenceId = await seedWalkOccurrence();
    const startedAt = new Date(Date.now() - 10 * 60 * 1000);

    await practice.record(user, walkSession(occurrenceId, startedAt, 252));
    await practice.record(user, walkSession(occurrenceId, startedAt, 252));

    const details = await today.details(user);
    expect(details.occurrences[0]).toMatchObject({
      userChallengeId: occurrenceId,
      bestMeasuredInPeriod: 4,
    });
    expect(await prisma.deviceActivityLog.count()).toBe(1);
    expect(await prisma.pointLedgerEntry.count()).toBe(0);
    expect(
      await prisma.userChallenge.findUniqueOrThrow({ where: { id: occurrenceId } }),
    ).toMatchObject({
      status: 'in_progress',
      completedAt: null,
    });
  });

  it('becomes one session when the same walk is walked on and finished', async () => {
    const occurrenceId = await seedWalkOccurrence();
    const startedAt = new Date(Date.now() - 15 * 60 * 1000);
    await practice.record(user, walkSession(occurrenceId, startedAt, 252));

    const finished = walkSession(occurrenceId, startedAt, 640);
    await challenges.complete(user, occurrenceId, undefined, undefined, undefined, finished);

    const logs = await prisma.deviceActivityLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ userChallengeId: occurrenceId, durationSeconds: 640 });
    expect(await prisma.pointLedgerEntry.count()).toBe(1);

    await practice.record(user, walkSession(occurrenceId, startedAt, 252));
    expect(await prisma.deviceActivityLog.findFirstOrThrow()).toMatchObject({
      durationSeconds: 640,
    });
  });
});
