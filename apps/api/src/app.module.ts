import { ExecutionContext, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ORPCModule } from '@orpc/nest';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AuthGuard } from './auth/auth.guard.js';
import { auth } from './auth/auth.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { MeService } from './me/me.service.js';
import { OrpcController } from './orpc/orpc.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WaitlistService } from './waitlist/waitlist.service.js';

type RequestWithAuth = {
  user?: { id: string; email: string; name?: string | null };
  session?: unknown;
};

@Module({
  imports: [
    PrismaModule,
    AuthModule.forRoot({
      auth,
      // We register AuthGuard ourselves so routes stay protected by default.
      disableGlobalAuthGuard: true,
    }),
    ORPCModule.forRoot({
      context: (executionContext: ExecutionContext) => {
        const request = executionContext
          .switchToHttp()
          .getRequest<RequestWithAuth>();
        return {
          user: request.user ?? null,
          session: request.session ?? null,
        };
      },
    }),
  ],
  controllers: [HealthController, OrpcController],
  providers: [
    HealthService,
    MeService,
    WaitlistService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
