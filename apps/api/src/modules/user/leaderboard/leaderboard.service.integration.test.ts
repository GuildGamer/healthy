import type { PrismaClient } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import '../../../load-env.js';
import { createTestPrismaClient, resetDatabase } from '../../../../test/integration-db.js';
import { startOfUtcMonth, startOfUtcWeek } from '../../../shared/utils/week.js';
import { LeaderboardService } from './leaderboard.service.js';
import { pseudonymFor } from './pseudonym.js';

let prisma: PrismaClient;
let leaderboard: LeaderboardService;

const weekStart = startOfUtcWeek();
const lastWeek = new Date(weekStart.getTime() - 24 * 60 * 60 * 1000);
const monthStart = startOfUtcMonth();
const lastMonth = new Date(monthStart.getTime() - 24 * 60 * 60 * 1000);

async function seedUser(id: string, displayName?: string): Promise<void> {
  await prisma.user.create({
    data: {
      id,
      name: id,
      email: `${id}@example.com`,
      updatedAt: new Date(),
      profile: { create: displayName ? { displayName } : {} },
    },
  });
}

async function award(userId: string, delta: number, createdAt: Date = new Date()): Promise<void> {
  await prisma.pointLedgerEntry.create({
    data: {
      userId,
      delta,
      reason: 'test',
      idempotencyKey: `${userId}:${delta}:${createdAt.toISOString()}`,
      createdAt,
    },
  });
}

async function seedChallenge(
  slug: string,
  category: 'hypertension' | 'diabetes' | 'asthma' | 'general',
): Promise<string> {
  const challenge = await prisma.challenge.create({
    data: {
      slug,
      title: slug,
      description: 'Do the thing.',
      category,
      rewardPoints: 10,
    },
  });
  return challenge.id;
}

async function awardOnChallenge(
  userId: string,
  challengeId: string,
  delta: number,
  createdAt: Date = new Date(),
): Promise<void> {
  const assignment = await prisma.userChallenge.create({
    data: {
      userId,
      challengeId,
      periodKey: `${userId}:${challengeId}:${createdAt.toISOString()}`,
    },
  });

  await prisma.pointLedgerEntry.create({
    data: {
      userId,
      delta,
      reason: 'test',
      idempotencyKey: `${userId}:${delta}:${assignment.id}`,
      userChallengeId: assignment.id,
      createdAt,
    },
  });
}

