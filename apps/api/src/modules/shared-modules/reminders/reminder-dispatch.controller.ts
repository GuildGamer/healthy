import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import type { DispatchSummaryDto } from './dto/dispatch-summary.dto.js';
import { InternalSecretGuard } from './internal-secret.guard.js';
import { ReminderDispatcherService } from './reminder-dispatcher.service.js';

/**
 * The external trigger. Deliberately outside the oRPC contract: this is
 * machine-to-machine plumbing for a platform scheduler, not public API.
 */
@Controller('internal/reminders')
export class ReminderDispatchController {
  constructor(private readonly dispatcher: ReminderDispatcherService) {}

  /** `@Public()` skips the session check; the secret guard replaces it. */
  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('dispatch')
  @HttpCode(200)
  async dispatch(): Promise<DispatchSummaryDto> {
    const reminders = await this.dispatcher.dispatchDue();
    const nudges = await this.dispatcher.dispatchInProgressNudges();

    return {
      dueCount: reminders.dueCount + nudges.dueCount,
      sentCount: reminders.sentCount + nudges.sentCount,
      suppressedCount: reminders.suppressedCount + nudges.suppressedCount,
    };
  }
}
