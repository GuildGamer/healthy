import type { PrismaClient } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import '../../../load-env.js';
import { createTestPrismaClient, resetDatabase } from '../../../../test/integration-db.js';
import { ProgressService } from './progress.service.js';

const user = { id: 'u-progress', email: 'ada@example.com', name: 'Ada' };
const now = new Date('2026-10-22T12:00:00.000Z');
const TODAY = '2026-10-22';
const YESTERDAY = '2026-10-21';

let prisma: PrismaClient;
let progress: ProgressService;

async function seedUser(createdAt: Date): Promise<void> {
  await prisma.user.create({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt,
      updatedAt: createdAt,
      profile: { create: { timeZone: 'UTC' } },
    },
  });
}

async function seedChallenge(slug: string, completionKind: 'check_in' | 'vitals_bp') {
  return prisma.challenge.create({
    data: {
      slug,
      title: slug === 'bp' ? 'Check your blood pressure' : 'Gym session',
      description: 'Do the thing.',
      category: slug === 'bp' ? 'hypertension' : 'general',
      rewardPoints: 150,
      completionKind,
    },
  });
}

async function seedOccurrence(input: {
  challengeId: string;
  periodKey: string;
  completedAt?: Date;
  outcome?: 'rewarded' | 'penalized';
}): Promise<string> {
  const occurrence = await prisma.userChallenge.create({
    data: {
      userId: user.id,
      challengeId: input.challengeId,
      periodKey: input.periodKey,
      status: input.completedAt ? 'completed' : 'pending',
      completedAt: input.completedAt ?? null,
      completionOutcome: input.outcome ?? null,
    },
  });
  return occurrence.id;
}

async function seedLedger(delta: number, createdAt: Date, userChallengeId: string | null) {
  await prisma.pointLedgerEntry.create({
    data: {
      userId: user.id,
      delta,
      reason: userChallengeId ? 'Completed' : 'Welcome bonus',
      idempotencyKey: `${delta}:${createdAt.toISOString()}:${userChallengeId ?? 'bonus'}`,
      userChallengeId,
      createdAt,
    },
  });
}

beforeAll(() => {
  prisma = createTestPrismaClient();
  progress = new ProgressService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('ProgressService against Postgres', () => {
  it('lists every day since joining, newest first, with what each day held', async () => {
    await seedUser(new Date('2026-10-20T09:00:00.000Z'));
    const bp = await seedChallenge('bp', 'vitals_bp');
    const gym = await seedChallenge('gym', 'check_in');
    const reading = await seedOccurrence({
      challengeId: bp.id,
      periodKey: YESTERDAY,
      completedAt: new Date('2026-10-21T08:10:00.000Z'),
      outcome: 'rewarded',
    });
    await prisma.vitalReading.create({
      data: { userChallengeId: reading, systolic: 187, diastolic: 123 },
    });
    const missed = await seedOccurrence({
      challengeId: gym.id,
      periodKey: YESTERDAY,
      completedAt: new Date('2026-10-21T18:30:00.000Z'),
      outcome: 'penalized',
    });
    await seedLedger(150, new Date('2026-10-21T08:10:00.000Z'), reading);
    await seedLedger(-100, new Date('2026-10-21T18:40:00.000Z'), missed);
    await seedOccurrence({ challengeId: bp.id, periodKey: TODAY });

    const result = await progress.days(user, now);

    expect(result).toMatchObject({
      dayKey: TODAY,
      weekStartKey: '2026-10-19',
      joinedDayKey: '2026-10-20',
    });
    expect(result.days.map((day) => day.dayKey)).toEqual([TODAY, YESTERDAY, '2026-10-20']);
    expect(result.days[1]).toMatchObject({ pointsTotal: 50, pointsLost: 100, isShownUp: true });
    expect(result.days[1]?.dailyChallenges.map((challenge) => challenge.isDone)).toEqual([
      true,
      false,
    ]);
    expect(result.days[0]).toMatchObject({ pointsTotal: 0, isShownUp: false });
    expect(JSON.stringify(result)).not.toContain('187');
  });

  it('marks a day shown up when a contest or practice set was logged', async () => {
    await seedUser(new Date('2026-10-20T09:00:00.000Z'));
    await prisma.deviceActivityLog.create({
      data: {
        userId: user.id,
        source: 'in_app_pose',
        metric: 'pushups',
        count: 12,
        createdAt: new Date('2026-10-22T10:00:00.000Z'),
      },
    });

    const result = await progress.days(user, now);

    expect(result.days[0]).toMatchObject({ dayKey: TODAY, isShownUp: true, pointsTotal: 0 });
  });

  it('reaches back six weeks at most for an older account', async () => {
    await seedUser(new Date('2026-01-01T09:00:00.000Z'));

    const result = await progress.days(user, now);

    expect(result.joinedDayKey).toBe('2026-01-01');
    expect(result.days).toHaveLength(42);
    expect(result.days.at(-1)?.dayKey).toBe('2026-09-11');
  });

  it('opens a day with what was done, the photo check missed, and practice', async () => {
    await seedUser(new Date('2026-10-01T09:00:00.000Z'));
    const bp = await seedChallenge('bp', 'vitals_bp');
    const gym = await seedChallenge('gym', 'check_in');
    const reading = await seedOccurrence({
      challengeId: bp.id,
      periodKey: YESTERDAY,
      completedAt: new Date('2026-10-21T08:10:00.000Z'),
      outcome: 'rewarded',
    });
    await prisma.vitalReading.create({
      data: { userChallengeId: reading, systolic: 187, diastolic: 123 },
    });
    const missed = await seedOccurrence({
      challengeId: gym.id,
      periodKey: YESTERDAY,
      completedAt: new Date('2026-10-21T18:30:00.000Z'),
      outcome: 'penalized',
    });
    await prisma.surpriseEvidenceRequest.create({
      data: {
        userChallengeId: missed,
        windowSeconds: 600,
        penaltyPoints: 100,
        expiresAt: new Date('2026-10-21T18:40:00.000Z'),
        status: 'skipped',
      },
    });
    await seedLedger(150, new Date('2026-10-21T08:10:00.000Z'), reading);
    await seedLedger(-100, new Date('2026-10-21T18:40:00.000Z'), missed);
    await seedLedger(25, new Date('2026-10-21T10:00:00.000Z'), null);
    await seedLedger(500, new Date('2026-10-22T08:00:00.000Z'), null);
    await prisma.deviceActivityLog.create({
      data: {
        userId: user.id,
        source: 'in_app_pose',
        metric: 'pushups',
        count: 14,
        createdAt: new Date('2026-10-21T19:10:00.000Z'),
      },
    });

    const detail = await progress.day(user, YESTERDAY, now);

    expect(detail).toMatchObject({
      dayKey: YESTERDAY,
      pointsEarned: 175,
      pointsLost: 100,
      dailyDoneCount: 1,
      dailyDueCount: 2,
    });
    expect(detail.done).toMatchObject([
      { title: 'Check your blood pressure', points: 150, share: null },
    ]);
    expect(detail.missedPhotoChecks).toMatchObject([
      { title: 'Gym session', resolution: 'skipped', windowSeconds: 600, pointsLost: 100 },
    ]);
    expect(detail.practice).toMatchObject([
      { title: 'Push-up practice', metric: 'pushups', count: 14 },
    ]);
    expect(detail.adjustments).toMatchObject([{ reason: 'Welcome bonus', points: 25 }]);
    expect(JSON.stringify(detail)).not.toContain('187');
  });
});
