import { Module } from '@nestjs/common';
import { ENVIRONMENT } from '../config/config.tokens.js';
import type { Environment } from '../config/environment.js';
import { createMailer } from './mailer.js';
import { MAILER } from './mail.tokens.js';

@Module({
  providers: [
    {
      provide: MAILER,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) => createMailer(environment.mail),
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
