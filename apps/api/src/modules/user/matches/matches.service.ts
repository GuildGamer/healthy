import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  MATCH_ATTEMPT_MAX_BY_METRIC,
  MATCH_ATTEMPT_SOURCE_BY_METRIC,
  MATCH_PARTICIPANT_CAP,
  matchContestTitle,
  matchInviteUrl,
  resolveMatchLength,
  type ListMyMatchesOutput,
  type MatchBoard,
  type MatchMetric,
  type MatchPreview,
  type MatchScoringMode,
  type SubmitMatchAttemptInput,
} from '@product/contract';
import type {
  DeviceActivitySource,
  DeviceMetric,
  PrismaClient,
} from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { DEFAULT_TIME_ZONE, dayKeyFor } from '../../../shared/utils/day-key.js';
import { ENVIRONMENT, type Environment } from '../../shared-modules/config/index.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { CrewSeatNotifierService, CrewsService } from '../crews/index.js';
import { publicNameFor } from '../leaderboard/pseudonym.js';
import type {
  CreateMatchDto,
  CreateMatchInputDto,
  ListMyMatchesDto,
  MatchBoardDto,
} from './dto/match.dto.js';
import {
  MATCH_COUNT_TOO_LARGE,
  MATCH_ENDED,
  MATCH_FULL,
  MATCH_NOT_FOUND,
  MATCH_NOT_HOST,
  MATCH_NOT_OPEN,
  MATCH_NOT_PARTICIPANT,
  MATCH_WRONG_ACTIVITY,
} from './errors/match.errors.js';
import {
  computeStandings,
  type MatchScoringRules,
  type StandingEvent,
} from './match-standings.js';
import { createInviteToken } from './match-token.js';
import { matchLengthBounds } from './match-window.js';
import type { LoadedMatch } from './types/loaded-match.js';

function scoringRulesFor(match: LoadedMatch): MatchScoringRules {
  return { scoringMode: match.scoringMode, metric: match.metric };
}

/**
 * Walk sources a contest will score: every one of them is measured by a
 * sensor. `manual` is absent on purpose — see `loadTrackedWalkEvents`.
 */
const TRACKED_WALK_SOURCES: DeviceActivitySource[] = [
  'in_app_gps',
  'healthkit',
  'health_connect',
  'pedometer',
];

/**
 * The catalog activity a contest metric means. Two enums with the same
 * literals stay two enums: the catalog tracks metrics a group cannot be
 * built on (sleep, weight), so the crossing is written out once here.
 */
const DEVICE_METRIC_BY_MATCH_METRIC: Record<MatchMetric, DeviceMetric> = {
  pushups: 'pushups',
  walk: 'walk',
};

