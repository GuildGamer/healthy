import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  MATCH_PARTICIPANT_CAP,
  matchContestTitle,
  matchInviteUrl,
  type ListMyMatchesOutput,
  type MatchBoard,
  type MatchPreview,
  type MatchWindow,
  type SubmitMatchAttemptInput,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { DEFAULT_TIME_ZONE } from '../../../shared/utils/day-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { publicNameFor } from '../leaderboard/pseudonym.js';
import type { CreateMatchDto, ListMyMatchesDto, MatchBoardDto } from './dto/match.dto.js';
import {
  MATCH_ENDED,
  MATCH_FULL,
  MATCH_INVALID_SOURCE,
  MATCH_NOT_FOUND,
  MATCH_NOT_HOST,
  MATCH_NOT_OPEN,
  MATCH_NOT_PARTICIPANT,
} from './errors/match.errors.js';
import { computeBestSingleStandings } from './match-standings.js';
import { createInviteToken } from './match-token.js';
import { matchWindowBounds } from './match-window.js';
import type { LoadedMatch } from './types/loaded-match.js';

const matchInclude = {
  hostUser: { include: { profile: true } },
  participants: { include: { user: { include: { profile: true } } } },
  attempts: true,
} as const;

@Injectable()
export class MatchesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(
    currentUser: AuthenticatedUser | null | undefined,
    window: MatchWindow,
  ): Promise<CreateMatchDto> {
    const user = requireUser(currentUser);
    const now = new Date();
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });
    const bounds = matchWindowBounds(
      window,
      profile?.timeZone ?? DEFAULT_TIME_ZONE,
      now,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          hostUserId: user.id,
          inviteToken: createInviteToken(),
          startsAt: bounds.startsAt,
          endsAt: bounds.endsAt,
        },
      });

      await tx.matchParticipant.create({
        data: { matchId: match.id, userId: user.id },
      });

      return tx.match.findUniqueOrThrow({
        where: { id: match.id },
        include: matchInclude,
      });
    });

    return {
      match: this.toBoard(created, user.id),
      invite: {
        token: created.inviteToken,
        url: matchInviteUrl(created.inviteToken),
      },
    };
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

    if (this.isParticipant(match, user.id)) {
      return this.toBoard(match, user.id);
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
          data: { matchId: match.id, userId: user.id },
        });
      });
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }

      const raced = await this.loadByToken(token);
      if (this.isParticipant(raced, user.id)) {
        return this.toBoard(raced, user.id);
      }

      throw new ORPCError('BAD_REQUEST', { message: MATCH_FULL });
    }

    return this.toBoard(await this.loadByToken(token), user.id);
  }

  async get(
    currentUser: AuthenticatedUser | null | undefined,
    matchId: string,
  ): Promise<MatchBoardDto> {
    const user = requireUser(currentUser);
    const match = await this.settleIfDue(await this.loadById(matchId));
    this.assertParticipant(match, user.id);
    return this.toBoard(match, user.id);
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
      const board = this.toBoard(match, user.id);
      const item = {
        id: board.id,
        title: matchContestTitle(
          board.standings
            .filter((standing) => !standing.isYou)
            .map((standing) => standing.displayName),
        ),
        metric: board.metric,
        scoringMode: board.scoringMode,
        endsAt: board.endsAt,
        status: board.status,
        participantCount: board.participantCount,
        yourBestCount: board.yourBestCount,
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
    if (input.source !== 'in_app_pose') {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_INVALID_SOURCE });
    }

    const match = await this.settleIfDue(await this.loadById(input.matchId));
    this.assertParticipant(match, user.id);

    if (match.status !== 'open') {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_NOT_OPEN });
    }

    await this.prisma.matchAttempt.create({
      data: {
        matchId: match.id,
        userId: user.id,
        count: input.count,
        durationSeconds: input.durationSeconds,
        source: 'in_app_pose',
      },
    });

    const fresh = await this.loadById(match.id);
    return this.toBoard(fresh, user.id);
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

    return this.toBoard(await this.loadById(match.id), user.id);
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

    const { winnerUserId } = computeBestSingleStandings(
      this.standingParticipants(match),
      match.attempts,
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

  private assertJoinable(match: LoadedMatch): void {
    if (match.status !== 'open') {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_ENDED });
    }

    if (match.participants.length >= MATCH_PARTICIPANT_CAP) {
      throw new ORPCError('BAD_REQUEST', { message: MATCH_FULL });
    }
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
    }));
  }

  private toBoard(match: LoadedMatch, viewerId: string): MatchBoard {
    const { standings } = computeBestSingleStandings(
      this.standingParticipants(match),
      match.attempts,
    );
    const yours = standings.find((row) => row.userId === viewerId);

    return {
      id: match.id,
      token: match.inviteToken,
      metric: match.metric,
      scoringMode: match.scoringMode,
      startsAt: match.startsAt.toISOString(),
      endsAt: match.endsAt.toISOString(),
      status: match.status,
      participantCount: match.participants.length,
      participantCap: MATCH_PARTICIPANT_CAP,
      yourBestCount: yours?.bestCount ?? 0,
      winnerUserId: match.winnerUserId,
      standings: standings.map((row) => ({
        ...row,
        isYou: row.userId === viewerId,
      })),
    };
  }
}