beforeAll(() => {
  prisma = createTestPrismaClient();
  leaderboard = new LeaderboardService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('LeaderboardService against Postgres', () => {
  it('ranks by points earned this week, highest first', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await seedUser('carol', 'Carol');
    await award('alice', 30);
    await award('bob', 50);
    await award('carol', 40);

    const board = await leaderboard.listWeekly({
      id: 'bob',
      email: 'bob@example.com',
    });

    expect(board.entries.map((entry) => entry.displayName)).toEqual(['Bob', 'Carol', 'Alice']);
    expect(board.entries.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(board.currentUserRank).toBe(1);
    expect(board.currentUserPoints).toBe(50);
  });

  it('ignores points earned before the week opened', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await award('alice', 500, lastWeek);
    await award('bob', 10);

    const board = await leaderboard.listWeekly({
      id: 'bob',
      email: 'bob@example.com',
    });

    expect(board.entries).toHaveLength(1);
    expect(board.entries[0]).toMatchObject({ displayName: 'Bob', points: 10 });
  });

  it('sums a week of separate awards into one score', async () => {
    await seedUser('alice', 'Alice');
    await award('alice', 20);
    await award('alice', 25);

    const board = await leaderboard.listWeekly({
      id: 'alice',
      email: 'alice@example.com',
    });

    expect(board.entries[0]?.points).toBe(45);
    expect(board.currentUserPoints).toBe(45);
  });

  it('shows a pseudonym for anyone who has not chosen a name', async () => {
    await seedUser('alice');
    await award('alice', 10);

    const board = await leaderboard.listWeekly({
      id: 'alice',
      email: 'alice@example.com',
    });

    expect(board.entries[0]?.displayName).toBe(pseudonymFor('alice'));
  });

  it('never leaks an email address', async () => {
    await seedUser('alice', 'Alice');
    await award('alice', 10);

    const board = await leaderboard.listWeekly({
      id: 'alice',
      email: 'alice@example.com',
    });

    expect(JSON.stringify(board)).not.toContain('@example.com');
  });

  it('flags which row belongs to the caller', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await award('alice', 30);
    await award('bob', 10);

    const board = await leaderboard.listWeekly({
      id: 'bob',
      email: 'bob@example.com',
    });

    expect(board.entries.filter((entry) => entry.isCurrentUser)).toMatchObject([
      { displayName: 'Bob' },
    ]);
  });

  it('reports no rank for someone who has not scored yet', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await award('alice', 30);

    const board = await leaderboard.listWeekly({
      id: 'bob',
      email: 'bob@example.com',
    });

    expect(board.currentUserRank).toBeNull();
    expect(board.currentUserPoints).toBe(0);
  });

  it('ranks a user who falls outside the returned page', async () => {
    await seedUser('straggler', 'Straggler');
    await award('straggler', 1);

    for (let index = 0; index < 60; index += 1) {
      const id = `rival-${index}`;
      await seedUser(id, `Rival ${index}`);
      await award(id, 100 + index);
    }

    const board = await leaderboard.listWeekly({
      id: 'straggler',
      email: 'straggler@example.com',
    });

    expect(board.entries).toHaveLength(50);
    expect(board.entries.some((entry) => entry.isCurrentUser)).toBe(false);
    expect(board.currentUserRank).toBe(61);
  });

  it('omits anyone who turned off Show me on leaderboard', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await award('alice', 50);
    await award('bob', 30);
    await prisma.userProfile.update({
      where: { userId: 'alice' },
      data: { showOnLeaderboard: false },
    });

    const board = await leaderboard.listWeekly({
      id: 'bob',
      email: 'bob@example.com',
    });

    expect(board.entries.map((entry) => entry.displayName)).toEqual(['Bob']);
    expect(board.currentUserRank).toBe(1);
    expect(board.currentUserVisible).toBe(true);

    const hidden = await leaderboard.listWeekly({
      id: 'alice',
      email: 'alice@example.com',
    });

    expect(hidden.entries.map((entry) => entry.displayName)).toEqual(['Bob']);
    expect(hidden.currentUserVisible).toBe(false);
    expect(hidden.currentUserRank).toBeNull();
    expect(hidden.currentUserPoints).toBe(50);
  });

  it('echoes the week window on the default board', async () => {
    await seedUser('bob', 'Bob');
    await award('bob', 10);

    const board = await leaderboard.listWeekly({
      id: 'bob',
      email: 'bob@example.com',
    });

    expect(board.period).toBe('week');
    expect(board.periodStart).toBe(weekStart.toISOString().slice(0, 10));
    expect(board.weekStart).toBe(board.periodStart);
  });

  it('ranks the month without last month points', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await award('alice', 500, lastMonth);
    await award('bob', 10);

    const board = await leaderboard.list(
      { id: 'bob', email: 'bob@example.com' },
      { period: 'month' },
    );

    expect(board.period).toBe('month');
    expect(board.periodStart).toBe(monthStart.toISOString().slice(0, 10));
    expect(board.entries).toHaveLength(1);
    expect(board.entries[0]).toMatchObject({ displayName: 'Bob', points: 10 });
  });

  it('includes every ledger row on the all-time board', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await award('alice', 500, lastWeek);
    await award('bob', 10);

    const board = await leaderboard.list(
      { id: 'bob', email: 'bob@example.com' },
      { period: 'all' },
    );

    expect(board.period).toBe('all');
    expect(board.periodStart).toBeNull();
    expect(board.entries.map((entry) => entry.displayName)).toEqual(['Alice', 'Bob']);
    expect(board.currentUserPoints).toBe(10);
  });

  it('ranks the caller as of the start of the UTC day, before today moved them', async () => {
    const wednesdayNoon = new Date(weekStart.getTime() + (2 * 24 + 12) * 60 * 60 * 1000);
    const yesterday = new Date(wednesdayNoon.getTime() - 24 * 60 * 60 * 1000);
    const thisMorning = new Date(wednesdayNoon.getTime() - 60 * 60 * 1000);
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await seedUser('carol', 'Carol');
    await award('alice', 50, yesterday);
    await award('bob', 40, yesterday);
    await award('carol', 10, yesterday);
    await award('carol', 100, thisMorning);

    const board = await leaderboard.list(
      { id: 'carol', email: 'carol@example.com' },
      { period: 'week' },
      wednesdayNoon,
    );

    expect(board.currentUserRank).toBe(1);
    expect(board.currentUserRankAtDayStart).toBe(3);
  });

  it('has no earlier rank on the day the window opened, or before the first point', async () => {
    const mondayNoon = new Date(weekStart.getTime() + 12 * 60 * 60 * 1000);
    await seedUser('alice', 'Alice');
    await award('alice', 30, new Date(mondayNoon.getTime() - 60 * 60 * 1000));

    const openingDay = await leaderboard.list(
      { id: 'alice', email: 'alice@example.com' },
      { period: 'week' },
      mondayNoon,
    );
    const tuesdayNoon = new Date(mondayNoon.getTime() + 24 * 60 * 60 * 1000);
    await award('alice', 5, new Date(tuesdayNoon.getTime() - 60 * 60 * 1000));
    await seedUser('bob', 'Bob');
    await award('bob', 10, new Date(tuesdayNoon.getTime() - 60 * 60 * 1000));
    const newcomer = await leaderboard.list(
      { id: 'bob', email: 'bob@example.com' },
      { period: 'week' },
      tuesdayNoon,
    );

    expect(openingDay.currentUserRank).toBe(1);
    expect(openingDay.currentUserRankAtDayStart).toBeNull();
    expect(newcomer.currentUserRank).toBe(2);
    expect(newcomer.currentUserRankAtDayStart).toBeNull();
  });

  it('returns the caller with two people either side, ranked like the page', async () => {
    for (let index = 0; index < 8; index += 1) {
      await seedUser(`member-${index}`, `Member ${index}`);
      await award(`member-${index}`, 100 - index * 10);
    }

    const board = await leaderboard.listWeekly({
      id: 'member-4',
      email: 'member-4@example.com',
    });

    expect(board.currentUserRank).toBe(5);
    expect(board.aroundCurrentUser).toEqual([
      { rank: 3, displayName: 'Member 2', points: 80, isCurrentUser: false },
      { rank: 4, displayName: 'Member 3', points: 70, isCurrentUser: false },
      { rank: 5, displayName: 'Member 4', points: 60, isCurrentUser: true },
      { rank: 6, displayName: 'Member 5', points: 50, isCurrentUser: false },
      { rank: 7, displayName: 'Member 6', points: 40, isCurrentUser: false },
    ]);
  });

  it('keeps a tied caller in the same place on the page and around them', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await award('alice', 50);
    await award('bob', 50);

    const board = await leaderboard.listWeekly({ id: 'bob', email: 'bob@example.com' });
    const onPage = board.entries.find((entry) => entry.isCurrentUser);
    const around = board.aroundCurrentUser.find((entry) => entry.isCurrentUser);

    expect(board.currentUserRank).toBe(onPage?.rank);
    expect(around?.rank).toBe(onPage?.rank);
  });

  it('has nobody around a caller who is unranked or hidden', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await award('alice', 50);
    await award('bob', 30);
    await prisma.userProfile.update({
      where: { userId: 'bob' },
      data: { showOnLeaderboard: false },
    });
    await seedUser('carol', 'Carol');

    const hidden = await leaderboard.listWeekly({ id: 'bob', email: 'bob@example.com' });
    const unranked = await leaderboard.listWeekly({ id: 'carol', email: 'carol@example.com' });

    expect(hidden.aroundCurrentUser).toEqual([]);
    expect(unranked.aroundCurrentUser).toEqual([]);
  });

  it('limits a condition board to points tied to that category', async () => {
    await seedUser('alice', 'Alice');
    await seedUser('bob', 'Bob');
    await seedUser('carol', 'Carol');
    const bloodPressure = await seedChallenge('bp-check', 'hypertension');
    const bloodSugar = await seedChallenge('glucose-log', 'diabetes');
    await awardOnChallenge('alice', bloodPressure, 40);
    await awardOnChallenge('bob', bloodSugar, 80);
    await award('carol', 100);

    const board = await leaderboard.list(
      { id: 'alice', email: 'alice@example.com' },
      { period: 'week', category: 'hypertension' },
    );

    expect(board.entries).toHaveLength(1);
    expect(board.entries[0]).toMatchObject({
      displayName: 'Alice',
      points: 40,
      isCurrentUser: true,
    });
    expect(board.currentUserPoints).toBe(40);
  });
});
