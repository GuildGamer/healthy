import type { PrismaClient } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../load-env.js';
import { createTestPrismaClient, resetDatabase } from '../../../../test/integration-db.js';
import { readEnvironment } from '../../shared-modules/config/index.js';
import { PushDevicesService } from '../../shared-modules/push/index.js';
import { CrewsService } from '../crews/index.js';
import { LeaderboardService } from '../leaderboard/leaderboard.service.js';
import { MatchReactionsService } from '../matches/match-reactions.service.js';
import { MatchesService } from '../matches/matches.service.js';
import { AccountDeletionService } from './account-deletion.service.js';

const ada = { id: 'ada', email: 'ada@example.com', name: 'Ada Lovelace' };
const bee = { id: 'bee', email: 'bee@example.com', name: 'Bee Keeper' };
const HOUR_MS = 3_600_000;

let prisma: PrismaClient;
let deletion: AccountDeletionService;
let matches: MatchesService;
let leaderboard: LeaderboardService;

function createMatchesService(client: PrismaClient): MatchesService {
  return new MatchesService(
    client,
    readEnvironment({ WEBSITE_URL: 'https://example.test' }),
    new CrewsService(client),
    { notifySeated: vi.fn() } as never,
    { track: vi.fn().mockResolvedValue({ ok: true }) } as never,
    { notifyHost: vi.fn() } as never,
    { notifyParticipants: vi.fn() } as never,
    new MatchReactionsService(client),
    { notify: vi.fn() } as never,
  );
}

async function seedPeople(): Promise<void> {
  for (const person of [ada, bee]) {
    await prisma.user.create({
      data: {
        ...person,
        emailVerified: true,
        image: `data:image/jpeg;base64,${person.id}`,
        profile: {
          create: {
            displayName: person.name.split(' ')[0],
            countryCode: 'NG',
            timeZone: 'Africa/Lagos',
            healthCategories: ['hypertension'],
            reminderEnabled: true,
          },
        },
      },
    });
  }
}

async function seedAdaPersonalData(): Promise<void> {
  const challenge = await prisma.challenge.create({
    data: {
      slug: 'bp',
      title: 'Blood pressure',
      description: 'bp',
      category: 'hypertension',
      rewardPoints: 50,
      completionKind: 'vitals_bp',
    },
  });
  const enrollment = await prisma.challengeEnrollment.create({
    data: {
      userId: ada.id,
      challengeId: challenge.id,
      frequency: 'daily',
      reminders: { create: { minuteOfDay: 480 } },
    },
  });
  const occurrence = await prisma.userChallenge.create({
    data: {
      userId: ada.id,
      challengeId: challenge.id,
      enrollmentId: enrollment.id,
      periodKey: '2026-10-20',
      status: 'completed',
      completedAt: new Date('2026-10-20T08:00:00.000Z'),
      draft: { systolic: 124 },
      vitalReading: { create: { systolic: 124, diastolic: 81, notes: 'after coffee' } },
    },
  });
  await prisma.pointLedgerEntry.create({
    data: {
      userId: ada.id,
      delta: 50,
      reason: 'challenge_complete',
      idempotencyKey: `complete:${occurrence.id}`,
      userChallengeId: occurrence.id,
    },
  });
  await prisma.pointLedgerEntry.create({
    data: {
      userId: bee.id,
      delta: 40,
      reason: 'challenge_complete',
      idempotencyKey: 'complete:bee',
    },
  });
  await prisma.session.create({
    data: {
      id: 's-ada',
      token: 'token-ada',
      userId: ada.id,
      expiresAt: new Date(Date.now() + 24 * HOUR_MS),
    },
  });
  await prisma.account.create({
    data: {
      id: 'acc-ada',
      issuer: 'local',
      accountId: ada.id,
      providerId: 'credential',
      userId: ada.id,
      password: 'hash',
    },
  });
  await prisma.verification.create({
    data: {
      id: 'v-ada',
      identifier: `forget-password-otp-${ada.email}`,
      value: '123456',
      expiresAt: new Date(Date.now() + HOUR_MS),
    },
  });
  await prisma.waitlistEntry.create({ data: { email: ada.email } });
  await prisma.pushDevice.create({
    data: { userId: ada.id, expoPushToken: 'ExponentPushToken[ada]', platform: 'ios' },
  });
  await prisma.notification.create({
    data: {
      userId: ada.id,
      kind: 'reminder',
      title: 'Time',
      body: 'Check your BP',
      idempotencyKey: 'n-ada',
    },
  });
  await prisma.engagementDelivery.create({
    data: {
      userId: ada.id,
      source: 'habit_slot',
      audience: 'all_devices',
      title: 'Do one now',
      body: 'Got a few minutes?',
      templateKey: 'habit_slot',
      payload: { destination: 'today' },
    },
  });
  await prisma.analyticsEvent.create({ data: { name: 'challenge_completed', userId: ada.id } });
}

