import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminStagingTestersService } from './staging-testers.service.js';

const admin = {
  id: 'admin-1',
  email: 'ops@example.com',
  name: 'Ops',
  roles: ['support' as const],
  isActive: true,
};

function createPrismaMock(rows: Array<Record<string, unknown>> = []) {
  const store = [...rows];

  return {
    stagingTesterGrant: {
      findMany: vi.fn().mockImplementation(async () => store),
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) {
          return store.find((row) => row.id === where.id) ?? null;
        }
        if (where.email) {
          return store.find((row) => row.email === where.email) ?? null;
        }
        return null;
      }),
      upsert: vi.fn().mockImplementation(
        async ({
          where,
          create,
          update,
        }: {
          where: { email: string };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const existing = store.find((row) => row.email === where.email);
          if (existing) {
            Object.assign(existing, update, { updatedAt: new Date() });
            return existing;
          }
          const created = {
            id: 'grant-new',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...create,
          };
          store.push(created);
          return created;
        },
      ),
      update: vi.fn().mockImplementation(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const existing = store.find((row) => row.id === where.id);
          if (!existing) {
            throw new Error('missing');
          }
          Object.assign(existing, data, { updatedAt: new Date() });
          return existing;
        },
      ),
      delete: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        const index = store.findIndex((row) => row.id === where.id);
        if (index < 0) {
          throw new Error('missing');
        }
        store.splice(index, 1);
      }),
    },
    adminAuditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn({
      stagingTesterGrant: undefined as never,
      adminAuditEvent: undefined as never,
    }),
  };
}

describe('AdminStagingTestersService', () => {
  it('lists grants for support operators', async () => {
    const now = new Date('2026-11-26T12:00:00.000Z');
    const prisma = createPrismaMock([
      {
        id: 'g1',
        email: 'a@example.com',
        enabled: true,
        note: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    prisma.$transaction = async <T>(fn: (tx: typeof prisma) => Promise<T>) =>
      fn(prisma);

    const service = new AdminStagingTestersService(prisma as never);
    await expect(service.list(admin)).resolves.toEqual({
      items: [
        {
          id: 'g1',
          email: 'a@example.com',
          enabled: true,
          note: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    });
  });

  it('upserts a lowercased email and writes an audit event', async () => {
    const prisma = createPrismaMock();
    prisma.$transaction = async <T>(fn: (tx: typeof prisma) => Promise<T>) =>
      fn(prisma);

    const service = new AdminStagingTestersService(prisma as never);
    const result = await service.upsert(admin, {
      email: ' Tester@Example.COM ',
      enabled: true,
      note: 'QA',
    });

    expect(result.grant.email).toBe('tester@example.com');
    expect(result.grant.enabled).toBe(true);
    expect(result.grant.note).toBe('QA');
    expect(prisma.adminAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'staging_tester_upsert',
        }),
      }),
    );
  });

  it('toggles enabled and refuses unknown ids', async () => {
    const now = new Date('2026-11-26T12:00:00.000Z');
    const prisma = createPrismaMock([
      {
        id: 'g1',
        email: 'a@example.com',
        enabled: true,
        note: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    prisma.$transaction = async <T>(fn: (tx: typeof prisma) => Promise<T>) =>
      fn(prisma);

    const service = new AdminStagingTestersService(prisma as never);
    await expect(
      service.setEnabled(admin, { id: 'g1', enabled: false }),
    ).resolves.toMatchObject({
      grant: { id: 'g1', enabled: false },
    });

    await expect(
      service.setEnabled(admin, { id: 'missing', enabled: true }),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it('deletes a grant', async () => {
    const now = new Date('2026-11-26T12:00:00.000Z');
    const prisma = createPrismaMock([
      {
        id: 'g1',
        email: 'a@example.com',
        enabled: true,
        note: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    prisma.$transaction = async <T>(fn: (tx: typeof prisma) => Promise<T>) =>
      fn(prisma);

    const service = new AdminStagingTestersService(prisma as never);
    await expect(service.delete(admin, { id: 'g1' })).resolves.toEqual({
      ok: true,
    });
    await expect(service.delete(admin, { id: 'g1' })).rejects.toBeInstanceOf(
      ORPCError,
    );
  });
});
