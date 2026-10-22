import type { PrismaClient } from '@product/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../load-env.js';
import { createTestPrismaClient, resetDatabase } from '../../../../test/integration-db.js';
import { PushDevicesService } from '../../shared-modules/push/push-devices.service.js';
import { MatchReactionNotifierService } from './match-reaction-notifier.service.js';
import { MatchReactionsService } from './match-reactions.service.js';

const DAY = '2026-10-22';
const people = ['ada', 'bee', 'cam'] as const;

let prisma: PrismaClient;
let reactions: MatchReactionsService;
let notifier: MatchReactionNotifierService;
const pushSender = { send: vi.fn() };

const group = {
  scoringMode: 'cumulative_total' as const,
  metric: 'walk' as const,
  dailyScope: 'any_challenge' as const,
  endsAt: new Date(Date.now() + 4.5 * 86_400_000).toISOString(),
};

async function seedGroup(): Promise<void> {
  await prisma.user.createMany({
    data: people.map((id) => ({ id, name: id, email: `${id}@example.com` })),
  });
  await prisma.match.create({
    data: {
      id: 'm1',
      hostUserId: 'ada',
      inviteToken: 'token_reactions_1',
      metric: 'walk',
      scoringMode: 'cumulative_total',
      startsAt: new Date(),
      endsAt: new Date(group.endsAt),
    },
  });
  await prisma.pushDevice.create({
    data: { userId: 'cam', expoPushToken: 'ExponentPushToken[cam]', platform: 'ios' },
  });
}

beforeAll(() => {
  prisma = createTestPrismaClient();
  reactions = new MatchReactionsService(prisma);
  notifier = new MatchReactionNotifierService(prisma, pushSender, new PushDevicesService(prisma));
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  pushSender.send.mockReset().mockResolvedValue({ sentCount: 1, rejectedTokens: [] });
  await seedGroup();
});

describe('MatchReactionsService against Postgres', () => {
  it('keeps one tap of each kind per pair per day', async () => {
    const tap = { matchId: 'm1', fromUserId: 'ada', toUserId: 'cam', dayKey: DAY };

    expect(await reactions.record({ ...tap, kind: 'nudge' })).toBe(true);
    expect(await reactions.record({ ...tap, kind: 'nudge' })).toBe(false);
    expect(await reactions.record({ ...tap, kind: 'cheer' })).toBe(true);
    expect(await reactions.record({ ...tap, kind: 'cheer' })).toBe(false);
    expect(await reactions.record({ ...tap, dayKey: '2026-10-23', kind: 'nudge' })).toBe(true);

    const sent = await reactions.sentBy('m1', 'ada', DAY);
    expect(sent.get('cam')?.map((reaction) => reaction.kind)).toEqual(['nudge', 'cheer']);
  });
});

describe('MatchReactionNotifierService against Postgres', () => {
  it('bundles cheers into one push a day, but sends each sender’s nudge', async () => {
    const toCam = { matchId: 'm1', toUserId: 'cam', dayKey: DAY, group };

    await notifier.notify({ ...toCam, fromUserId: 'ada', senderName: 'Ada', kind: 'cheer' });
    await notifier.notify({ ...toCam, fromUserId: 'bee', senderName: 'Bee', kind: 'cheer' });
    await notifier.notify({ ...toCam, fromUserId: 'ada', senderName: 'Ada', kind: 'nudge' });
    await notifier.notify({ ...toCam, fromUserId: 'ada', senderName: 'Ada', kind: 'nudge' });

    const inbox = await prisma.notification.findMany({
      where: { userId: 'cam' },
      orderBy: { createdAt: 'asc' },
    });
    expect(inbox.map((row) => row.title)).toEqual(['Ada cheered you on', 'Ada nudged you']);
    expect(inbox[1]?.body).toBe('4 days left in your walking group.');
    expect(pushSender.send).toHaveBeenCalledTimes(2);
  });
});
