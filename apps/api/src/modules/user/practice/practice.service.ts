import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type { DeviceMetric, PrismaClient } from '@product/db';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import { challengeAccessFilter } from '../../../shared/membership/entitlements.js';
import { effectiveMembershipActive } from '../../../shared/membership/testing-membership.js';
import { DEFAULT_TIME_ZONE, dayKeyFor } from '../../../shared/utils/day-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { StreakService } from '../streak/index.js';
import { PRACTICE_TALLY_LOOKBACK_MS } from './constants/practice.js';
import { PRACTICE_MEMBERSHIP_REQUIRED } from './errors/practice.errors.js';
import type {
  PracticeSessionDto,
  PracticeTotalsDto,
  RecordPracticeSessionDto,
  RecordPracticeSessionInputDto,
} from './dto/index.js';
import type { MeasuredFields } from './types/practice-session.js';

/** Nullable columns are shared with challenge logs; practice always has both. */
function toSessionDto(session: {
  id: string;
  metric: DeviceMetric;
  count: number | null;
  durationSeconds: number | null;
  createdAt: Date;
}): PracticeSessionDto {
  return {
    id: session.id,
    metric: session.metric,
    count: session.count ?? 0,
    durationSeconds: session.durationSeconds ?? 0,
    recordedAt: session.createdAt.toISOString(),
  };
}

/** A late retry of an earlier save must not shorten a session already saved longer. */
function longerOf(existing: MeasuredFields | null, incoming: MeasuredFields): MeasuredFields {
  if (!existing || (existing.durationSeconds ?? 0) <= (incoming.durationSeconds ?? 0)) {
    return incoming;
  }

  return {
    count: existing.count,
    durationSeconds: existing.durationSeconds,
    distanceMeters: existing.distanceMeters,
    endedAt: existing.endedAt,
  };
}

/**
 * Measured sessions that are not a challenge's completion: extra sets, and
 * sets or walks that fell short. Persisted as a `DeviceActivityLog` with no
 * occurrence attached, so they share one history with challenge sessions and
 * count as Today's progress and the day's streak while staying out of the
 * points ledger.
 */
@Injectable()
export class PracticeService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly streak: StreakService,
  ) {}

  async record(
    currentUser: AuthenticatedUser | null | undefined,
    input: RecordPracticeSessionInputDto,
  ): Promise<RecordPracticeSessionDto> {
    const user = requireUser(currentUser);
    await this.assertMetricUnlocked(user.id, input.metric);
    const session = await this.saveSession(user.id, input);
    if (input.proofClipId && !session.userChallengeId) {
      await this.linkProofClip(user.id, input.proofClipId, session.id);
    }

    const streak = await this.streak.recordActiveDay(user.id);
    void this.streak.announceMilestone(user.id, streak);

    return {
      session: toSessionDto(session),
      totals: await this.totalsFor(user.id, input.metric),
    };
  }

  /**
   * The client-supplied externalId makes a retried submit land on the same
   * row, so a flaky network cannot inflate the user's totals. A walk saved
   * again after walking on carries the longer measurement. Once a challenge
   * completion has claimed the row it is that completion's, and stays put.
   */
  private async saveSession(userId: string, input: RecordPracticeSessionInputDto) {
    const key = { userId_externalId: { userId, externalId: input.externalId } };
    const existing = await this.prisma.deviceActivityLog.findUnique({ where: key });
    if (existing?.userChallengeId) {
      return existing;
    }

    const measured = longerOf(existing, {
      count: input.count ?? null,
      durationSeconds: input.durationSeconds,
      distanceMeters: input.distanceMeters ?? null,
      endedAt: new Date(input.endedAt),
    });

    return this.prisma.deviceActivityLog.upsert({
      where: key,
      create: {
        userId,
        userChallengeId: null,
        source: input.source,
        metric: input.metric,
        startedAt: new Date(input.startedAt),
        externalId: input.externalId,
        ...measured,
      },
      update: measured,
    });
  }

  /**
   * Ties the clip that filmed this set to it, so History can open it. Only the
   * member's own clip, still live, and never moved off a session it already
   * belongs to; a clip that does not qualify is simply left unlinked.
   */
  private async linkProofClip(userId: string, clipId: string, sessionId: string): Promise<void> {
    await this.prisma.proofClip.updateMany({
      where: {
        id: clipId,
        userId,
        deviceActivityLogId: null,
        status: { in: ['reserved', 'recorded', 'ready'] },
      },
      data: { deviceActivityLogId: sessionId },
    });
  }

  async totals(
    currentUser: AuthenticatedUser | null | undefined,
    metric: DeviceMetric,
  ): Promise<PracticeTotalsDto> {
    const user = requireUser(currentUser);

    return this.totalsFor(user.id, metric);
  }

  /** Newest practice sessions, for callers composing the activity feed. */
  async listRecent(userId: string, limit: number): Promise<PracticeSessionDto[]> {
    const sessions = await this.prisma.deviceActivityLog.findMany({
      where: { userId, userChallengeId: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return sessions.map(toSessionDto);
  }

  /**
   * Reps and sets inside the user's local day. Bucketing recent rows by day key
   * reuses the challenge day machinery instead of deriving zone offsets here.
   */
  private async totalsFor(
    userId: string,
    metric: DeviceMetric,
    now: Date = new Date(),
  ): Promise<PracticeTotalsDto> {
    const [timeZone, sessions] = await Promise.all([
      this.timeZoneFor(userId),
      this.prisma.deviceActivityLog.findMany({
        where: {
          userId,
          metric,
          userChallengeId: null,
          createdAt: { gte: new Date(now.getTime() - PRACTICE_TALLY_LOOKBACK_MS) },
        },
        select: { count: true, createdAt: true },
      }),
    ]);

    const todayKey = dayKeyFor(timeZone, now);
    const today = sessions.filter((session) => dayKeyFor(timeZone, session.createdAt) === todayKey);

    return {
      todayCount: today.reduce((total, session) => total + (session.count ?? 0), 0),
      todaySessions: today.length,
    };
  }

  /**
   * Practice rides on the same membership rule as the challenge it mirrors: if
   * no accessible challenge tracks this metric, there is nothing to practise.
   */
  private async assertMetricUnlocked(userId: string, metric: DeviceMetric): Promise<void> {
    const membershipActive = await this.membershipActiveFor(userId);

    const unlocked = await this.prisma.challenge.findFirst({
      where: {
        deviceMetric: metric,
        ...challengeAccessFilter(membershipActive),
      },
      select: { id: true },
    });

    if (unlocked) {
      return;
    }

    throw new ORPCError('FORBIDDEN', {
      message: PRACTICE_MEMBERSHIP_REQUIRED,
      data: { reason: 'membership_required' },
    });
  }

  private async membershipActiveFor(userId: string): Promise<boolean> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { membershipActive: true },
    });

    return effectiveMembershipActive(profile?.membershipActive);
  }

  private async timeZoneFor(userId: string): Promise<string> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { timeZone: true },
    });

    return profile?.timeZone ?? DEFAULT_TIME_ZONE;
  }
}
