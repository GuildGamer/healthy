import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  challengeSpecIssue,
  type AdminChallenge,
  type UpdateAdminChallengeInput,
  type UpsertAdminChallengeInput,
} from '@product/contract';
import type { Challenge, PrismaClient } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdminPermission,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

@Injectable()
export class AdminCatalogService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(
    currentAdmin: AuthenticatedAdmin | null | undefined,
  ): Promise<{ challenges: AdminChallenge[] }> {
    requireAdminPermission(currentAdmin, 'content');

    const rows = await this.prisma.challenge.findMany({
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { enrollments: true } } },
    });

    return { challenges: rows.map((row) => this.toDto(row)) };
  }

  async create(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: UpsertAdminChallengeInput,
  ): Promise<{ challenge: AdminChallenge }> {
    requireAdminPermission(currentAdmin, 'content');
    this.assertSpec(input);

    const existing = await this.prisma.challenge.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (existing) {
      throw new ORPCError('CONFLICT', { message: 'That slug is already in use' });
    }

    const created = await this.prisma.challenge.create({
      data: this.toData(input),
      include: { _count: { select: { enrollments: true } } },
    });

    return { challenge: this.toDto(created) };
  }

  async update(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: UpdateAdminChallengeInput,
  ): Promise<{ challenge: AdminChallenge }> {
    requireAdminPermission(currentAdmin, 'content');
    this.assertSpec(input);

    const current = await this.prisma.challenge.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!current) {
      throw new ORPCError('NOT_FOUND', { message: 'Challenge not found' });
    }

    const slugTaken = await this.prisma.challenge.findFirst({
      where: { slug: input.slug, id: { not: input.id } },
      select: { id: true },
    });

    if (slugTaken) {
      throw new ORPCError('CONFLICT', { message: 'That slug is already in use' });
    }

    const updated = await this.prisma.challenge.update({
      where: { id: input.id },
      data: this.toData(input),
      include: { _count: { select: { enrollments: true } } },
    });

    return { challenge: this.toDto(updated) };
  }

  private assertSpec(input: UpsertAdminChallengeInput): void {
    const issue = challengeSpecIssue(input);

    if (issue) {
      throw new ORPCError('BAD_REQUEST', { message: issue });
    }
  }

  private toData(input: UpsertAdminChallengeInput) {
    return {
      slug: input.slug,
      title: input.title,
      description: input.description,
      instruction: input.instruction,
      category: input.category,
      icon: input.icon,
      rewardPoints: input.rewardPoints,
      defaultFrequency: input.defaultFrequency,
      isDefault: input.isDefault,
      requiresMembership: input.requiresMembership,
      isActive: input.isActive,
      completionKind: input.completionKind,
      captureKind: input.captureKind,
      deviceMetric: input.deviceMetric,
      targetDurationMinutes: input.targetDurationMinutes,
      targetDistanceMeters: input.targetDistanceMeters,
      targetCount: input.targetCount,
      surpriseEvidenceChancePercent: input.surpriseEvidenceChancePercent,
      surpriseEvidenceWindowSeconds: input.surpriseEvidenceWindowSeconds,
      surpriseEvidencePenaltyPoints: input.surpriseEvidencePenaltyPoints,
    };
  }

  private toDto(
    row: Challenge & { _count: { enrollments: number } },
  ): AdminChallenge {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      instruction: row.instruction,
      category: row.category,
      icon: row.icon,
      rewardPoints: row.rewardPoints,
      defaultFrequency: row.defaultFrequency,
      isDefault: row.isDefault,
      requiresMembership: row.requiresMembership,
      isActive: row.isActive,
      completionKind: row.completionKind,
      captureKind: row.captureKind,
      deviceMetric: row.deviceMetric,
      targetDurationMinutes: row.targetDurationMinutes,
      targetDistanceMeters: row.targetDistanceMeters,
      targetCount: row.targetCount,
      surpriseEvidenceChancePercent: row.surpriseEvidenceChancePercent,
      surpriseEvidenceWindowSeconds: row.surpriseEvidenceWindowSeconds,
      surpriseEvidencePenaltyPoints: row.surpriseEvidencePenaltyPoints,
      enrollmentCount: row._count.enrollments,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
