import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PeriodReportPeriod } from '@product/contract';
import type { PrismaClient } from '@product/db';
import { dayKeyFor, shiftDayKey } from '../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { ENVIRONMENT } from '../../shared-modules/config/config.tokens.js';
import type { Environment } from '../../shared-modules/config/environment.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import type { Mailer } from '../../shared-modules/mail/mailer.js';
import { MAILER } from '../../shared-modules/mail/mail.tokens.js';
import { periodRecapMail } from '../../shared-modules/mail/period-recap-mail-content.js';
import { ProgressService } from './progress.service.js';

type RecapCandidate = {
  userId: string;
  email: string;
  period: PeriodReportPeriod;
  periodKey: string;
};

/**
 * Sends week / month / year recap emails the morning after a window closes.
 * Idempotent via `period_recap_deliveries`. Audience: reminder-enabled members.
 */
@Injectable()
export class PeriodRecapDispatcherService {
  private readonly logger = new Logger(PeriodRecapDispatcherService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
    private readonly progress: ProgressService,
  ) {}

  async dispatchDue(now: Date = new Date()): Promise<{ sentCount: number }> {
    const profiles = await this.prisma.userProfile.findMany({
      where: { reminderEnabled: true },
      select: {
        userId: true,
        timeZone: true,
        user: { select: { email: true } },
      },
    });

    let sentCount = 0;
    for (const profile of profiles) {
      for (const item of this.dueRecaps(profile.timeZone, now)) {
        const sent = await this.sendIfNew({
          userId: profile.userId,
          email: profile.user.email,
          period: item.period,
          periodKey: item.periodKey,
        });
        if (sent) {
          sentCount += 1;
        }
      }
    }

    return { sentCount };
  }

  /** Local Mondays get last week; the 1st gets last month; Jan 1 gets last year. */
  dueRecaps(
    timeZone: string,
    now: Date,
  ): { period: PeriodReportPeriod; periodKey: string }[] {
    const today = dayKeyFor(timeZone, now);
    const due: { period: PeriodReportPeriod; periodKey: string }[] = [];

    const weekStart = periodKeyFor('weekly', timeZone, now);
    if (today === weekStart) {
      due.push({ period: 'week', periodKey: shiftDayKey(weekStart, -7) });
    }

    if (today.endsWith('-01')) {
      const thisMonth = periodKeyFor('monthly', timeZone, now);
      const prevMonthDate = new Date(`${thisMonth}T12:00:00.000Z`);
      prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1);
      due.push({
        period: 'month',
        periodKey: prevMonthDate.toISOString().slice(0, 10),
      });
    }

    if (today.endsWith('-01-01')) {
      const year = Number(today.slice(0, 4)) - 1;
      due.push({ period: 'year', periodKey: `${year}-01-01` });
    }

    return due;
  }

  private async sendIfNew(candidate: RecapCandidate): Promise<boolean> {
    const existing = await this.prisma.periodRecapDelivery.findUnique({
      where: {
        userId_period_periodKey: {
          userId: candidate.userId,
          period: candidate.period,
          periodKey: candidate.periodKey,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return false;
    }

    const asOf = new Date(`${this.windowEnd(candidate)}T12:00:00.000Z`);
    const report = await this.progress.periodReport(
      { id: candidate.userId, email: candidate.email, name: '' },
      candidate.period,
      asOf,
    );

    const highlightLine = report.highlight
      ? `${report.highlight.count.toLocaleString('en-US')} ${report.highlight.unit}`
      : null;

    const openUrl = `${this.environment.websiteUrl.replace(/\/$/, '')}/app/progress/report?period=${candidate.period}`;
    const content = periodRecapMail({
      period: candidate.period,
      periodLabel: report.periodLabel,
      activeDays: report.activeDays,
      highlightLine,
      openUrl,
    });

    try {
      await this.mailer.sendMessage({
        to: candidate.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
      await this.prisma.periodRecapDelivery.create({
        data: {
          userId: candidate.userId,
          period: candidate.period,
          periodKey: candidate.periodKey,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Period recap email failed for ${candidate.userId} ${candidate.period}`,
        error,
      );
      return false;
    }
  }

  private windowEnd(candidate: RecapCandidate): string {
    if (candidate.period === 'week') {
      return shiftDayKey(candidate.periodKey, 6);
    }
    if (candidate.period === 'month') {
      const start = new Date(`${candidate.periodKey}T12:00:00.000Z`);
      start.setUTCMonth(start.getUTCMonth() + 1);
      start.setUTCDate(0);
      return start.toISOString().slice(0, 10);
    }
    return `${candidate.periodKey.slice(0, 4)}-12-31`;
  }
}
