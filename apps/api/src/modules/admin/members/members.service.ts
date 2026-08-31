import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type {
  AdminMemberListItem,
  AdminMemberOutput,
  AdminMemberSummary,
  AdjustAdminMemberPointsInput,
  SetAdminMemberActiveInput,
} from '@product/contract';
import { normalizeCountryCode } from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdminPermission,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

const OCCURRENCE_LIMIT = 30;
const LEDGER_LIMIT = 50;

@Injectable()
export class AdminMembersService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    query?: string,
  ): Promise<{ members: AdminMemberListItem[]; totalCount: number }> {
    requireAdminPermission(currentAdmin, 'support');

    const search = query?.trim();
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            {
              profile: {
                displayName: { contains: search, mode: 'insensitive' as const },
              },
            },
          ],
        }
      : {};

    const [rows, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { profile: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      totalCount,
      members: rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        displayName: row.profile?.displayName ?? row.name,
        categories: row.profile?.healthCategories ?? [],
        pointsBalance: row.profile?.pointsBalance ?? 0,
        currentStreakDays: row.profile?.currentStreakDays ?? 0,
        deactivatedAt: row.profile?.deactivatedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async lookup(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    email: string,
  ): Promise<AdminMemberOutput> {
    requireAdminPermission(currentAdmin, 'support');
    return this.loadMember(email);
  }

  async adjustPoints(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: AdjustAdminMemberPointsInput,
  ): Promise<{ member: AdminMemberSummary; appliedDelta: number }> {
    const admin = requireAdminPermission(currentAdmin, 'support');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new ORPCError('NOT_FOUND', { message: 'Member not found' });
      }

      const profile = await tx.userProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });

      const appliedDelta =
        input.delta < 0
          ? -Math.min(profile.pointsBalance, Math.abs(input.delta))
          : input.delta;

      if (appliedDelta === 0 && input.delta < 0) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'This member has no points to deduct',
        });
      }

      const audit = await tx.adminAuditEvent.create({
        data: {
          adminUserId: admin.id,
          action: appliedDelta > 0 ? 'point_credit' : 'point_debit',
          targetMemberUserId: user.id,
          reason: input.reason,
          payload: { requested: input.delta, applied: appliedDelta },
        },
      });

      await tx.pointLedgerEntry.create({
        data: {
          userId: user.id,
          delta: appliedDelta,
          reason: input.reason,
          idempotencyKey: `admin_adjustment:${audit.id}`,
        },
      });

      await tx.userProfile.update({
        where: { userId: user.id },
        data: { pointsBalance: { increment: appliedDelta } },
      });

      return {
        member: await this.summaryFor(tx, user.id),
        appliedDelta,
      };
    });
  }

  async setActive(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: SetAdminMemberActiveInput,
  ): Promise<AdminMemberOutput> {
    const admin = requireAdminPermission(currentAdmin, 'support');

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new ORPCError('NOT_FOUND', { message: 'Member not found' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          deactivatedAt: input.isActive ? null : new Date(),
        },
        update: { deactivatedAt: input.isActive ? null : new Date() },
      });

      if (!input.isActive) {
        await tx.session.deleteMany({ where: { userId: user.id } });
      }

      await tx.adminAuditEvent.create({
        data: {
          adminUserId: admin.id,
          action: input.isActive ? 'member_reactivate' : 'member_deactivate',
          targetMemberUserId: user.id,
          reason: input.reason,
        },
      });
    });

    return this.loadMember(user.email);
  }

  private async loadMember(email: string): Promise<AdminMemberOutput> {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true },
    });

    if (!user) {
      throw new ORPCError('NOT_FOUND', { message: 'Member not found' });
    }

    const [member, enrollments, occurrences, ledger] = await Promise.all([
      this.summaryFor(this.prisma, user.id),
      this.prisma.challengeEnrollment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          isActive: true,
          frequency: true,
          challengeId: true,
          challenge: { select: { title: true } },
        },
      }),
      this.prisma.userChallenge.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: OCCURRENCE_LIMIT,
        select: {
          id: true,
          periodKey: true,
          status: true,
          completionOutcome: true,
          completedAt: true,
          challenge: { select: { title: true } },
          ledgerEntries: { select: { delta: true } },
        },
      }),
      this.prisma.pointLedgerEntry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: LEDGER_LIMIT,
        select: {
          id: true,
          delta: true,
          reason: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      member,
      enrollments: enrollments.map((enrollment) => ({
        challengeId: enrollment.challengeId,
        title: enrollment.challenge.title,
        frequency: enrollment.frequency,
        isActive: enrollment.isActive,
      })),
      occurrences: occurrences.map((occurrence) => ({
        id: occurrence.id,
        title: occurrence.challenge.title,
        periodKey: occurrence.periodKey,
        status: occurrence.status,
        outcome: occurrence.completionOutcome,
        pointsDelta: occurrence.ledgerEntries.reduce(
          (total, entry) => total + entry.delta,
          0,
        ),
        completedAt: occurrence.completedAt?.toISOString() ?? null,
      })),
      ledger: ledger.map((entry) => ({
        id: entry.id,
        delta: entry.delta,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  private async summaryFor(
    prisma: Pick<PrismaClient, 'user' | 'userProfile'>,
    userId: string,
  ): Promise<AdminMemberSummary> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: profile?.displayName ?? user.name,
      categories: profile?.healthCategories ?? [],
      timeZone: profile?.timeZone ?? 'UTC',
      countryCode: normalizeCountryCode(profile?.countryCode ?? ''),
      reminderEnabled: profile?.reminderEnabled ?? false,
      evidenceRemindersEnabled: profile?.evidenceRemindersEnabled ?? true,
      promotionalMessagesEnabled: profile?.promotionalMessagesEnabled ?? false,
      showOnLeaderboard: profile?.showOnLeaderboard ?? true,
      healthLinkStatus: profile?.healthLinkStatus ?? 'unknown',
      pointsBalance: profile?.pointsBalance ?? 0,
      currentStreakDays: profile?.currentStreakDays ?? 0,
      deactivatedAt: profile?.deactivatedAt?.toISOString() ?? null,
    };
  }
}
