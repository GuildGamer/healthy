import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthRootModule {}
