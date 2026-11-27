import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import { hashPassword } from 'better-auth/crypto';
import type {
  AdminOperator,
  InviteAdminInput,
} from '@product/contract';
import type { AdminRole, PrismaClient } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireSuperadmin,
} from '../../../shared/types/authenticated-admin.js';
import { ENVIRONMENT } from '../../shared-modules/config/config.tokens.js';
import type { Environment } from '../../shared-modules/config/environment.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { operatorInviteMail } from '../../shared-modules/mail/admin-mail-content.js';
import type { Mailer } from '../../shared-modules/mail/mailer.js';
import { MAILER } from '../../shared-modules/mail/mail.tokens.js';

@Injectable()
export class AdminOperatorsService {
  private readonly logger = new Logger(AdminOperatorsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  async list(
    currentAdmin: AuthenticatedAdmin | null | undefined,
  ): Promise<{ operators: AdminOperator[] }> {
    requireSuperadmin(currentAdmin);

    const rows = await this.prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      include: { roles: { select: { role: true } } },
    });

    return { operators: rows.map((row) => this.toDto(row)) };
  }

  async invite(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: InviteAdminInput,
  ): Promise<{ operator: AdminOperator }> {
    const actor = requireSuperadmin(currentAdmin);
    this.assertHasRole(input.roles);

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.adminUser.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existing) {
      throw new ORPCError('CONFLICT', {
        message: 'An operator with that email already exists',
      });
    }

    const userId = randomUUID();
    const created = await this.prisma.adminUser.create({
      data: {
        id: userId,
        name: input.name.trim(),
        email,
        emailVerified: true,
        isActive: true,
        accounts: {
          create: {
            id: randomUUID(),
            issuer: 'local:credential',
            accountId: userId,
            providerId: 'credential',
            password: await hashPassword(input.password),
          },
        },
        roles: {
          create: input.roles.map((role) => ({ role })),
        },
      },
      include: { roles: { select: { role: true } } },
    });

    await this.prisma.adminAuditEvent.create({
      data: {
        adminUserId: actor.id,
        action: 'admin_invite',
        targetAdminUserId: created.id,
        payload: { roles: input.roles },
      },
    });

    const invite = operatorInviteMail({
      name: created.name,
      email: created.email,
      adminAppUrl: this.environment.adminAppUrl,
    });
    try {
      await this.mailer.sendMessage({
        to: created.email,
        subject: invite.subject,
        text: invite.text,
        html: invite.html,
      });
    } catch (error) {
      this.logger.error(`Operator invite email failed for ${created.email}`, error);
    }

    return { operator: this.toDto(created) };
  }

  async updateRoles(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    adminUserId: string,
    roles: AdminRole[],
  ): Promise<{ operator: AdminOperator }> {
    const actor = requireSuperadmin(currentAdmin);
    this.assertHasRole(roles);
    const target = await this.requireOperator(adminUserId);

    await this.prisma.$transaction(async (tx) => {
      await tx.adminRoleAssignment.deleteMany({
        where: { adminUserId: target.id },
      });
      await tx.adminRoleAssignment.createMany({
        data: roles.map((role) => ({ adminUserId: target.id, role })),
      });
      await tx.adminAuditEvent.create({
        data: {
          adminUserId: actor.id,
          action: 'admin_roles_update',
          targetAdminUserId: target.id,
          payload: { roles },
        },
      });
    });

    return { operator: await this.load(target.id) };
  }

  async setActive(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    adminUserId: string,
    isActive: boolean,
  ): Promise<{ operator: AdminOperator }> {
    const actor = requireSuperadmin(currentAdmin);

    if (actor.id === adminUserId) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'You cannot deactivate your own account',
      });
    }

    const target = await this.requireOperator(adminUserId);

    await this.prisma.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: { id: target.id },
        data: { isActive },
      });

      if (!isActive) {
        await tx.adminSession.deleteMany({ where: { userId: target.id } });
      }

      await tx.adminAuditEvent.create({
        data: {
          adminUserId: actor.id,
          action: isActive ? 'admin_reactivate' : 'admin_deactivate',
          targetAdminUserId: target.id,
        },
      });
    });

    return { operator: await this.load(target.id) };
  }

  private assertHasRole(roles: readonly AdminRole[]): void {
    if (roles.length === 0) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Choose at least one role',
      });
    }
  }

  private async requireOperator(adminUserId: string) {
    const target = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { id: true },
    });

    if (!target) {
      throw new ORPCError('NOT_FOUND', { message: 'Operator not found' });
    }

    return target;
  }

  private async load(adminUserId: string): Promise<AdminOperator> {
    const row = await this.prisma.adminUser.findUniqueOrThrow({
      where: { id: adminUserId },
      include: { roles: { select: { role: true } } },
    });

    return this.toDto(row);
  }

  private toDto(row: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    roles: { role: AdminRole }[];
  }): AdminOperator {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      roles: row.roles.map((assignment) => assignment.role),
    };
  }
}
