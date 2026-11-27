import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type {
  DeleteStagingTesterGrantInput,
  ListStagingTesterGrantsOutput,
  SetStagingTesterGrantEnabledInput,
  StagingTesterGrant,
  UpsertStagingTesterGrantInput,
} from '@product/contract';
import type { PrismaClient, StagingTesterGrant as DbGrant } from '@product/db';
import { normalizeStagingTesterEmail } from '../../../shared/membership/staging-tester-membership.js';
import {
  type AuthenticatedAdmin,
  requireAdminPermission,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

@Injectable()
export class AdminStagingTestersService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(
    currentAdmin: AuthenticatedAdmin | null | undefined,
  ): Promise<ListStagingTesterGrantsOutput> {
    requireAdminPermission(currentAdmin, 'support');

    const rows = await this.prisma.stagingTesterGrant.findMany({
      orderBy: [{ enabled: 'desc' }, { email: 'asc' }],
    });

    return { items: rows.map(toDto) };
  }

  async upsert(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: UpsertStagingTesterGrantInput,
  ): Promise<{ grant: StagingTesterGrant }> {
    const admin = requireAdminPermission(currentAdmin, 'support');
    const email = normalizeStagingTesterEmail(input.email);
    const note = normalizeNote(input.note);

    const grant = await this.prisma.$transaction(async (tx) => {
      const row = await tx.stagingTesterGrant.upsert({
        where: { email },
        create: {
          email,
          enabled: input.enabled,
          note,
          createdByAdminUserId: admin.id,
        },
        update: {
          enabled: input.enabled,
          note,
        },
      });

      await tx.adminAuditEvent.create({
        data: {
          adminUserId: admin.id,
          action: 'staging_tester_upsert',
          reason: `Staging tester grant for ${email}`,
          payload: {
            grantId: row.id,
            email,
            enabled: row.enabled,
          },
        },
      });

      return row;
    });

    return { grant: toDto(grant) };
  }

  async setEnabled(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: SetStagingTesterGrantEnabledInput,
  ): Promise<{ grant: StagingTesterGrant }> {
    const admin = requireAdminPermission(currentAdmin, 'support');

    const existing = await this.prisma.stagingTesterGrant.findUnique({
      where: { id: input.id },
      select: { id: true, email: true },
    });

    if (!existing) {
      throw new ORPCError('NOT_FOUND', { message: 'Staging tester grant not found' });
    }

    const grant = await this.prisma.$transaction(async (tx) => {
      const row = await tx.stagingTesterGrant.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });

      await tx.adminAuditEvent.create({
        data: {
          adminUserId: admin.id,
          action: 'staging_tester_toggle',
          reason: input.enabled
            ? `Enabled staging tester ${existing.email}`
            : `Disabled staging tester ${existing.email}`,
          payload: {
            grantId: row.id,
            email: row.email,
            enabled: row.enabled,
          },
        },
      });

      return row;
    });

    return { grant: toDto(grant) };
  }

  async delete(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: DeleteStagingTesterGrantInput,
  ): Promise<{ ok: true }> {
    const admin = requireAdminPermission(currentAdmin, 'support');

    const existing = await this.prisma.stagingTesterGrant.findUnique({
      where: { id: input.id },
      select: { id: true, email: true },
    });

    if (!existing) {
      throw new ORPCError('NOT_FOUND', { message: 'Staging tester grant not found' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.stagingTesterGrant.delete({ where: { id: input.id } });

      await tx.adminAuditEvent.create({
        data: {
          adminUserId: admin.id,
          action: 'staging_tester_delete',
          reason: `Deleted staging tester ${existing.email}`,
          payload: {
            grantId: existing.id,
            email: existing.email,
          },
        },
      });
    });

    return { ok: true };
  }
}

function normalizeNote(note: string | null | undefined): string | null {
  if (note === undefined || note === null) {
    return null;
  }

  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toDto(row: DbGrant): StagingTesterGrant {
  return {
    id: row.id,
    email: row.email,
    enabled: row.enabled,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
