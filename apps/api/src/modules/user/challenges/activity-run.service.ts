import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { consecutiveDayRunEndingOn } from '../../../shared/utils/day-run.js';
import { requireUser, type AuthenticatedUser } from '../../../shared/types/authenticated-user.js';
import { ACTIVITY_RUN_LOOKBACK_DAYS } from './constants/activity-run.js';

const NO_RUN = { runDays: 0 } as const;

/**
 * How many days in a row a member has finished one challenge, as of a given
 * finish. This is the number a share card's "N days running" line shows, so it
 * never borrows the account-wide streak (any activity, any day).
 */
@Injectable()
export class ActivityRunService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Zero (nothing to show) for a finish that is not the member's, not finished,
   * not a daily, or penalised. Read-only, so safe to repeat.
   */
  async getActivityRun(
    currentUser: AuthenticatedUser | null | undefined,
    userChallengeId: string,
  ): Promise<{ runDays: number }> {
    const user = requireUser(currentUser);
    const finish = await this.prisma.userChallenge.findFirst({
      where: { id: userChallengeId, userId: user.id },
      select: {
        challengeId: true,
        periodKey: true,
        frequency: true,
        status: true,
        completionOutcome: true,
      },
    });

    if (!finish || finish.status !== 'completed' || finish.frequency !== 'daily') {
      return NO_RUN;
    }
    if (finish.completionOutcome === 'penalized') {
      return NO_RUN;
    }

    const finishedDays = await this.prisma.userChallenge.findMany({
      where: {
        userId: user.id,
        challengeId: finish.challengeId,
        frequency: 'daily',
        status: 'completed',
        periodKey: { lte: finish.periodKey },
        OR: [{ completionOutcome: null }, { completionOutcome: 'rewarded' }],
      },
      orderBy: { periodKey: 'desc' },
      take: ACTIVITY_RUN_LOOKBACK_DAYS,
      select: { periodKey: true },
    });

    return {
      runDays: consecutiveDayRunEndingOn(
        finishedDays.map((day) => day.periodKey),
        finish.periodKey,
      ),
    };
  }
}