const matchInclude = {
  hostUser: { include: { profile: true } },
  participants: { include: { user: { include: { profile: true } } } },
  attempts: true,
} as const;

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
    private readonly crewsService: CrewsService,
    private readonly crewSeatNotifier: CrewSeatNotifierService,
  ) {}

  private inviteUrlFor(token: string): string {
    return matchInviteUrl(this.environment.websiteUrl, token);
  }

  /**
   * Who a saved roster seats, host excluded. The cap counts the host, so a
   * crew can only fill the remaining seats.
   */
  private async crewSeats(
    hostUserId: string,
    crewId: string | undefined,
  ): Promise<string[]> {
    if (!crewId) {
      return [];
    }

    const memberIds = await this.crewsService.activeMemberIdsForOwner(
      hostUserId,
      crewId,
    );

    return memberIds
      .filter((userId) => userId !== hostUserId)
      .slice(0, MATCH_PARTICIPANT_CAP - 1);
  }

  async create(
    currentUser: AuthenticatedUser | null | undefined,
    input: CreateMatchInputDto,
  ): Promise<CreateMatchDto> {
    const user = requireUser(currentUser);
    const now = new Date();
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });
    const bounds = matchLengthBounds(
      resolveMatchLength(input),
      profile?.timeZone ?? DEFAULT_TIME_ZONE,
      now,
    );

    const seatedUserIds = await this.crewSeats(user.id, input.crewId);

    const created = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          hostUserId: user.id,
          inviteToken: createInviteToken(),
          metric: input.metric,
          scoringMode: input.scoringMode,
          dailyScope: input.dailyScope,
          startsAt: bounds.startsAt,
          endsAt: bounds.endsAt,
          crewId: input.crewId ?? null,
        },
      });

      await tx.matchParticipant.create({
        // The host set this up, so they have accepted by definition.
        data: { matchId: match.id, userId: user.id, acceptedAt: now },
      });

      if (seatedUserIds.length > 0) {
        await tx.matchParticipant.createMany({
          // Seated pending: they hold a seat but have not agreed to play.
          data: seatedUserIds.map((userId) => ({
            matchId: match.id,
            userId,
            acceptedAt: null,
          })),
        });
      }

      return tx.match.findUniqueOrThrow({
        where: { id: match.id },
        include: matchInclude,
      });
    });

    // After the commit, and never fatal: a contest that exists is worth more
    // than a push that landed. A failed send is not retried, because a late
    // "you were added" is worse than none.
    await this.notifySeated(created.id, seatedUserIds);

    return {
      match: await this.buildBoard(created, user.id),
      invite: {
        token: created.inviteToken,
        url: this.inviteUrlFor(created.inviteToken),
      },
    };
  }

  private async notifySeated(
    matchId: string,
    seatedUserIds: readonly string[],
  ): Promise<void> {
    try {
      await this.crewSeatNotifier.notifySeated(matchId, seatedUserIds);
    } catch (error) {
      this.logger.error(
        `Could not notify crew seats for match ${matchId}`,
        error,
      );
    }
  }

  async preview(
    currentUser: AuthenticatedUser | null | undefined,
    token: string,
  ): Promise<MatchPreview> {
    const user = requireUser(currentUser);
    const match = await this.loadByToken(token);
    const live = await this.settleIfDue(match);

    return {
      token: live.inviteToken,
      matchId: live.id,
      hostDisplayName: publicNameFor(
        live.hostUserId,
        live.hostUser.profile?.displayName,
      ),
      metric: live.metric,
      scoringMode: live.scoringMode,
      dailyScope: live.dailyScope,
      endsAt: live.endsAt.toISOString(),
      participantCount: live.participants.length,
      participantCap: MATCH_PARTICIPANT_CAP,
      status: live.status,
      alreadyJoined: this.isParticipant(live, user.id),
      viewerIsHost: live.hostUserId === user.id,
    };
  }

  async join(
    currentUser: AuthenticatedUser | null | undefined,
    token: string,
  ): Promise<MatchBoardDto> {
    const user = requireUser(currentUser);
    const match = await this.settleIfDue(await this.loadByToken(token));

    // Opening an invite for a seat you already hold is how a crew-seated
    // member accepts.
    if (this.isParticipant(match, user.id)) {
      return await this.buildBoard(
        await this.acceptSeat(match, user.id),
        user.id,
      );
    }

    this.assertJoinable(match);

    try {
      await this.prisma.$transaction(async (tx) => {
        const seated = await tx.matchParticipant.count({
          where: { matchId: match.id },
        });
        if (seated >= MATCH_PARTICIPANT_CAP) {
          throw new ORPCError('BAD_REQUEST', { message: MATCH_FULL });
        }

        await tx.matchParticipant.create({
          // Arriving by link is itself an acceptance.
          data: { matchId: match.id, userId: user.id, acceptedAt: new Date() },
        });
      });
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }

      const raced = await this.loadByToken(token);
      if (this.isParticipant(raced, user.id)) {
        return await this.buildBoard(raced, user.id);
      }

      throw new ORPCError('BAD_REQUEST', { message: MATCH_FULL });
    }

    return await this.buildBoard(await this.loadByToken(token), user.id);
  }

  async get(
    currentUser: AuthenticatedUser | null | undefined,
    matchId: string,
  ): Promise<MatchBoardDto> {
    const user = requireUser(currentUser);
    const match = await this.settleIfDue(await this.loadById(matchId));
    this.assertParticipant(match, user.id);
    // Opening the contest is the accept. A crew seat costs the member one tap
    // to decline (ignore the push) and none to take part.
    return await this.buildBoard(await this.acceptSeat(match, user.id), user.id);
  }

  async listMine(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListMyMatchesDto> {
    const user = requireUser(currentUser);
    const rows = await this.prisma.matchParticipant.findMany({
      where: { userId: user.id },
      include: { match: { include: matchInclude } },
      orderBy: { joinedAt: 'desc' },
    });

    const live: ListMyMatchesOutput['live'] = [];
    const ended: ListMyMatchesOutput['ended'] = [];

    for (const row of rows) {
      const match = await this.settleIfDue(row.match);
      const board = await this.buildBoard(match, user.id);
      const item = {
        id: board.id,
        title: matchContestTitle(
          board.standings
            .filter((standing) => !standing.isYou)
            .map((standing) => standing.displayName),
        ),
        metric: board.metric,
        scoringMode: board.scoringMode,
        dailyScope: board.dailyScope,
        endsAt: board.endsAt,
        status: board.status,
        participantCount: board.participantCount,
        yourScore: board.yourScore,
        yourBestCount: board.yourScore,
        yourRank: board.standings.find((standing) => standing.isYou)?.rank ?? null,
      };

      if (board.status === 'open') {
        live.push(item);
      } else {
        ended.push(item);
      }
    }

    return { live, ended };
  }

  async submitAttempt(
    currentUser: AuthenticatedUser | null | undefined,
    input: SubmitMatchAttemptInput,
  ): Promise<MatchBoardDto> {
    const user = requireUser(currentUser);
    const loaded = await this.settleIfDue(await this.loadById(input.matchId));
    this.assertParticipant(loaded, user.id);
    // Logging a set is the strongest form of agreeing to play, so it accepts
    // a pending seat rather than being rejected by it.
    const match = await this.acceptSeat(loaded, user.id);

    if (match.status !== 'open') {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_NOT_OPEN });
    }

    this.assertAttemptFitsMetric(match.metric, input);

    await this.prisma.matchAttempt.create({
      data: {
        matchId: match.id,
        userId: user.id,
        count: input.count,
        durationSeconds: input.durationSeconds,
        source: input.source,
      },
    });

    const fresh = await this.loadById(match.id);
    return await this.buildBoard(fresh, user.id);
  }

  async cancel(
    currentUser: AuthenticatedUser | null | undefined,
    matchId: string,
  ): Promise<MatchBoardDto> {
    const user = requireUser(currentUser);
    const match = await this.settleIfDue(await this.loadById(matchId));
    this.assertParticipant(match, user.id);

    if (match.hostUserId !== user.id) {
      throw new ORPCError('FORBIDDEN', { message: MATCH_NOT_HOST });
    }

    if (match.status !== 'open') {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_NOT_OPEN });
    }

    const updated = await this.prisma.match.updateMany({
      where: { id: match.id, status: 'open' },
      data: {
        status: 'cancelled',
        settledAt: new Date(),
        winnerUserId: null,
      },
    });

    if (updated.count === 0) {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_NOT_OPEN });
    }

    return await this.buildBoard(await this.loadById(match.id), user.id);
  }

  private async loadByToken(token: string): Promise<LoadedMatch> {
    const match = await this.prisma.match.findUnique({
      where: { inviteToken: token },
      include: matchInclude,
    });

    if (!match) {
      throw new ORPCError('NOT_FOUND', { message: MATCH_NOT_FOUND });
    }

    return match;
  }

  private async loadById(matchId: string): Promise<LoadedMatch> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: matchInclude,
    });

    if (!match) {
      throw new ORPCError('NOT_FOUND', { message: MATCH_NOT_FOUND });
    }

    return match;
  }

  private async settleIfDue(match: LoadedMatch): Promise<LoadedMatch> {
    if (match.status !== 'open' || match.endsAt.getTime() > Date.now()) {
      return match;
    }

    const { winnerUserId } = computeStandings(
      this.standingParticipants(match),
      await this.loadScoringEvents(match),
      scoringRulesFor(match),
    );

    await this.prisma.match.updateMany({
      where: { id: match.id, status: 'open' },
      data: {
        status: 'completed',
        settledAt: new Date(),
        winnerUserId,
      },
    });

    return this.loadById(match.id);
  }

  /**
   * A score is only meaningful in the unit its contest is scored in, so the
   * capture has to match the metric and stay inside that metric's ceiling.
   * Derived from the stored match rather than from anything the client sent.
   */
  private assertAttemptFitsMetric(
    metric: MatchMetric,
    input: SubmitMatchAttemptInput,
  ): void {
    if (input.source !== MATCH_ATTEMPT_SOURCE_BY_METRIC[metric]) {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_WRONG_ACTIVITY });
    }

    if (input.count > MATCH_ATTEMPT_MAX_BY_METRIC[metric]) {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_COUNT_TOO_LARGE });
    }
  }

  private assertJoinable(match: LoadedMatch): void {
    if (match.status !== 'open') {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_ENDED });
    }

    if (match.participants.length >= MATCH_PARTICIPANT_CAP) {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_FULL });
    }
  }

  /**
   * Marks a pending seat accepted. Idempotent, and a no-op reload-free path
   * for the common case where the viewer accepted long ago.
   */
  private async acceptSeat(
    match: LoadedMatch,
    userId: string,
  ): Promise<LoadedMatch> {
    const seat = match.participants.find((row) => row.userId === userId);

    if (!seat || seat.acceptedAt !== null) {
      return match;
    }

    await this.prisma.matchParticipant.updateMany({
      where: { matchId: match.id, userId, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });

    return this.loadById(match.id);
  }

  private assertParticipant(match: LoadedMatch, userId: string): void {
    if (!this.isParticipant(match, userId)) {
      throw new ORPCError('FORBIDDEN', { message: MATCH_NOT_PARTICIPANT });
    }
  }

  private isParticipant(match: LoadedMatch, userId: string): boolean {
    return match.participants.some((row) => row.userId === userId);
  }

  private standingParticipants(match: LoadedMatch) {
    return match.participants.map((row) => ({
      userId: row.userId,
      displayName: publicNameFor(row.userId, row.user.profile?.displayName),
      isHost: row.userId === match.hostUserId,
      isPending: row.acceptedAt === null,
    }));
  }

  private acceptedUserIds(match: LoadedMatch): string[] {
    return match.participants
      .filter((row) => row.acceptedAt !== null)
      .map((row) => row.userId);
  }

  /**
   * Where a contest's score comes from. Attempt-driven modes read the sets
   * logged against the match plus the same activity logged anywhere else in
   * the app; `days_completed` reads the daily occurrences the member already
   * finished. No mode asks for a second log of work already done.
   */
  private async loadScoringEvents(
    match: LoadedMatch,
  ): Promise<StandingEvent[]> {
    if (match.scoringMode === 'days_completed') {
      return this.loadDailyCompletionEvents(match);
    }

    const timeZone = this.contestTimeZone(match);
    const attempts = match.attempts.map((attempt) => ({
      userId: attempt.userId,
      count: attempt.count,
      dayKey: dayKeyFor(timeZone, attempt.recordedAt),
      occurredAt: attempt.recordedAt,
    }));

    return [...attempts, ...(await this.loadTrackedWalkEvents(match, timeZone))];
  }

  /**
   * Walks the member already recorded elsewhere — the daily walk challenge,
   * or a workout imported from their health app. A contest must not make
   * somebody walk twice, so those minutes land on the board on their own.
   *
   * Hand-confirmed walks are excluded: a score anybody can type is not a
   * score the rest of the group can trust. The group's own walk screen writes
   * a `MatchAttempt` and no activity log, so nothing is counted twice.
   */
  private async loadTrackedWalkEvents(
    match: LoadedMatch,
    timeZone: string,
  ): Promise<StandingEvent[]> {
    if (match.metric !== 'walk') {
      return [];
    }

    const walks = await this.prisma.deviceActivityLog.findMany({
      where: {
        // Pending members are not read at all, rather than read and
        // discarded. Nobody's health data is touched before they accept.
        userId: { in: this.acceptedUserIds(match) },
        metric: 'walk',
        source: { in: TRACKED_WALK_SOURCES },
        // The walk itself has to fall inside the contest, so importing an old
        // workout mid-contest cannot backfill a win.
        OR: [
          { endedAt: { gte: match.startsAt, lte: match.endsAt } },
          {
            endedAt: null,
            createdAt: { gte: match.startsAt, lte: match.endsAt },
          },
        ],
      },
      select: {
        userId: true,
        durationSeconds: true,
        endedAt: true,
        createdAt: true,
      },
    });

    return walks.flatMap((walk) => {
      const minutes = Math.floor((walk.durationSeconds ?? 0) / 60);
      if (minutes < 1) {
        return [];
      }

      const occurredAt = walk.endedAt ?? walk.createdAt;
      return [
        {
          userId: walk.userId,
          count: minutes,
          dayKey: dayKeyFor(timeZone, occurredAt),
          occurredAt,
        },
      ];
    });
  }

  /**
   * A finished daily occurrence earns the day. Which occurrences count is the
   * host's call: the default takes any of them, so people managing different
   * things compete on showing up and nobody's conditions reach the board, and
   * `chosen_activity` narrows it to the contest's activity for a group racing
   * one habit. Either way the day comes from work already logged.
   */
  private async loadDailyCompletionEvents(
    match: LoadedMatch,
  ): Promise<StandingEvent[]> {
    const completions = await this.prisma.userChallenge.findMany({
      where: {
        // Pending members are not read at all, rather than read and discarded.
        // Nobody's health data is touched before they accept.
        userId: { in: this.acceptedUserIds(match) },
        frequency: 'daily',
        status: 'completed',
        completedAt: { gte: match.startsAt, lte: match.endsAt },
        ...this.dailyScopeFilter(match),
      },
      select: { userId: true, periodKey: true, completedAt: true },
    });

    return completions.flatMap((row) =>
      row.completedAt
        ? [
            {
              userId: row.userId,
              count: 1,
              dayKey: row.periodKey,
              occurredAt: row.completedAt,
            },
          ]
        : [],
    );
  }

  /**
   * Narrows a streak to its own activity. A challenge declares the activity
   * it measures, so the scope reads that rather than guessing from titles.
   */
  private dailyScopeFilter(
    match: LoadedMatch,
  ): { challenge: { deviceMetric: DeviceMetric } } | Record<string, never> {
    if (match.dailyScope !== 'chosen_activity') {
      return {};
    }

    return {
      challenge: { deviceMetric: DEVICE_METRIC_BY_MATCH_METRIC[match.metric] },
    };
  }

  /** One zone for the whole contest, so a shared daily cap treats everyone alike. */
  private contestTimeZone(match: LoadedMatch): string {
    return match.hostUser.profile?.timeZone ?? DEFAULT_TIME_ZONE;
  }

  private async buildBoard(
    match: LoadedMatch,
    viewerId: string,
  ): Promise<MatchBoard> {
    const { standings } = computeStandings(
      this.standingParticipants(match),
      await this.loadScoringEvents(match),
      scoringRulesFor(match),
    );
    const yourScore =
      standings.find((row) => row.userId === viewerId)?.score ?? 0;

    return {
      id: match.id,
      token: match.inviteToken,
      inviteUrl: this.inviteUrlFor(match.inviteToken),
      metric: match.metric,
      scoringMode: match.scoringMode,
      dailyScope: match.dailyScope,
      startsAt: match.startsAt.toISOString(),
      endsAt: match.endsAt.toISOString(),
      status: match.status,
      participantCount: match.participants.length,
      participantCap: MATCH_PARTICIPANT_CAP,
      yourScore,
      yourBestCount: yourScore,
      winnerUserId: match.winnerUserId,
      standings: standings.map((row) => ({
        ...row,
        isYou: row.userId === viewerId,
      })),
      canSaveCrew: this.canSaveCrew(match),
    };
  }

  /**
   * A crew is offered from a contest that already happened and had other
   * people in it. Contests seated from a crew are skipped — that roster is
   * saved already.
   */
  private canSaveCrew(match: LoadedMatch): boolean {
    return (
      match.status !== 'open' &&
      match.crewId === null &&
      match.participants.length > 1
    );
  }
}
