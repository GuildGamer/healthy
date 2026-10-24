import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { CrewsService } from './crews.service.js';

const owner = { id: 'owner', email: 'owner@a.co', name: 'Ada' };
const member = { id: 'bee', email: 'bee@a.co', name: 'Bee' };

function person(displayName: string) {
  return { profile: { displayName } };
}

function crewMember(userId: string, displayName: string, leftAt: Date | null = null) {
  return { userId, leftAt, user: person(displayName) };
}

function crew(overrides: Record<string, unknown> = {}) {
  return {
    id: 'crew-1',
    ownerUserId: owner.id,
    name: 'Bee, Cam',
    ownerUser: person('Ada'),
    members: [crewMember('bee', 'Bee'), crewMember('cam', 'Cam')],
    ...overrides,
  };
}

function participant(userId: string, displayName: string) {
  return { userId, user: person(displayName) };
}

function createPrismaMock() {
  return {
    crew: {
      findUnique: vi.fn().mockResolvedValue(crew()),
      findMany: vi.fn().mockResolvedValue([crew()]),
      create: vi.fn().mockResolvedValue(crew()),
      update: vi.fn().mockImplementation(async ({ data }: { data: { name: string } }) =>
        crew({ name: data.name }),
      ),
      delete: vi.fn().mockResolvedValue(crew()),
    },
    crewMember: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    match: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'm1',
        status: 'completed',
        participants: [
          participant(owner.id, 'Ada'),
          participant('bee', 'Bee'),
          participant('cam', 'Cam'),
        ],
      }),
    },
    matchParticipant: {
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        if (where.userId === owner.id) {
          return [{ matchId: 'm1' }];
        }
        if (where.matchId && typeof where.matchId === 'object') {
          return [
            {
              userId: 'bee',
              joinedAt: new Date('2026-10-20T10:00:00.000Z'),
              user: person('Bee'),
            },
            {
              userId: 'cam',
              joinedAt: new Date('2026-10-19T10:00:00.000Z'),
              user: person('Cam'),
            },
          ];
        }
        return [];
      }),
    },
  };
}

function createService(prisma: ReturnType<typeof createPrismaMock>): CrewsService {
  return new CrewsService(prisma as never);
}

describe('CrewsService.list', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(createService(createPrismaMock()).list(null)).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it('counts the other people, so a member never sees an empty crew', async () => {
    const prisma = createPrismaMock();
    prisma.crew.findMany.mockResolvedValue([
      crew({ members: [crewMember('bee', 'Bee')] }),
    ]);

    const asOwner = await createService(prisma).list(owner);
    expect(asOwner.crews[0]).toMatchObject({
      memberCount: 1,
      memberNames: ['Bee'],
      isOwner: true,
    });

    // Bee sees the owner rather than themselves.
    const asMember = await createService(prisma).list(member);
    expect(asMember.crews[0]).toMatchObject({
      memberCount: 1,
      memberNames: ['Ada'],
      isOwner: false,
    });
  });

  it('drops members who left, and crews everyone left', async () => {
    const prisma = createPrismaMock();
    prisma.crew.findMany.mockResolvedValue([
      crew({
        members: [crewMember('bee', 'Bee'), crewMember('cam', 'Cam', new Date())],
      }),
    ]);
    expect((await createService(prisma).list(owner)).crews[0]).toMatchObject({
      memberNames: ['Bee'],
    });

    prisma.crew.findMany.mockResolvedValue([
      crew({ members: [crewMember('bee', 'Bee', new Date())] }),
    ]);
    expect((await createService(prisma).list(owner)).crews).toEqual([]);
  });
});

describe('CrewsService.listAcquaintances', () => {
  it('returns distinct past opponents, most recent first', async () => {
    const people = await createService(createPrismaMock()).listAcquaintances(owner);

    expect(people.people).toEqual([
      { userId: 'bee', displayName: 'Bee' },
      { userId: 'cam', displayName: 'Cam' },
    ]);
  });

  it('returns nobody when the caller has never competed', async () => {
    const prisma = createPrismaMock();
    prisma.matchParticipant.findMany.mockResolvedValue([]);

    await expect(
      createService(prisma).listAcquaintances(owner),
    ).resolves.toEqual({ people: [] });
  });
});

