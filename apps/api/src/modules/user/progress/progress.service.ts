import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { ACTIVITY_PROOF_CLIP_ARGS } from '../../../shared/constants/activity-proof-clip.js';
import { LOCAL_DAY_LAG_MS, LOCAL_DAY_LEAD_MS } from '../../../shared/constants/local-day.js';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import { activityProofClipFrom } from '../../../shared/utils/activity-proof-clip.js';
import { DEFAULT_TIME_ZONE, dayKeyFor, shiftDayKey } from '../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { challengeMarkFor, challengeTitleFor, photoCheckOutcomeFor } from './challenge-mark.js';
import { shareResultFor } from './share-result.js';
import {
  CHALLENGE_MARK_SELECT,
  ENROLLMENT_GOAL_SELECT,
} from './constants/challenge-mark-select.js';
import { HISTORY_WINDOW_DAYS } from './constants/progress.js';
import type { ProgressDayDetailDto, ProgressDaysDto } from './dto/index.js';
import { buildProgressDayDetail } from './progress-day-detail.js';
import { buildProgressDays, dayKeysNewestFirst } from './progress-days.js';
import type {
  DailyOccurrence,
  LedgerDayRow,
  LedgerDetailRow,
  MemberClock,
  PracticeRow,
} from './types/progress.js';

type InstantRange = { from: Date; to: Date };

/**
 * Looking back: one summary per day, and what a single day held. Points come
 * from the ledger. A finish may carry reps, minutes, glasses, or a gym
 * check-in. Readings are never selected.
 */
