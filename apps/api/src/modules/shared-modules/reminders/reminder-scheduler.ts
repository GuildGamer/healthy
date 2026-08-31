import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ENVIRONMENT } from '../config/config.tokens.js';
import type { Environment } from '../config/environment.js';
import { ReminderDispatcherService } from './reminder-dispatcher.service.js';

/**
 * The in-process trigger. It owns no logic of its own — the same dispatch runs
 * behind the internal endpoint — so switching to a platform scheduler is a
 * change of `REMINDER_SCHEDULER_MODE`, nothing more.
 */
@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  /** One run at a time: a slow sweep must not stack up behind the next tick. */
  private isDispatching = false;

  constructor(
    @Inject(ENVIRONMENT) private readonly environment: Environment,
    private readonly dispatcher: ReminderDispatcherService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.environment.schedulerMode !== 'in_process') {
      return;
    }

    if (this.isDispatching) {
      this.logger.warn('Skipping tick: the previous dispatch is still running');
      return;
    }

    this.isDispatching = true;

    try {
      await this.dispatcher.dispatchDue();
      await this.dispatcher.dispatchInProgressNudges();
    } catch (error) {
      // Throwing here would take down the timer, and reminders would stop
      // silently until the next deploy.
      this.logger.error('Reminder dispatch failed', error);
    } finally {
      this.isDispatching = false;
    }
  }
}
