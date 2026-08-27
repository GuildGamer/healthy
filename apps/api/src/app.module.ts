import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ORPCModule } from '@orpc/nest';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AuthGuard } from './auth/auth.guard';
import { auth } from './auth/auth';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { OrpcController } from './orpc/orpc.controller';
import { MeService } from './me/me.service';
import { PrismaModule } from './prisma/prisma.module';
import { WaitlistService } from './waitlist/waitlist.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule.forRoot({
      auth,
      // We register AuthGuard ourselves so routes stay protected by default.
      disableGlobalAuthGuard: true,
    }),
    ORPCModule.forRoot({
      context: (executionContext) => {
        const request = executionContext.switchToHttp().getRequest<{
          user?: { id: string; email: string; name?: string | null };
          session?: unknown;
        }>();
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
