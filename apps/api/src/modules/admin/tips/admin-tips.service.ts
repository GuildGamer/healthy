import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type {
  AdminTip,
  PublicTip,
  UpdateAdminTipInput,
  UpsertAdminTipInput,
} from '@product/contract';
import type { PrismaClient, Tip } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdminPermission,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

@Injectable()
export class AdminTipsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listPublic(): Promise<{ tips: PublicTip[] }> {
    const rows = await this.prisma.tip.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, category: true, title: true, body: true },
    });

    return { tips: rows };
  }

  async list(
    currentAdmin: AuthenticatedAdmin | null | undefined,
  ): Promise<{ tips: AdminTip[] }> {
    requireAdminPermission(currentAdmin, 'content');

    const rows = await this.prisma.tip.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
    });

    return { tips: rows.map((row) => this.toDto(row)) };
  }

  async create(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: UpsertAdminTipInput,
  ): Promise<{ tip: AdminTip }> {
    requireAdminPermission(currentAdmin, 'content');
    await this.assertSlugAvailable(input.slug);

    const created = await this.prisma.tip.create({
      data: {
        slug: input.slug,
        category: input.category,
        title: input.title,
        body: input.body,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    return { tip: this.toDto(created) };
  }

  async update(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: UpdateAdminTipInput,
  ): Promise<{ tip: AdminTip }> {
    requireAdminPermission(currentAdmin, 'content');

    const current = await this.prisma.tip.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!current) {
      throw new ORPCError('NOT_FOUND', { message: 'Tip not found' });
    }

    await this.assertSlugAvailable(input.slug, input.id);

    const updated = await this.prisma.tip.update({
      where: { id: input.id },
      data: {
        slug: input.slug,
        category: input.category,
        title: input.title,
        body: input.body,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    return { tip: this.toDto(updated) };
  }

  private async assertSlugAvailable(slug: string, exceptId?: string) {
    const taken = await this.prisma.tip.findFirst({
      where: exceptId ? { slug, id: { not: exceptId } } : { slug },
      select: { id: true },
    });

    if (taken) {
      throw new ORPCError('CONFLICT', { message: 'That slug is already in use' });
    }
  }

  private toDto(row: Tip): AdminTip {
    return {
      id: row.id,
      slug: row.slug,
      category: row.category,
      title: row.title,
      body: row.body,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
