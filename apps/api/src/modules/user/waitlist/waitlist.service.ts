import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import type { WaitlistEntryDto } from './dto/waitlist.dto.js';

@Injectable()
export class WaitlistService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async join(email: string, source?: string): Promise<WaitlistEntryDto> {
    const entry = await this.prisma.waitlistEntry.upsert({
      where: { email },
      create: { email, source },
      update: { source },
    });

    return { id: entry.id, email: entry.email };
  }
}
