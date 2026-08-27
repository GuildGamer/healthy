import { Controller, Get, HttpCode, Inject } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../prisma/prisma.tokens';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  /** Process liveness — no dependency checks. */
  @AllowAnonymous()
  @Get('/livez')
  @HttpCode(200)
  livez(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness — verifies database connectivity. */
  @AllowAnonymous()
  @Get('/readyz')
  async readyz(): Promise<{ status: 'ok' | 'degraded'; database: boolean }> {
    const database = await this.healthService.checkDatabase(this.prisma);
    return {
      status: database ? 'ok' : 'degraded',
      database,
    };
  }
}
