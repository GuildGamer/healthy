import { Inject, Injectable } from '@nestjs/common';
import type { ListPublicTipsOutput } from '@product/contract';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

@Injectable()
export class TipsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listActive(): Promise<ListPublicTipsOutput> {
    const tips = await this.prisma.tip.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, category: true, title: true, body: true },
    });

    return { tips };
  }
}
