import type { ChallengeCompletionKind, ChallengeFrequency, PrismaClient } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import '../../../load-env.js';
import { createTestPrismaClient, resetDatabase } from '../../../../test/integration-db.js';
import { previousDayKey } from '../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { MeService } from '../me/me.service.js';
import { RemindersService } from '../reminders/reminders.service.js';
import { StreakService } from '../streak/index.js';
import { TodayService } from '../today/today.service.js';
import { ChallengesService } from './challenges.service.js';

const user = { id: 'u-integration', email: 'ada@example.com', name: 'Ada' };

let prisma: PrismaClient;
let challenges: ChallengesService;
let streak: StreakService;
let enrollments: EnrollmentsService;
let me: MeService;
let todayDetails: TodayService;

type CatalogSpec = {
  slug: string;
  defaultFrequency?: ChallengeFrequency;
  isDefault?: boolean;
  rewardPoints?: number;
  completionKind?: ChallengeCompletionKind;
  surpriseEvidenceChancePercent?: number;
  surpriseEvidencePenaltyPoints?: number;
};

async function seedUser(timeZone = 'UTC'): Promise<void> {
  await prisma.user.create({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      updatedAt: new Date(),
      profile: {
        create: { healthCategories: ['general'], timeZone },
      },
    },
  });
}

async function seedCatalog(specs: CatalogSpec[]): Promise<void> {
  await prisma.challenge.createMany({
    data: specs.map((spec) => ({
      slug: spec.slug,
      title: `Challenge ${spec.slug}`,
      description: 'Do the thing.',
      category: 'general' as const,
      rewardPoints: spec.rewardPoints ?? 20,
      defaultFrequency: spec.defaultFrequency ?? 'daily',
      isDefault: spec.isDefault ?? true,
      completionKind: spec.completionKind ?? 'check_in',
      instruction: spec.completionKind === 'vitals_bp' ? 'Sit still and log your reading.' : '',
      surpriseEvidenceChancePercent: spec.surpriseEvidenceChancePercent ?? 0,
      surpriseEvidencePenaltyPoints: spec.surpriseEvidencePenaltyPoints ?? 25,
    })),
  });
}

/** The shape a user lands in after onboarding: profile plus a starter set. */
async function seedEnrolledUser(specs: CatalogSpec[]): Promise<void> {
  await seedUser();
  await seedCatalog(specs);
  await enrollments.enrollDefaultsFor(user.id, ['general']);
}

function dailySpecs(count: number): CatalogSpec[] {
  return Array.from({ length: count }, (_unused, index) => ({
    slug: `daily-${index}`,
  }));
}