/** A contest that ended but nobody has opened since, and one still running. */
async function seedGroups(): Promise<void> {
  const ended = {
    startsAt: new Date(Date.now() - 72 * HOUR_MS),
    endsAt: new Date(Date.now() - HOUR_MS),
  };
  const running = {
    startsAt: new Date(Date.now() - HOUR_MS),
    endsAt: new Date(Date.now() + 72 * HOUR_MS),
  };

  for (const [id, window] of [
    ['m-ended', ended],
    ['m-live', running],
  ] as const) {
    await prisma.match.create({
      data: {
        id,
        hostUserId: bee.id,
        inviteToken: `token-${id}`,
        metric: 'pushups',
        scoringMode: 'best_single',
        ...window,
        participants: {
          create: [
            { userId: bee.id, acceptedAt: window.startsAt },
            { userId: ada.id, acceptedAt: window.startsAt },
          ],
        },
        attempts: {
          create: [
            {
              userId: ada.id,
              count: 30,
              durationSeconds: 60,
              recordedAt: new Date(window.startsAt.getTime() + HOUR_MS / 2),
            },
            {
              userId: bee.id,
              count: 20,
              durationSeconds: 60,
              recordedAt: new Date(window.startsAt.getTime() + HOUR_MS / 2),
            },
          ],
        },
      },
    });
  }

  await prisma.matchReaction.create({
    data: {
      matchId: 'm-live',
      fromUserId: ada.id,
      toUserId: bee.id,
      kind: 'cheer',
      dayKey: '2026-10-22',
    },
  });
  await prisma.crew.create({
    data: { ownerUserId: ada.id, name: 'Ada and Bee', members: { create: [{ userId: bee.id }] } },
  });
  await prisma.crew.create({
    data: {
      id: 'crew-bee',
      ownerUserId: bee.id,
      name: 'Bee and Ada',
      members: { create: [{ userId: ada.id }] },
    },
  });
}

async function seedRenewingPlan(): Promise<void> {
  const plan = await prisma.membershipPlan.upsert({
    where: { slug: 'deletion-test' },
    create: { slug: 'deletion-test', name: 'Healthy', tagline: 'All of it', features: ['All'] },
    update: {},
  });
  await prisma.subscription.create({
    data: {
      userId: ada.id,
      planId: plan.id,
      provider: 'apple',
      providerSubscriptionId: 'apple-original-1',
      providerProductId: 'com.healthyapp.app.premium.month',
      status: 'active',
      autoRenewing: true,
      interval: 'month',
      currency: 'NGN',
      amountMinor: 250_000,
      startedAt: new Date(Date.now() - 24 * HOUR_MS),
      currentPeriodEndsAt: new Date(Date.now() + 29 * 24 * HOUR_MS),
    },
  });
}

beforeAll(() => {
  prisma = createTestPrismaClient();
  deletion = new AccountDeletionService(prisma);
  matches = createMatchesService(prisma);
  leaderboard = new LeaderboardService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.waitlistEntry.deleteMany({});
  await prisma.verification.deleteMany({});
  await seedPeople();
  await seedAdaPersonalData();
  await seedGroups();
});