describe('CrewsService.assertInviteesAllowed', () => {
  it('allows acquaintances and rejects strangers', async () => {
    const service = createService(createPrismaMock());

    await expect(service.assertInviteesAllowed(owner.id, ['bee'])).resolves.toBeUndefined();
    await expect(service.assertInviteesAllowed(owner.id, ['stranger'])).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('CrewsService.save', () => {
  it('names the crew after the other people in it', async () => {
    const prisma = createPrismaMock();
    prisma.crew.findMany.mockResolvedValue([]);
    prisma.crew.create.mockResolvedValue(crew({ name: 'Bee, Cam' }));

    const saved = await createService(prisma).save(owner, 'm1');

    expect(saved.alreadyExisted).toBe(false);
    expect(prisma.crew.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerUserId: owner.id,
          name: 'Bee, Cam',
          members: { create: [{ userId: 'bee' }, { userId: 'cam' }] },
        }),
      }),
    );
  });

  it('keeps a host-supplied name on first save', async () => {
    const prisma = createPrismaMock();
    prisma.crew.findMany.mockResolvedValue([]);
    prisma.crew.create.mockResolvedValue(crew({ name: 'Acme walkers' }));

    await createService(prisma).save(owner, 'm1', 'Acme walkers');

    expect(prisma.crew.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Acme walkers' }),
      }),
    );
  });

  it('does not overwrite the name when the roster already existed', async () => {
    const prisma = createPrismaMock();

    const saved = await createService(prisma).save(owner, 'm1', 'New name');

    expect(saved.alreadyExisted).toBe(true);
    expect(prisma.crew.create).not.toHaveBeenCalled();
    expect(prisma.crew.update).not.toHaveBeenCalled();
  });

  it('hands back an identical roster instead of saving it twice', async () => {
    const prisma = createPrismaMock();

    const saved = await createService(prisma).save(owner, 'm1');

    expect(saved.alreadyExisted).toBe(true);
    expect(saved.crew.id).toBe('crew-1');
    expect(prisma.crew.create).not.toHaveBeenCalled();
  });

  it('refuses a contest that is still running', async () => {
    const prisma = createPrismaMock();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      status: 'open',
      participants: [participant(owner.id, 'Ada'), participant('bee', 'Bee')],
    });

    await expect(createService(prisma).save(owner, 'm1')).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it('refuses a contest nobody else played', async () => {
    const prisma = createPrismaMock();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      status: 'completed',
      participants: [participant(owner.id, 'Ada')],
    });

    await expect(createService(prisma).save(owner, 'm1')).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it('refuses a contest the caller was not in', async () => {
    const prisma = createPrismaMock();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      status: 'completed',
      participants: [participant('bee', 'Bee'), participant('cam', 'Cam')],
    });

    await expect(createService(prisma).save(owner, 'm1')).rejects.toBeInstanceOf(
      ORPCError,
    );
  });
});

describe('CrewsService.rename', () => {
  it('lets the owner rename', async () => {
    const prisma = createPrismaMock();

    const renamed = await createService(prisma).rename(owner, 'crew-1', 'Gym lads');

    expect(renamed.name).toBe('Gym lads');
  });

  it('refuses a member renaming someone else\u2019s crew', async () => {
    const prisma = createPrismaMock();

    await expect(
      createService(prisma).rename(member, 'crew-1', 'Gym lads'),
    ).rejects.toBeInstanceOf(ORPCError);
  });
});

describe('CrewsService.leave', () => {
  it('marks a member as left rather than deleting the row, so they cannot be re-added', async () => {
    const prisma = createPrismaMock();

    await createService(prisma).leave(member, 'crew-1');

    expect(prisma.crewMember.updateMany).toHaveBeenCalledWith({
      where: { crewId: 'crew-1', userId: member.id, leftAt: null },
      data: { leftAt: expect.any(Date) },
    });
    expect(prisma.crew.delete).not.toHaveBeenCalled();
  });

  it('takes the crew with the owner, who has nothing left to own', async () => {
    const prisma = createPrismaMock();

    await createService(prisma).leave(owner, 'crew-1');

    expect(prisma.crew.delete).toHaveBeenCalledWith({ where: { id: 'crew-1' } });
  });

  it('refuses someone who is in neither side of the crew', async () => {
    const prisma = createPrismaMock();

    await expect(
      createService(prisma).leave({ id: 'stranger', email: 's@a.co', name: 'S' }, 'crew-1'),
    ).rejects.toBeInstanceOf(ORPCError);
  });
});

describe('CrewsService.activeMemberIdsForOwner', () => {
  it('seats only members who are still in', async () => {
    const prisma = createPrismaMock();
    prisma.crew.findUnique.mockResolvedValue(
      crew({
        members: [crewMember('bee', 'Bee'), crewMember('cam', 'Cam', new Date())],
      }),
    );

    await expect(
      createService(prisma).activeMemberIdsForOwner(owner.id, 'crew-1'),
    ).resolves.toEqual(['bee']);
  });

  it('refuses a crew the caller does not own', async () => {
    const prisma = createPrismaMock();

    await expect(
      createService(prisma).activeMemberIdsForOwner('bee', 'crew-1'),
    ).rejects.toBeInstanceOf(ORPCError);
  });
});
