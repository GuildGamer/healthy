import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ENVIRONMENT } from '../../shared-modules/config/config.tokens.js';
import type { Environment } from '../../shared-modules/config/environment.js';
import { PeriodRecapDispatcherService } from './period-recap-dispatcher.service.js';

/**
 * Once an hour is enough: dueRecaps is day-keyed and deliveries are unique, so
 * a retry in the same local morning is a no-op.
 */
@Injectable()
export class PeriodRecapScheduler {
  private readonly logger = new Logger(PeriodRecapScheduler.name);
  private isDispatching = false;

  constructor(
    @Inject(ENVIRONMENT) private readonly environment: Environment,
    private readonly dispatcher: PeriodRecapDispatcherService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick(): Promise<void> {
    if (this.environment.schedulerMode !== 'in_process') {
      return;
    }

    if (this.isDispatching) {
      return;
    }

    this.isDispatching = true;
    try {
      const result = await this.dispatcher.dispatchDue();
      if (result.sentCount > 0) {
        this.logger.log(`Sent ${result.sentCount} period recap emails`);
      }
    } catch (error) {
      this.logger.error('Period recap dispatch failed', error);
    } finally {
      this.isDispatching = false;
    }
  }
}
