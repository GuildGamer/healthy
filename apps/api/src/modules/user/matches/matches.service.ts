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
  type MatchListItem,
  type MatchMetric,
  type MatchPreview,
  type MatchReactionSent,
  type MatchScoringMode,
  type ReactToMatchMemberInput,
  type SubmitMatchAttemptInput,
} from '@product/contract';
import type { DeviceActivitySource, DeviceMetric, PrismaClient } from '@product/db';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import { DEFAULT_TIME_ZONE, dayKeyFor } from '../../../shared/utils/day-key.js';
import { ENVIRONMENT, type Environment } from '../../shared-modules/config/index.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { AnalyticsService } from '../analytics/index.js';
import { CrewSeatNotifierService, CrewsService } from '../crews/index.js';
import { groupNameFor } from '../../../shared/utils/group-name.js';
import { BoardMoveNotifierService } from './board-move-notifier.service.js';
import { InviteAcceptedNotifierService } from './invite-accepted-notifier.service.js';
import type {
  CreateMatchDto,
  CreateMatchInputDto,
  ListMyMatchesDto,
  MatchBoardDto,
  PublicMatchInvitePreviewDto,
} from './dto/match.dto.js';
import {
  MATCH_COUNT_TOO_LARGE,
  MATCH_ENDED,
  MATCH_FULL,
  MATCH_HOST_CANNOT_LEAVE,
  MATCH_INVALID_PARENT,
  MATCH_INVALID_SOURCE_CHALLENGE,
  MATCH_NOT_FOUND,
  MATCH_NOT_HOST,
  MATCH_NOT_OPEN,
  MATCH_NOT_PARTICIPANT,
  MATCH_REACTION_NOT_ALLOWED,
  MATCH_WRONG_ACTIVITY,
} from './errors/match.errors.js';
import { MATCH_LIST_ROSTER_SIZE } from './constants/match.js';
import { lastMoveFor, rosterFor } from './match-list-item.js';
import { MatchReactionNotifierService } from './match-reaction-notifier.service.js';
import { MatchReactionsService } from './match-reactions.service.js';
import { computeStandings, type MatchScoringRules, type StandingEvent } from './match-standings.js';
import { dayStripFor, movedDayKeysByUser } from './match-days.js';
import { doneTodayUserIds } from './match-today.js';
import { createInviteToken } from './match-token.js';
import { matchLengthBounds } from './match-window.js';
import type { LoadedMatch } from './types/loaded-match.js';
import type { ReminderContest } from './types/reminder-contest.js';
import type { ScoredMatch } from './types/scored-match.js';

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
  squats: 'squats',
  plank: 'plank',
  jumping_jacks: 'jumping_jacks',
  burpees: 'burpees',
  sit_ups: 'sit_ups',
  mountain_climbers: 'mountain_climbers',
  lunges: 'lunges',
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
    private readonly analyticsService: AnalyticsService,
    private readonly inviteAcceptedNotifier: InviteAcceptedNotifierService,
    private readonly boardMoveNotifier: BoardMoveNotifierService,
    private readonly matchReactions: MatchReactionsService,
    private readonly matchReactionNotifier: MatchReactionNotifierService,
  ) {}

  private async trackMatchEvent(
    user: AuthenticatedUser | null,
    name:
      | 'challenge_accepted'
      | 'challenge_recipient_signed_up'
      | 'challenge_started_by_recipient'
      | 'challenge_completed_by_recipient'
      | 'invite_first_attempt',
    match: Pick<
      LoadedMatch,
      'id' | 'inviteToken' | 'experimentId' | 'experimentVariantKey' | 'parentMatchId'
    >,
  ): Promise<void> {
    try {
      await this.analyticsService.track(user, {
        name,
        properties: {
          matchId: match.id,
          inviteToken: match.inviteToken,
          experimentId: match.experimentId,
          experimentVariantKey: match.experimentVariantKey,
          parentMatchId: match.parentMatchId,
        },
      });
    } catch (error) {
      this.logger.error(`Could not track ${name} for match ${match.id}`, error);
    }
  }

  private inviteUrlFor(token: string): string {
    return matchInviteUrl(this.environment.websiteUrl, token);
  }

  /**
   * Who a saved roster seats, host excluded. The cap counts the host, so a
   * crew can only fill the remaining seats.
   */
  private async crewSeats(hostUserId: string, crewId: string | undefined): Promise<string[]> {
    if (!crewId) {
      return [];
    }

    const memberIds = await this.crewsService.activeMemberIdsForOwner(hostUserId, crewId);

    return memberIds.filter((userId) => userId !== hostUserId).slice(0, MATCH_PARTICIPANT_CAP - 1);
  }

  /**
   * Union of crew seats and explicit people picks, host excluded, capped.
   * Strangers are rejected before this runs.
   */
  private async resolveSeatedUserIds(
    hostUserId: string,
    input: CreateMatchInputDto,
  ): Promise<string[]> {
    const fromCrew = await this.crewSeats(hostUserId, input.crewId);
    const fromPeople = (input.participantUserIds ?? []).filter(
      (userId) => userId !== hostUserId,
    );
    await this.crewsService.assertInviteesAllowed(hostUserId, fromPeople);

    const seated: string[] = [];
    const seen = new Set<string>();
    for (const userId of [...fromPeople, ...fromCrew]) {
      if (seen.has(userId)) {
        continue;
      }
      seen.add(userId);
      seated.push(userId);
      if (seated.length >= MATCH_PARTICIPANT_CAP - 1) {
        break;
      }
    }

    return seated;
  }

  private hostImageFor(match: { hostUser: { image: string | null } }): string | null {
    return match.hostUser.image?.trim() ? match.hostUser.image : null;
  }

  private contestTitleFor(
    match: { title: string | null },
    opponentNames: string[],
  ): string {
    const custom = match.title?.trim();
    if (custom) {
      return custom;
    }

    return matchContestTitle(opponentNames);
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

    const seatedUserIds = await this.resolveSeatedUserIds(user.id, input);
    const seedAttempt = await this.resolveHostSeedAttempt(user.id, input);

    if (input.parentMatchId) {
      await this.assertParentMatchParticipant(user.id, input.parentMatchId);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          hostUserId: user.id,
          inviteToken: createInviteToken(),
          title: input.title?.trim() || null,
          metric: input.metric,
          scoringMode: input.scoringMode,
          dailyScope: input.dailyScope,
          startsAt: bounds.startsAt,
          endsAt: bounds.endsAt,
          crewId: input.crewId ?? null,
          sourceUserChallengeId: input.sourceUserChallengeId ?? null,
          parentMatchId: input.parentMatchId ?? null,
          experimentId: input.experimentId ?? null,
          experimentVariantKey: input.experimentVariantKey ?? null,
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

      if (seedAttempt) {
        await tx.matchAttempt.create({
          data: {
            matchId: match.id,
            userId: user.id,
            count: seedAttempt.count,
            durationSeconds: seedAttempt.durationSeconds,
            source: seedAttempt.source,
            recordedAt: now,
          },
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
    await this.notifySeated(created, seatedUserIds);

    return {
      match: await this.buildBoard(created, user.id),
      invite: {
        token: created.inviteToken,
        url: this.inviteUrlFor(created.inviteToken),
      },
    };
  }

  private async notifySeated(
    match: LoadedMatch,
    seatedUserIds: readonly string[],
  ): Promise<void> {
    try {
      await this.crewSeatNotifier.notifySeated({
        matchId: match.id,
        hostName: groupNameFor(match.hostUser),
        activityNoun: match.metric === 'walk' ? 'walking' : 'push-up',
        userIds: seatedUserIds,
      });
    } catch (error) {
      this.logger.error(`Could not notify crew seats for match ${match.id}`, error);
    }
  }

  /**
   * The person who shared the invite hears that it was accepted. A failed
   * push must not undo the accept.
   */
  private async notifyHostOfAcceptance(match: LoadedMatch, acceptedUserId: string): Promise<void> {
    if (acceptedUserId === match.hostUserId) {
      return;
    }

    const participant = match.participants.find((row) => row.userId === acceptedUserId);

    try {
      await this.inviteAcceptedNotifier.notifyHost({
        matchId: match.id,
        hostUserId: match.hostUserId,
        acceptedUserId,
        acceptedDisplayName: participant
          ? groupNameFor(participant.user)
          : groupNameFor({ id: acceptedUserId }),
      });
    } catch (error) {
      this.logger.error(`Could not notify host of an accepted invite for match ${match.id}`, error);
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
      hostDisplayName: groupNameFor(live.hostUser),
      hostImage: this.hostImageFor(live),
      metric: live.metric,
      scoringMode: live.scoringMode,
      dailyScope: live.dailyScope,
      endsAt: live.endsAt.toISOString(),
      participantCount: live.participants.length,
      participantCap: MATCH_PARTICIPANT_CAP,
      status: live.status,
      alreadyJoined: this.isParticipant(live, user.id),
      viewerIsHost: live.hostUserId === user.id,
      hostScore: this.hostScoreFor(live),
      parentMatchId: live.parentMatchId,
      experimentId: live.experimentId,
      experimentVariantKey: live.experimentVariantKey,
    };
  }

  /**
   * Unauthenticated invite card for the marketing site / deferred install.
   * Skips settlement so a public hit cannot race host settlement side effects.
   * Link-preview bots pass purpose=link_preview so they do not stamp opens.
   */
  async publicPreview(
    token: string,
    purpose: 'open' | 'link_preview' = 'open',
  ): Promise<PublicMatchInvitePreviewDto> {
    const match = await this.loadByToken(token);
    const isLinkPreview = purpose === 'link_preview';

    if (!isLinkPreview && match.firstOpenedAt === null) {
      await this.prisma.match.updateMany({
        where: { id: match.id, firstOpenedAt: null },
        data: { firstOpenedAt: new Date() },
      });
    }

    if (!isLinkPreview) {
      try {
        await this.analyticsService.track(null, {
          name: 'challenge_link_opened',
          properties: {
            matchId: match.id,
            inviteToken: match.inviteToken,
            experimentId: match.experimentId,
            experimentVariantKey: match.experimentVariantKey,
          },
        });
      } catch (error) {
        this.logger.error(`Could not track challenge_link_opened for match ${match.id}`, error);
      }
    }

    return {
      token: match.inviteToken,
      hostDisplayName: groupNameFor(match.hostUser),
      hostImage: this.hostImageFor(match),
      title: match.title?.trim() || null,
      metric: match.metric,
      scoringMode: match.scoringMode,
      hostScore: this.hostScoreFor(match),
      status: match.status,
      endsAt: match.endsAt.toISOString(),
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
      return await this.buildBoard(await this.acceptSeat(match, user.id), user.id);
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

    const joined = await this.loadByToken(token);
    await this.trackMatchEvent(user, 'challenge_accepted', joined);
    await this.trackMatchEvent(user, 'challenge_recipient_signed_up', joined);
    await this.notifyHostOfAcceptance(joined, user.id);
    return await this.buildBoard(joined, user.id);
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

  async listMine(currentUser: AuthenticatedUser | null | undefined): Promise<ListMyMatchesDto> {
    const user = requireUser(currentUser);
    const rows = await this.prisma.matchParticipant.findMany({
      where: { userId: user.id },
      include: { match: { include: matchInclude } },
      orderBy: { joinedAt: 'desc' },
    });

    const live: ListMyMatchesOutput['live'] = [];
    const ended: ListMyMatchesOutput['ended'] = [];

    for (const row of rows) {
      const item = await this.buildListItem(await this.settleIfDue(row.match), user.id);

      if (item.status === 'open') {
        live.push(item);
      } else {
        ended.push(item);
      }
    }

    return { live, ended };
  }

  /**
   * Live contests the member has accepted, with who moved today, for the daily
   * reminder to pick a rival from. A pending seat is never read: the member has
   * not agreed to play, so nothing about the group may be pushed to them.
   */
  async liveContestsForReminders(userId: string, now: Date): Promise<ReminderContest[]> {
    const rows = await this.prisma.matchParticipant.findMany({
      where: {
        userId,
        acceptedAt: { not: null },
        match: { status: 'open', endsAt: { gt: now } },
      },
      include: { match: { include: matchInclude } },
    });

    return Promise.all(
      rows.map(async (row) => {
        const scored = await this.scoreMatch(row.match);
        return {
          item: this.listItemFrom(row.match, userId, scored),
          doneTodayUserIds: scored.doneTodayUserIds,
        };
      }),
    );
  }

  private async buildListItem(match: LoadedMatch, viewerId: string): Promise<MatchListItem> {
    return this.listItemFrom(match, viewerId, await this.scoreMatch(match));
  }

  private listItemFrom(match: LoadedMatch, viewerId: string, scored: ScoredMatch): MatchListItem {
    // The list lights faces but takes no taps, so it never reads reactions.
    const board = this.boardFrom(match, viewerId, scored, new Map());

    return {
      id: board.id,
      title: this.contestTitleFor(
        match,
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
      roster: rosterFor(board.standings, MATCH_LIST_ROSTER_SIZE),
      lastMove: lastMoveFor({
        standings: board.standings,
        scoredAtByUser: scored.result.scoredAtByUser,
        timeZone: this.contestTimeZone(match),
        now: new Date(),
      }),
      standings: board.standings,
    };
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

    const isRecipient = user.id !== match.hostUserId;
    const priorRecipientAttempts = match.attempts.filter(
      (attempt) => attempt.userId === user.id,
    ).length;

    const scoreBefore = await this.viewerScore(match, user.id);

    const attempt = await this.prisma.matchAttempt.create({
      data: {
        matchId: match.id,
        userId: user.id,
        count: input.count,
        durationSeconds: input.durationSeconds,
        source: input.source,
      },
    });

    if (isRecipient && priorRecipientAttempts === 0) {
      await this.trackMatchEvent(user, 'challenge_started_by_recipient', match);
      await this.trackMatchEvent(user, 'challenge_completed_by_recipient', match);
      await this.trackMatchEvent(user, 'invite_first_attempt', match);
    }

    const fresh = await this.loadById(match.id);
    const board = await this.buildBoard(fresh, user.id);
    await this.notifyBoardMove(fresh, board, user.id, attempt.id, scoreBefore);
    return board;
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

  /**
   * A cheer or a nudge. Which one a tap may be is decided here from the
   * board, never from the client: a cheer for someone done today, a nudge
   * for someone who is not, and nothing for a seat that has not accepted.
   */
  async react(
    currentUser: AuthenticatedUser | null | undefined,
    input: ReactToMatchMemberInput,
  ): Promise<MatchBoardDto> {
    const user = requireUser(currentUser);
    const match = await this.settleIfDue(await this.loadById(input.matchId));
    this.assertParticipant(match, user.id);

    if (match.status !== 'open') {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_NOT_OPEN });
    }

    const scored = await this.scoreMatch(match);
    this.assertReactionAllowed(match, user.id, input, scored.doneTodayUserIds);

    const reaction = { ...input, fromUserId: user.id, dayKey: this.todayKeyFor(match) };
    const isFirstTapToday = await this.matchReactions.record(reaction);

    if (isFirstTapToday) {
      await this.notifyReaction(match, reaction);
    }

    return await this.buildBoard(match, user.id);
  }

  private assertReactionAllowed(
    match: LoadedMatch,
    fromUserId: string,
    input: ReactToMatchMemberInput,
    doneToday: ReadonlySet<string>,
  ): void {
    const accepted = new Set(this.acceptedUserIds(match));
    const isTargetDone = doneToday.has(input.toUserId);
    const fitsTarget = input.kind === 'cheer' ? isTargetDone : !isTargetDone;
    const isAllowed =
      input.toUserId !== fromUserId &&
      accepted.has(fromUserId) &&
      accepted.has(input.toUserId) &&
      fitsTarget;

    if (!isAllowed) {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_REACTION_NOT_ALLOWED });
    }
  }

  /** After the write, and never fatal: the tap stands even if the push does not land. */
  private async notifyReaction(
    match: LoadedMatch,
    reaction: ReactToMatchMemberInput & { fromUserId: string; dayKey: string },
  ): Promise<void> {
    const sender = match.participants.find((row) => row.userId === reaction.fromUserId);

    try {
      await this.matchReactionNotifier.notify({
        ...reaction,
        senderName: sender
          ? groupNameFor(sender.user)
          : groupNameFor({ id: reaction.fromUserId }),
        group: {
          scoringMode: match.scoringMode,
          metric: match.metric,
          dailyScope: match.dailyScope,
          endsAt: match.endsAt.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(`Could not notify a reaction in match ${match.id}`, error);
    }
  }

  /**
   * Steps a member out of a live group. Their sets and taps go with them, so
   * the board reads as if they had never joined. The host cancels instead,
   * because a group without its host has nobody to share the link.
   */
  async leave(
    currentUser: AuthenticatedUser | null | undefined,
    matchId: string,
  ): Promise<ListMyMatchesDto> {
    const user = requireUser(currentUser);
    const match = await this.settleIfDue(await this.loadById(matchId));
    this.assertParticipant(match, user.id);

    if (match.hostUserId === user.id) {
      throw new ORPCError('FORBIDDEN', { message: MATCH_HOST_CANNOT_LEAVE });
    }

    if (match.status !== 'open') {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_NOT_OPEN });
    }

    await this.prisma.$transaction([
      this.prisma.matchReaction.deleteMany({
        where: { matchId, OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
      }),
      this.prisma.matchAttempt.deleteMany({ where: { matchId, userId: user.id } }),
      this.prisma.matchParticipant.deleteMany({ where: { matchId, userId: user.id } }),
    ]);

    return await this.listMine(user);
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
  private assertAttemptFitsMetric(metric: MatchMetric, input: SubmitMatchAttemptInput): void {
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
  private async acceptSeat(match: LoadedMatch, userId: string): Promise<LoadedMatch> {
    const seat = match.participants.find((row) => row.userId === userId);

    if (!seat || seat.acceptedAt !== null) {
      return match;
    }

    const updated = await this.prisma.matchParticipant.updateMany({
      where: { matchId: match.id, userId, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    const accepted = await this.loadById(match.id);

    if (updated.count > 0) {
      await this.notifyHostOfAcceptance(accepted, userId);
    }

    return accepted;
  }

  private assertParticipant(match: LoadedMatch, userId: string): void {
    if (!this.isParticipant(match, userId)) {
      throw new ORPCError('FORBIDDEN', { message: MATCH_NOT_PARTICIPANT });
    }
  }

  private isParticipant(match: LoadedMatch, userId: string): boolean {
    return match.participants.some((row) => row.userId === userId);
  }

  private hostScoreFor(match: LoadedMatch): number | null {
    const hostAttempts = match.attempts.filter((attempt) => attempt.userId === match.hostUserId);
    if (hostAttempts.length === 0) {
      return null;
    }

    return hostAttempts.reduce((best, attempt) => Math.max(best, attempt.count), 0);
  }

  private async assertParentMatchParticipant(userId: string, parentMatchId: string): Promise<void> {
    const parent = await this.prisma.match.findUnique({
      where: { id: parentMatchId },
      include: { participants: true },
    });

    if (!parent) {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_INVALID_PARENT });
    }

    const isParticipant = parent.participants.some((row) => row.userId === userId);
    if (!isParticipant) {
      throw new ORPCError('FORBIDDEN', { message: MATCH_INVALID_PARENT });
    }
  }

  /**
   * When the host creates from a finished habit occurrence, seed their first
   * attempt from the verified device activity so the invite already shows a
   * score to beat.
   */
  private async resolveHostSeedAttempt(
    hostUserId: string,
    input: CreateMatchInputDto,
  ): Promise<{
    count: number;
    durationSeconds: number;
    source: (typeof MATCH_ATTEMPT_SOURCE_BY_METRIC)[MatchMetric];
  } | null> {
    if (input.seedCount != null) {
      return {
        count: input.seedCount,
        durationSeconds: 0,
        source: MATCH_ATTEMPT_SOURCE_BY_METRIC[input.metric],
      };
    }

    if (!input.sourceUserChallengeId) {
      return null;
    }

    const occurrence = await this.prisma.userChallenge.findUnique({
      where: { id: input.sourceUserChallengeId },
      include: { deviceActivityLog: true },
    });

    if (!occurrence || occurrence.userId !== hostUserId) {
      throw new ORPCError('BAD_REQUEST', {
        message: MATCH_INVALID_SOURCE_CHALLENGE,
      });
    }

    if (occurrence.status !== 'completed' && occurrence.status !== 'awaiting_evidence') {
      throw new ORPCError('BAD_REQUEST', {
        message: MATCH_INVALID_SOURCE_CHALLENGE,
      });
    }

    const log = occurrence.deviceActivityLog;
    if (!log) {
      throw new ORPCError('BAD_REQUEST', {
        message: MATCH_INVALID_SOURCE_CHALLENGE,
      });
    }

    if (input.metric !== 'walk') {
      const deviceMetric = DEVICE_METRIC_BY_MATCH_METRIC[input.metric];
      if (log.metric !== deviceMetric || log.count == null || log.count <= 0) {
        throw new ORPCError('BAD_REQUEST', {
          message: MATCH_INVALID_SOURCE_CHALLENGE,
        });
      }

      return {
        count: log.count,
        durationSeconds: log.durationSeconds ?? 0,
        source: MATCH_ATTEMPT_SOURCE_BY_METRIC[input.metric],
      };
    }

    if (input.metric === 'walk') {
      const minutes =
        log.count ?? (log.durationSeconds != null ? Math.floor(log.durationSeconds / 60) : null);
      if (log.metric !== 'walk' || minutes == null || minutes <= 0) {
        throw new ORPCError('BAD_REQUEST', {
          message: MATCH_INVALID_SOURCE_CHALLENGE,
        });
      }

      return {
        count: minutes,
        durationSeconds: log.durationSeconds ?? minutes * 60,
        source: MATCH_ATTEMPT_SOURCE_BY_METRIC.walk,
      };
    }

    return null;
  }

  private standingParticipants(match: LoadedMatch) {
    return match.participants.map((row) => ({
      userId: row.userId,
      // Live first name on every board read — never a join-time snapshot.
      displayName: groupNameFor(row.user),
      image: row.user.image?.trim() ? row.user.image : null,
      isHost: row.userId === match.hostUserId,
      isPending: row.acceptedAt === null,
    }));
  }

  /**
   * Competitive social notice after a scoring attempt. Fail closed: a push
   * failure must not undo the write that just moved the board.
   */
  private async notifyBoardMove(
    match: LoadedMatch,
    board: MatchBoard,
    actorUserId: string,
    attemptId: string,
    actorScoreBefore: number,
  ): Promise<void> {
    const actorStanding = board.standings.find((row) => row.userId === actorUserId);
    if (!actorStanding) {
      return;
    }

    const acceptedIds = new Set(this.acceptedUserIds(match));
    const recipients = board.standings
      .filter((row) => acceptedIds.has(row.userId) && row.userId !== actorUserId)
      .map((row) => ({ userId: row.userId, score: row.score }));

    if (recipients.length === 0) {
      return;
    }

    try {
      await this.boardMoveNotifier.notifyParticipants({
        matchId: match.id,
        attemptOrEventId: attemptId,
        actorUserId,
        actorDisplayName: actorStanding.displayName,
        actorScoreBefore,
        actorScoreAfter: actorStanding.score,
        endsAt: board.endsAt,
        recipients,
      });
    } catch (error) {
      this.logger.error(`Could not notify board move for match ${match.id}`, error);
    }
  }

  private async viewerScore(match: LoadedMatch, userId: string): Promise<number> {
    const { standings } = computeStandings(
      this.standingParticipants(match),
      await this.loadScoringEvents(match),
      scoringRulesFor(match),
    );
    return standings.find((row) => row.userId === userId)?.score ?? 0;
  }

  private acceptedUserIds(match: LoadedMatch): string[] {
    return match.participants.filter((row) => row.acceptedAt !== null).map((row) => row.userId);
  }

  /**
   * Where a contest's score comes from. Attempt-driven modes read the sets
   * logged against the match plus the same activity logged anywhere else in
   * the app; `days_completed` reads the daily occurrences the member already
   * finished. No mode asks for a second log of work already done.
   */
  private async loadScoringEvents(match: LoadedMatch): Promise<StandingEvent[]> {
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
  private async loadDailyCompletionEvents(match: LoadedMatch): Promise<StandingEvent[]> {
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

  /** The contest's current day, in the zone its daily cap already uses. */
  private todayKeyFor(match: LoadedMatch): string {
    return dayKeyFor(this.contestTimeZone(match), new Date());
  }

  private async scoreMatch(match: LoadedMatch): Promise<ScoredMatch> {
    const events = await this.loadScoringEvents(match);
    const accepted = new Set(this.acceptedUserIds(match));
    const dayStrip = dayStripFor({
      scoringMode: match.scoringMode,
      startsAt: match.startsAt,
      endsAt: match.endsAt,
      timeZone: this.contestTimeZone(match),
      now: new Date(),
    });

    return {
      result: computeStandings(this.standingParticipants(match), events, scoringRulesFor(match)),
      doneTodayUserIds: doneTodayUserIds(events, accepted, this.todayKeyFor(match)),
      dayStrip,
      movedDayKeysByUser: dayStrip ? movedDayKeysByUser(events, accepted, dayStrip) : new Map(),
    };
  }

  private async buildBoard(match: LoadedMatch, viewerId: string): Promise<MatchBoard> {
    const scored = await this.scoreMatch(match);
    const reactions = await this.matchReactions.sentBy(match.id, viewerId, this.todayKeyFor(match));
    return this.boardFrom(match, viewerId, scored, reactions);
  }

  private boardFrom(
    match: LoadedMatch,
    viewerId: string,
    scored: ScoredMatch,
    reactionsByRecipient: ReadonlyMap<string, MatchReactionSent[]>,
  ): MatchBoard {
    const { result, doneTodayUserIds: doneToday, dayStrip } = scored;
    const { standings } = result;
    const yourScore = standings.find((row) => row.userId === viewerId)?.score ?? 0;

    const opponentNames = standings
      .filter((row) => row.userId !== viewerId)
      .map((row) => row.displayName);

    return {
      id: match.id,
      token: match.inviteToken,
      inviteUrl: this.inviteUrlFor(match.inviteToken),
      title: this.contestTitleFor(match, opponentNames),
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
        doneToday: doneToday.has(row.userId),
        yourReactionsToday: reactionsByRecipient.get(row.userId) ?? [],
        ...(dayStrip ? { movedDayKeys: scored.movedDayKeysByUser.get(row.userId) ?? [] } : {}),
      })),
      canSaveCrew: this.canSaveCrew(match),
      dayStrip,
    };
  }

  /**
   * A crew is offered from a contest that already happened and had other
   * people in it. Contests seated from a crew are skipped — that roster is
   * saved already.
   */
  private canSaveCrew(match: LoadedMatch): boolean {
    return match.status !== 'open' && match.crewId === null && match.participants.length > 1;
  }
}
