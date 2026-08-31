import { Inject, Injectable } from '@nestjs/common';
import type { AdminMeOutput } from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdmin,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

@Injectable()
export class AdminMeService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async getMe(
    currentAdmin: AuthenticatedAdmin | null | undefined,
  ): Promise<AdminMeOutput> {
    const admin = requireAdmin(currentAdmin);

    const record = await this.prisma.adminUser.findUniqueOrThrow({
      where: { id: admin.id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        roles: { select: { role: true } },
      },
    });

    return {
      id: record.id,
      email: record.email,
      name: record.name,
      isActive: record.isActive,
      roles: record.roles.map((assignment) => assignment.role),
    };
  }
}
