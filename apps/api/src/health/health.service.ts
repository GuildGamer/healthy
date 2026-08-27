import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';

@Injectable()
export class HealthService {
  async checkDatabase(prisma: PrismaClient): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  getContractHealth(): {
    status: 'ok';
    service: string;
    timestamp: string;
  } {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }
}