describe('AccountDeletionService against Postgres', () => {
  it('removes everything that identifies the member and signs them out everywhere', async () => {
    await expect(deletion.deleteAccount(ada)).resolves.toEqual({
      success: true,
      data: { deleted: true },
    });

    const tombstone = await prisma.user.findUniqueOrThrow({
      where: { id: ada.id },
      include: { profile: true },
    });
    expect(tombstone).toMatchObject({
      name: 'Former member',
      email: 'deleted-ada@deleted.invalid',
      image: null,
      emailVerified: false,
    });
    expect(tombstone.profile).toMatchObject({
      displayName: 'Former member',
      countryCode: null,
      healthCategories: [],
      showOnLeaderboard: false,
      reminderEnabled: false,
      groupNotificationsEnabled: false,
    });
    expect(tombstone.profile?.deletedAt).toBeInstanceOf(Date);

    const counts = await Promise.all([
      prisma.session.count({ where: { userId: ada.id } }),
      prisma.account.count({ where: { userId: ada.id } }),
      prisma.verification.count({ where: { identifier: { contains: ada.email } } }),
      prisma.waitlistEntry.count({ where: { email: ada.email } }),
      prisma.pushDevice.count({ where: { userId: ada.id } }),
      prisma.notification.count({ where: { userId: ada.id } }),
      prisma.engagementDelivery.count({ where: { userId: ada.id } }),
      prisma.challengeEnrollment.count({ where: { userId: ada.id } }),
      prisma.challengeReminder.count(),
      prisma.vitalReading.count(),
      prisma.matchReaction.count(),
      prisma.crew.count({ where: { ownerUserId: ada.id } }),
      prisma.analyticsEvent.count({ where: { userId: ada.id } }),
    ]);
    expect(counts.every((count) => count === 0)).toBe(true);

    const occurrence = await prisma.userChallenge.findFirstOrThrow({ where: { userId: ada.id } });
    expect(occurrence.draft).toBeNull();
    expect(occurrence.status).toBe('completed');
    const crewSeat = await prisma.crewMember.findFirstOrThrow({
      where: { crewId: 'crew-bee', userId: ada.id },
    });
    expect(crewSeat.leftAt).toBeInstanceOf(Date);
  });

  it('keeps points history, anonymised, so amounts still add up', async () => {
    await deletion.deleteAccount(ada);

    const ledger = await prisma.pointLedgerEntry.findMany({ where: { userId: ada.id } });
    expect(ledger.map((entry) => entry.delta)).toEqual([50]);
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: ada.id } });
    expect(owner.name).toBe('Former member');
  });

  it('keeps a finished board as it was, with a Former member in their place', async () => {
    await deletion.deleteAccount(ada);

    const board = await matches.get(bee, 'm-ended');
    expect(board.standings.map((row) => [row.displayName, row.score, row.image ?? null])).toEqual([
      ['Former member', 30, null],
      ['Bee', 20, `data:image/jpeg;base64,bee`],
    ]);
    expect(board.winnerUserId).toBe(ada.id);
  });

  it('takes them out of a contest that is still running', async () => {
    await deletion.deleteAccount(ada);

    const board = await matches.get(bee, 'm-live');
    expect(board.standings.map((row) => row.userId)).toEqual([bee.id]);
    expect(await prisma.matchAttempt.count({ where: { matchId: 'm-live', userId: ada.id } })).toBe(
      0,
    );
  });

  it('leaves the weekly leaderboard computing, without the deleted member', async () => {
    await deletion.deleteAccount(ada);

    const board = await leaderboard.list(bee, { period: 'all' });
    expect(board.entries.map((entry) => entry.displayName)).toEqual(['Bee']);
    expect(board.currentUserRank).toBe(1);
  });

  it('is safe to run again', async () => {
    await deletion.deleteAccount(ada);
    await expect(deletion.deleteAccount(ada)).resolves.toEqual({
      success: true,
      data: { deleted: true },
    });

    const tombstone = await prisma.user.findUniqueOrThrow({ where: { id: ada.id } });
    expect(tombstone.email).toBe('deleted-ada@deleted.invalid');
  });

  it('lets the same email sign up again', async () => {
    await deletion.deleteAccount(ada);

    await expect(
      prisma.user.create({ data: { id: 'ada-again', name: 'Ada', email: ada.email } }),
    ).resolves.toMatchObject({ email: ada.email });
  });

  it('refuses while a store plan still renews, and changes nothing', async () => {
    await seedRenewingPlan();

    const result = await deletion.deleteAccount(ada);

    expect(result).toMatchObject({
      success: false,
      error: { reason: 'subscription_renewing', store: 'apple' },
    });
    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: ada.id } });
    expect(untouched.email).toBe(ada.email);
    expect(await prisma.session.count({ where: { userId: ada.id } })).toBe(1);
  });

  it('goes ahead once the plan is cancelled, keeping the billing record', async () => {
    await seedRenewingPlan();
    await prisma.subscription.updateMany({
      where: { userId: ada.id },
      data: { autoRenewing: false },
    });

    await expect(deletion.deleteAccount(ada)).resolves.toMatchObject({ success: true });
    expect(await prisma.subscription.count({ where: { userId: ada.id } })).toBe(1);
  });
});

describe('Group push preference against Postgres', () => {
  it('sends group pushes only to members who left them on', async () => {
    await prisma.pushDevice.create({
      data: { userId: bee.id, expoPushToken: 'ExponentPushToken[bee]', platform: 'ios' },
    });
    await prisma.user.create({ data: { id: 'cam', name: 'Cam', email: 'cam@example.com' } });
    await prisma.pushDevice.create({
      data: { userId: 'cam', expoPushToken: 'ExponentPushToken[cam]', platform: 'ios' },
    });
    await prisma.userProfile.update({
      where: { userId: ada.id },
      data: { groupNotificationsEnabled: false },
    });

    const devices = await new PushDevicesService(prisma).groupPushDevicesFor([
      ada.id,
      bee.id,
      'cam',
    ]);

    expect(devices.map((device) => device.userId).sort()).toEqual([bee.id, 'cam']);
  });
});
