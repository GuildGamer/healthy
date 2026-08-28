import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type { HealthCategory, PrismaClient } from '@product/db';
import { PRISMA } from '../prisma/prisma.tokens.js';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type MeResult = {
  id: string;
  email: string;
  name: string | null;
  categories: HealthCategory[];
  pointsBalance: number;
  currentStreakDays: number;
};

@Injectable()
export class MeService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async getMe(user: AuthenticatedUser | null | undefined): Promise<MeResult> {
    if (!user) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Authentication required',
      });
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        healthCategories: true,
        pointsBalance: true,
        currentStreakDays: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      categories: profile?.healthCategories ?? [],
      pointsBalance: profile?.pointsBalance ?? 0,
      currentStreakDays: profile?.currentStreakDays ?? 0,
    };
  }

  async updateCategories(
    user: AuthenticatedUser | null | undefined,
    categories: readonly HealthCategory[],
  ): Promise<MeResult> {
    if (!user) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Authentication required',
      });
    }

    if (categories.length === 0) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Select at least one health category',
      });
    }

    const uniqueCategories = [...new Set(categories)];

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        healthCategories: [...uniqueCategories],
      },
      update: {
        healthCategories: [...uniqueCategories],
      },
    });

    return this.getMe(user);
  }
}
