import { Global, Module } from '@nestjs/common';
import { ENVIRONMENT } from './config.tokens.js';
import { readEnvironment } from './environment.js';

@Global()
@Module({
  providers: [
    {
      provide: ENVIRONMENT,
      // Read once at boot so a bad value fails the process rather than the
      // first request that happens to need it.
      useFactory: () => readEnvironment(),
    },
  ],
  exports: [ENVIRONMENT],
})
export class ConfigModule {}