@Injectable()
export class ProgressService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async days(
    currentUser: AuthenticatedUser | null | undefined,
    now: Date = new Date(),
  ): Promise<ProgressDaysDto> {
    const user = requireUser(currentUser);
    const clock = await this.memberClock(user.id, now);
    const windowStartKey = shiftDayKey(clock.dayKey, -(HISTORY_WINDOW_DAYS - 1));
    const firstDayKey = clock.joinedDayKey > windowStartKey ? clock.joinedDayKey : windowStartKey;

    const [occurrences, ledger] = await Promise.all([
      this.dailyOccurrences(user.id, firstDayKey, clock.dayKey),
      this.ledgerDayRows(user.id, firstDayKey, clock),
    ]);

    return {
      dayKey: clock.dayKey,
      weekStartKey: clock.weekStartKey,
      joinedDayKey: clock.joinedDayKey,
      days: buildProgressDays({
        dayKeys: dayKeysNewestFirst(firstDayKey, clock.dayKey),
        occurrences,
        ledger,
      }),
    };
  }

  async day(
    currentUser: AuthenticatedUser | null | undefined,
    dayKey: string,
    now: Date = new Date(),
  ): Promise<ProgressDayDetailDto> {
    const user = requireUser(currentUser);
    const clock = await this.memberClock(user.id, now);
    const range = this.instantsAround(dayKey, dayKey);
    const isOnDay = (at: Date) => dayKeyFor(clock.timeZone, at) === dayKey;

    const [ledger, dailyOccurrences, practice] = await Promise.all([
      this.ledgerDetailRows(user.id, range),
      this.dailyOccurrences(user.id, dayKey, dayKey),
      this.practiceRows(user.id, range),
    ]);

    return buildProgressDayDetail({
      dayKey,
      ledger: ledger.filter((row) => isOnDay(row.createdAt)),
      dailyOccurrences,
      practice: practice.filter((session) => isOnDay(session.createdAt)),
    });
  }

  private async memberClock(userId: string, now: Date): Promise<MemberClock> {
    const [profile, account] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId }, select: { timeZone: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    ]);
    const timeZone = profile?.timeZone ?? DEFAULT_TIME_ZONE;
    const dayKey = periodKeyFor('daily', timeZone, now);
    const joinedDayKey = account ? dayKeyFor(timeZone, account.createdAt) : dayKey;

    return {
      timeZone,
      dayKey,
      weekStartKey: periodKeyFor('weekly', timeZone, now),
      joinedDayKey: joinedDayKey < dayKey ? joinedDayKey : dayKey,
    };
  }

  /** Wide enough to hold every local day from `firstDayKey` to `lastDayKey`, in any zone. */
  private instantsAround(firstDayKey: string, lastDayKey: string): InstantRange {
    const lastMidnight = Date.parse(`${shiftDayKey(lastDayKey, 1)}T00:00:00.000Z`);
    return {
      from: new Date(Date.parse(`${firstDayKey}T00:00:00.000Z`) - LOCAL_DAY_LEAD_MS),
      to: new Date(lastMidnight + LOCAL_DAY_LAG_MS),
    };
  }

  private async dailyOccurrences(
    userId: string,
    firstDayKey: string,
    lastDayKey: string,
  ): Promise<DailyOccurrence[]> {
    const rows = await this.prisma.userChallenge.findMany({
      where: { userId, frequency: 'daily', periodKey: { gte: firstDayKey, lte: lastDayKey } },
      orderBy: [{ challenge: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
      select: {
        challengeId: true,
        periodKey: true,
        status: true,
        completionOutcome: true,
        enrollment: { select: ENROLLMENT_GOAL_SELECT },
        challenge: { select: CHALLENGE_MARK_SELECT },
      },
    });

    // Legacy rows with no outcome were rewarded, as the best run counts them.
    return rows.map((row) => ({
      ...challengeMarkFor(row),
      dayKey: row.periodKey,
      isRewarded: row.status === 'completed' && row.completionOutcome !== 'penalized',
    }));
  }

  private async ledgerDayRows(
    userId: string,
    firstDayKey: string,
    clock: MemberClock,
  ): Promise<LedgerDayRow[]> {
    const range = this.instantsAround(firstDayKey, clock.dayKey);
    const rows = await this.prisma.pointLedgerEntry.findMany({
      where: { userId, createdAt: { gte: range.from, lt: range.to } },
      select: { delta: true, createdAt: true, userChallengeId: true },
    });

    return rows.map((row) => ({
      dayKey: dayKeyFor(clock.timeZone, row.createdAt),
      delta: row.delta,
      isChallengeLinked: row.userChallengeId !== null,
    }));
  }

  private async ledgerDetailRows(userId: string, range: InstantRange): Promise<LedgerDetailRow[]> {
    const rows = await this.prisma.pointLedgerEntry.findMany({
      where: { userId, createdAt: { gte: range.from, lt: range.to } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        delta: true,
        reason: true,
        createdAt: true,
        userChallenge: {
          select: {
            id: true,
            challengeId: true,
            completedAt: true,
            enrollment: { select: ENROLLMENT_GOAL_SELECT },
            challenge: { select: CHALLENGE_MARK_SELECT },
            surpriseEvidenceRequest: { select: { status: true, windowSeconds: true } },
            deviceActivityLog: {
              select: { metric: true, durationSeconds: true, count: true },
            },
            challengeLog: { select: { payload: true } },
            proofClips: ACTIVITY_PROOF_CLIP_ARGS,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      delta: row.delta,
      reason: row.reason,
      createdAt: row.createdAt,
      occurrence: row.userChallenge
        ? {
            ...challengeMarkFor(row.userChallenge),
            userChallengeId: row.userChallenge.id,
            title: challengeTitleFor(row.userChallenge),
            completedAt: row.userChallenge.completedAt,
            photoCheck: photoCheckOutcomeFor(row.userChallenge),
            share: shareResultFor({
              completionKind: row.userChallenge.challenge.completionKind,
              deviceActivity: row.userChallenge.deviceActivityLog,
              challengeLogPayload: row.userChallenge.challengeLog?.payload ?? null,
            }),
            proofClip: activityProofClipFrom(row.userChallenge.proofClips),
          }
        : null,
    }));
  }

  /** Sessions that finished no challenge — the practice feed. */
  private async practiceRows(userId: string, range: InstantRange): Promise<PracticeRow[]> {
    const rows = await this.prisma.deviceActivityLog.findMany({
      where: { userId, userChallengeId: null, createdAt: { gte: range.from, lt: range.to } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        metric: true,
        count: true,
        durationSeconds: true,
        createdAt: true,
        proofClips: ACTIVITY_PROOF_CLIP_ARGS,
      },
    });

    return rows.map(({ proofClips, ...row }) => ({
      ...row,
      proofClip: activityProofClipFrom(proofClips),
    }));
  }
}
