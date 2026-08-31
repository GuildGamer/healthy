import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { PrismaClient } from '@product/db';
import { readEnvironment } from '../config/environment.js';
import { PRISMA } from '../database/prisma.tokens.js';
import { ensureBootstrapSuperadmin } from './admin-bootstrap.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { auth } from './auth.js';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      // We register AuthGuard ourselves so routes stay protected by default.
      disableGlobalAuthGuard: true,
    }),
  ],
  controllers: [AdminAuthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthRootModule implements OnModuleInit {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async onModuleInit(): Promise<void> {
    await ensureBootstrapSuperadmin(this.prisma, readEnvironment());
  }
}
