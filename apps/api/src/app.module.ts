import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ORPCModule } from '@orpc/nest';
import { onError } from '@orpc/server';
import modules from './modules/index.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    ...modules,
  ],
})
export class AppModule {}
