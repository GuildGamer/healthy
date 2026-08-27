import {
  Controller,
  Get,
  HttpCode,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../prisma/prisma.tokens.js';
import { HealthService } from './health.service.js';

@Controller()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  /** Process liveness — no dependency checks. */
  @Public()
  @Get('/livez')
  @HttpCode(200)
  livez(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness — verifies database connectivity. Returns 503 when DB is down. */
  @Public()
  @Get('/readyz')
  async readyz(): Promise<{ status: 'ok'; database: true }> {
    const database = await this.healthService.checkDatabase(this.prisma);
    if (!database) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: false,
      });
    }

    return {
      status: 'ok',
      database: true,
    };
  }
}
