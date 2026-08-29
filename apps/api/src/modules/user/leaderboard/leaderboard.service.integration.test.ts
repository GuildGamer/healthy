import type { PrismaClient } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import '../../../load-env.js';
import {
  createTestPrismaClient,
  resetDatabase,
} from '../../../../test/integration-db.js';
import { startOfUtcWeek } from '../../../shared/utils/week.js';
import { LeaderboardService } from './leaderboard.service.js';
import { pseudonymFor } from './pseudonym.js';

let prisma: PrismaClient;
let leaderboard: LeaderboardService;

const weekStart = startOfUtcWeek();
const lastWeek = new Date(weekStart.getTime() - 24 * 60 * 60 * 1000);

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

async function award(
  userId: string,
  delta: number,
  createdAt: Date = new Date(),
): Promise<void> {
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

    expect(board.entries.map((entry) => entry.displayName)).toEqual([
      'Bob',
      'Carol',
      'Alice',
    ]);
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

    expect(
      board.entries.filter((entry) => entry.isCurrentUser),
    ).toMatchObject([{ displayName: 'Bob' }]);
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
    expect(
      board.entries.some((entry) => entry.isCurrentUser),
    ).toBe(false);
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
  });
});
