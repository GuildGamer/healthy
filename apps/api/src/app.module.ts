import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ORPCModule } from '@orpc/nest';
import { onError } from '@orpc/server';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AuthGuard } from './auth/auth.guard.js';
import { auth } from './auth/auth.js';
import { ChallengesService } from './challenges/challenges.service.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { MeService } from './me/me.service.js';
import { OrpcController } from './orpc/orpc.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WaitlistService } from './waitlist/waitlist.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule.forRoot({
      auth,
      // We register AuthGuard ourselves so routes stay protected by default.
      disableGlobalAuthGuard: true,
    }),
    ORPCModule.forRoot({
      // Prefer request capture via Nest @Req() closures in controllers.
      // A function here is invoked by oRPC without Nest's ExecutionContext.
      context: (_clientContext: unknown) => ({
        user: null,
        session: null,
      }),
      interceptors: [
        onError((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[orpc]', error);
        }),
      ],
    }),
  ],
  controllers: [HealthController, OrpcController],
  providers: [
    HealthService,
    MeService,
    ChallengesService,
    WaitlistService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
