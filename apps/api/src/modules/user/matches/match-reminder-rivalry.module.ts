import { Global, Module } from '@nestjs/common';
import { REMINDER_RIVALRY_SOURCE } from '../../shared-modules/engagement/index.js';
import { MatchReminderRivalryService } from './match-reminder-rivalry.service.js';
import { MatchesModule } from './matches.module.js';

/**
 * Global so the engagement module can inject group standings without
 * importing the groups module, which already imports engagement.
 */
@Global()
@Module({
  imports: [MatchesModule],
  providers: [
    MatchReminderRivalryService,
    { provide: REMINDER_RIVALRY_SOURCE, useExisting: MatchReminderRivalryService },
  ],
  exports: [REMINDER_RIVALRY_SOURCE],
})
export class MatchReminderRivalryModule {}
