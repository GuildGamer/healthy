import { Inject, Injectable } from '@nestjs/common';
import type { AdminWaitlistEntry } from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdminPermission,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

@Injectable()
export class AdminWaitlistService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(
    currentAdmin: AuthenticatedAdmin | null | undefined,
  ): Promise<{ entries: AdminWaitlistEntry[] }> {
    requireAdminPermission(currentAdmin, 'content');

    const rows = await this.prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      entries: rows.map((row) => ({
        id: row.id,
        email: row.email,
        source: row.source,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
}