beforeAll(() => {
  prisma = createTestPrismaClient();
  streak = new StreakService(prisma);
  challenges = new ChallengesService(prisma, streak);
  enrollments = new EnrollmentsService(prisma, new RemindersService(prisma));
  me = new MeService(prisma, enrollments);
  todayDetails = new TodayService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('ChallengesService against Postgres', () => {
  it('creates each occurrence once, however many times the list is read', async () => {
    await seedEnrolledUser(dailySpecs(3));

    await challenges.listToday(user);
    const second = await challenges.listToday(user);

    const stored = await prisma.userChallenge.count({
      where: { userId: user.id },
    });
    expect(stored).toBe(3);
    expect(second.challenges).toHaveLength(3);
    expect(second.completedCount).toBe(0);
  });

  it('lists exactly what the user is enrolled in, not the whole catalog', async () => {
    await seedUser();
    await seedCatalog([
      { slug: 'starter-a' },
      { slug: 'starter-b' },
      { slug: 'optional', isDefault: false },
    ]);
    await enrollments.enrollDefaultsFor(user.id, ['general']);

    const today = await challenges.listToday(user);

    expect(today.totalCount).toBe(2);
    expect(today.challenges.map((challenge) => challenge.title).sort()).toEqual([
      'Challenge starter-a',
      'Challenge starter-b',
    ]);
  });

  it('shows a challenge only after the user opts into it', async () => {
    await seedUser();
    await seedCatalog([{ slug: 'optional', isDefault: false }]);
    const catalog = await enrollments.listCatalog(user);
    const optional = catalog.challenges[0]!;

    expect((await challenges.listToday(user)).totalCount).toBe(0);

    await enrollments.setEnrollment(user, optional.challengeId, true);

    expect((await challenges.listToday(user)).totalCount).toBe(1);
  });

  it('stops creating occurrences after opting out but keeps the history', async () => {
    await seedEnrolledUser(dailySpecs(1));
    const [existing] = (await challenges.listToday(user)).challenges;
    await challenges.complete(user, existing!.id);

    const catalog = await enrollments.listCatalog(user);
    await enrollments.setEnrollment(user, catalog.challenges[0]!.challengeId, false);

    // The completed occurrence still belongs to today's period, so it stays
    // visible; what stops is the creation of anything new.
    const stored = await prisma.userChallenge.count({
      where: { userId: user.id },
    });
    expect(stored).toBe(1);
    await expect(me.getMe(user)).resolves.toMatchObject({ pointsBalance: 20 });
    expect((await challenges.listToday(user)).totalCount).toBe(1);
  });

  it('drops an unfinished card from today once the challenge is removed', async () => {
    await seedEnrolledUser(dailySpecs(2));
    const [removed, kept] = (await challenges.listToday(user)).challenges;

    await enrollments.setEnrollment(user, removed!.challengeId, false);

    const today = await challenges.listToday(user);
    expect(today.challenges.map((challenge) => challenge.id)).toEqual([kept!.id]);
    const details = await todayDetails.details(user);
    expect(details.occurrences.map((occurrence) => occurrence.userChallengeId)).toEqual([
      kept!.id,
    ]);
  });

  it('brings back the same card when a removed challenge is added again that day', async () => {
    await seedEnrolledUser(dailySpecs(1));
    const [original] = (await challenges.listToday(user)).challenges;
    const challengeId = original!.challengeId;

    await enrollments.setEnrollment(user, challengeId, false);
    expect((await challenges.listToday(user)).totalCount).toBe(0);

    await enrollments.setEnrollment(user, challengeId, true);
    const [restored] = (await challenges.listToday(user)).challenges;
    expect(restored?.id).toBe(original!.id);
  });

  it('awards points exactly once when a completion is retried', async () => {
    await seedEnrolledUser(dailySpecs(3));
    const [first] = (await challenges.listToday(user)).challenges;

    const initial = await challenges.complete(user, first!.id);
    const retried = await challenges.complete(user, first!.id);

    expect(initial.pointsAwarded).toBe(20);
    expect(retried.pointsAwarded).toBe(0);
    expect(retried.pointsBalance).toBe(20);

    const ledgerEntries = await prisma.pointLedgerEntry.count({
      where: { userId: user.id },
    });
    expect(ledgerEntries).toBe(1);

    const inboxRows = await prisma.notification.findMany({
      where: { userId: user.id },
    });
    expect(inboxRows).toHaveLength(1);
    expect(inboxRows[0]).toMatchObject({
      kind: 'success',
      payload: {
        userChallengeId: first!.id,
        points: '20',
        streak: '1',
        metric: 'other',
      },
    });

    const profile = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(profile.pointsBalance).toBe(20);
  });

  it('moves a challenge through start and finish, stamping both times', async () => {
    await seedEnrolledUser(dailySpecs(3));
    const [first] = (await challenges.listToday(user)).challenges;

    const started = await challenges.start(user, first!.id);
    expect(started.challenge.status).toBe('in_progress');

    await challenges.complete(user, first!.id);

    const stored = await prisma.userChallenge.findUniqueOrThrow({
      where: { id: first!.id },
    });
    expect(stored.status).toBe('completed');
    expect(stored.startedAt).toBeInstanceOf(Date);
    expect(stored.completedAt).toBeInstanceOf(Date);
  });

  it('starts the streak at one on the first ever completion', async () => {
    await seedEnrolledUser(dailySpecs(3));
    const [first] = (await challenges.listToday(user)).challenges;

    const result = await challenges.complete(user, first!.id);

    expect(result.currentStreakDays).toBe(1);
    await expect(me.getMe(user)).resolves.toMatchObject({
      currentStreakDays: 1,
      pointsBalance: 20,
    });
  });

  it('reports a broken streak as zero while keeping the points', async () => {
    await seedEnrolledUser(dailySpecs(3));
    const [first] = (await challenges.listToday(user)).challenges;
    await challenges.complete(user, first!.id);

    // Backdate the active day so today is well past the streak's grace day.
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { lastActiveDayKey: '2020-01-01' },
    });

    await expect(me.getMe(user)).resolves.toMatchObject({
      currentStreakDays: 0,
      pointsBalance: 20,
    });
  });

  it('anchors a weekly occurrence to the Monday of the current week', async () => {
    await seedEnrolledUser([{ slug: 'weekly-review', defaultFrequency: 'weekly' }]);

    const [weekly] = (await challenges.listToday(user)).challenges;

    expect(weekly!.frequency).toBe('weekly');
    expect(new Date(`${weekly!.periodKey}T00:00:00.000Z`).getUTCDay()).toBe(1);
  });

  it('moves Today onto the new cadence after a frequency change', async () => {
    await seedEnrolledUser([{ slug: 'pushups', defaultFrequency: 'monthly' }]);
    const [monthly] = (await challenges.listToday(user)).challenges;
    expect(monthly!.frequency).toBe('monthly');

    await enrollments.setEnrollment(user, monthly!.challengeId, true, 'daily');

    const after = await challenges.listToday(user);
    expect(after.challenges).toHaveLength(1);
    expect(after.challenges[0]).toMatchObject({
      challengeId: monthly!.challengeId,
      frequency: 'daily',
      id: monthly!.id,
      periodKey: periodKeyFor('daily', 'UTC'),
    });
  });

  it('counts the day when a weekly challenge is completed', async () => {
    await seedEnrolledUser([{ slug: 'weekly-review', defaultFrequency: 'weekly' }]);
    const [weekly] = (await challenges.listToday(user)).challenges;

    const result = await challenges.complete(user, weekly!.id);

    expect(result.pointsAwarded).toBe(20);
    expect(result.currentStreakDays).toBe(1);
  });

  it('continues a streak that a practice session kept alive yesterday', async () => {
    await seedEnrolledUser(dailySpecs(1));
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { currentStreakDays: 4, lastActiveDayKey: previousDayKey(periodKeyFor('daily', 'UTC')) },
    });
    const [first] = (await challenges.listToday(user)).challenges;

    const result = await challenges.complete(user, first!.id);

    expect(result.currentStreakDays).toBe(5);
    await expect(me.getMe(user)).resolves.toMatchObject({
      currentStreakDays: 5,
      bestStreakDays: 5,
    });
  });

  it('counts the day once when practice and a completion share it', async () => {
    await seedEnrolledUser(dailySpecs(1));
    const [first] = (await challenges.listToday(user)).challenges;

    await streak.recordActiveDay(user.id);
    const result = await challenges.complete(user, first!.id);

    expect(result.currentStreakDays).toBe(1);
  });

  it('counts the day once when both cadences are finished', async () => {
    await seedEnrolledUser([
      { slug: 'daily-walk' },
      { slug: 'monthly-refill', defaultFrequency: 'monthly' },
    ]);
    const listed = (await challenges.listToday(user)).challenges;
    const daily = listed.find((item) => item.frequency === 'daily')!;
    const monthly = listed.find((item) => item.frequency === 'monthly')!;

    await challenges.complete(user, monthly.id);
    const afterDaily = await challenges.complete(user, daily.id);

    expect(afterDaily.currentStreakDays).toBe(1);
  });

  it('requires and stores a blood-pressure reading on complete', async () => {
    await seedEnrolledUser([{ slug: 'check-bp', completionKind: 'vitals_bp' }]);
    const [assignment] = (await challenges.listToday(user)).challenges;

    expect(assignment?.completionKind).toBe('vitals_bp');
    await expect(challenges.complete(user, assignment!.id)).rejects.toThrow(/blood pressure/);

    const result = await challenges.complete(user, assignment!.id, {
      systolic: 120,
      diastolic: 80,
      pulse: 70,
      notes: 'Morning',
    });

    expect(result.pointsAwarded).toBe(20);
    await expect(
      prisma.vitalReading.findUniqueOrThrow({
        where: { userChallengeId: assignment!.id },
      }),
    ).resolves.toMatchObject({
      systolic: 120,
      diastolic: 80,
      pulse: 70,
      notes: 'Morning',
    });
  });

  it('requires a gym photo on complete', async () => {
    await seedEnrolledUser([{ slug: 'gym-session', completionKind: 'evidence_photo' }]);
    const [assignment] = (await challenges.listToday(user)).challenges;

    expect(assignment?.completionKind).toBe('evidence_photo');
    await expect(challenges.complete(user, assignment!.id)).rejects.toThrow(/gym photo/);

    const result = await challenges.complete(user, assignment!.id, undefined, {
      mimeType: 'image/jpeg',
      imageBase64: 'a'.repeat(32),
    });

    expect(result.pointsAwarded).toBe(20);
  });

  it('opens a surprise photo window when the challenge chance is 100', async () => {
    await seedEnrolledUser([
      {
        slug: 'always-photo',
        surpriseEvidenceChancePercent: 100,
        surpriseEvidencePenaltyPoints: 10,
        rewardPoints: 40,
      },
    ]);
    const [assignment] = (await challenges.listToday(user)).challenges;

    const requested = await challenges.complete(user, assignment!.id);

    expect(requested.pointsAwarded).toBe(0);
    expect(requested.challenge.status).toBe('awaiting_evidence');
    expect(requested.evidenceRequest?.penaltyPoints).toBe(10);

    const submitted = await challenges.complete(user, assignment!.id, undefined, {
      mimeType: 'image/jpeg',
      imageBase64: 'a'.repeat(32),
    });

    expect(submitted.pointsAwarded).toBe(40);
    expect(submitted.challenge.status).toBe('completed');
    expect(submitted.evidenceRequest).toBeNull();
  });

  it('applies a penalty when the surprise photo is skipped', async () => {
    await seedUser();
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { pointsBalance: 50 },
    });
    await seedCatalog([
      {
        slug: 'skip-photo',
        surpriseEvidenceChancePercent: 100,
        surpriseEvidencePenaltyPoints: 10,
      },
    ]);
    await enrollments.enrollDefaultsFor(user.id, ['general']);
    const [assignment] = (await challenges.listToday(user)).challenges;
    await challenges.complete(user, assignment!.id);

    const skipped = await challenges.skipEvidence(user, assignment!.id);

    expect(skipped.penaltyApplied).toBe(10);
    expect(skipped.pointsAwarded).toBe(0);
    expect(skipped.pointsBalance).toBe(40);
    expect(skipped.challenge.status).toBe('completed');
    expect(skipped.currentStreakDays).toBe(0);
  });

  it('keeps an in-progress challenge visible after the categories change', async () => {
    await seedEnrolledUser(dailySpecs(3));
    const [first] = (await challenges.listToday(user)).challenges;
    await challenges.start(user, first!.id);

    await me.updateCategories(user, ['asthma']);
    const afterChange = await challenges.listToday(user);

    expect(afterChange.challenges.find((challenge) => challenge.id === first!.id)).toMatchObject({
      status: 'in_progress',
    });
  });

  it('lists past completions for one challenge, newest first', async () => {
    await seedEnrolledUser([{ slug: 'walk' }, { slug: 'water' }]);
    const today = await challenges.listToday(user);
    const walk = today.challenges.find((item) => item.title.includes('walk'))!;
    const water = today.challenges.find((item) => item.title.includes('water'))!;

    await challenges.complete(user, walk.id);
    await challenges.complete(user, water.id);

    const history = await challenges.listHistory(user, walk.challengeId);

    expect(history.challengeId).toBe(walk.challengeId);
    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]).toMatchObject({
      id: walk.id,
      periodKey: walk.periodKey,
      outcome: 'rewarded',
      pointsDelta: 20,
      log: { kind: 'check_in' },
      evidence: null,
    });
    expect(history.entries[0]?.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes the stored blood-pressure reading on a history row', async () => {
    await seedEnrolledUser([{ slug: 'check-bp', completionKind: 'vitals_bp' }]);
    const [assignment] = (await challenges.listToday(user)).challenges;
    await challenges.complete(user, assignment!.id, {
      systolic: 120,
      diastolic: 80,
      pulse: 70,
      notes: 'Morning',
    });

    const history = await challenges.listHistory(user, assignment!.challengeId);

    expect(history.entries[0]?.log).toEqual({
      kind: 'vitals_bp',
      systolic: 120,
      diastolic: 80,
      pulse: 70,
      notes: 'Morning',
    });
  });

  it('records a skipped photo check as a penalized history row', async () => {
    await seedUser();
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { pointsBalance: 50 },
    });
    await seedCatalog([
      {
        slug: 'history-skip',
        surpriseEvidenceChancePercent: 100,
        surpriseEvidencePenaltyPoints: 10,
      },
    ]);
    await enrollments.enrollDefaultsFor(user.id, ['general']);
    const [assignment] = (await challenges.listToday(user)).challenges;
    await challenges.complete(user, assignment!.id);
    await challenges.skipEvidence(user, assignment!.id);

    const history = await challenges.listHistory(user, assignment!.challengeId);

    expect(history.entries[0]).toMatchObject({
      outcome: 'penalized',
      pointsDelta: -10,
      evidence: 'skipped',
    });
  });

  it('returns an empty history when the challenge has not been finished', async () => {
    await seedEnrolledUser([{ slug: 'fresh' }]);
    const [assignment] = (await challenges.listToday(user)).challenges;

    await expect(challenges.listHistory(user, assignment!.challengeId)).resolves.toEqual({
      challengeId: assignment!.challengeId,
      entries: [],
    });
  });

  it('holds a walk to the minutes its walker chose, on Today and at the finish', async () => {
    await seedUser();
    const walk = await prisma.challenge.create({
      data: {
        slug: 'ten-minute-walk',
        title: 'Take a ten-minute walk',
        description: 'Walk.',
        category: 'general',
        rewardPoints: 150,
        captureKind: 'device_session',
        deviceMetric: 'walk',
        targetDurationMinutes: 10,
      },
    });
    await enrollments.setEnrollment(user, walk.id, true, undefined, { targetDurationMinutes: 20 });
    const walkOf = (minutes: number) => ({
      source: 'in_app_gps' as const,
      metric: 'walk' as const,
      durationSeconds: minutes * 60,
    });

    const catalog = await enrollments.listCatalog(user);
    const [occurrence] = (await challenges.listToday(user)).challenges;

    expect(catalog.challenges[0]?.capture.target.durationMinutes).toBe(20);
    expect(occurrence?.capture.target.durationMinutes).toBe(20);
    await expect(
      challenges.complete(user, occurrence!.id, undefined, undefined, undefined, walkOf(15)),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const finished = await challenges.complete(
      user,
      occurrence!.id,
      undefined,
      undefined,
      undefined,
      walkOf(21),
    );
    expect(finished.pointsAwarded).toBe(150);
  });
});
