import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import { crewLabel, type Crew } from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { groupNameFor } from '../../../shared/utils/group-name.js';
import type {
  CrewDto,
  ListAcquaintancesDto,
  ListCrewsDto,
  SaveCrewDto,
} from './dto/crew.dto.js';
import {
  CREW_MATCH_NOT_FINISHED,
  CREW_MATCH_TOO_SMALL,
  CREW_NOT_FOUND,
  CREW_NOT_MEMBER,
  CREW_NOT_OWNER,
  CREW_STRANGER,
} from './errors/crew.errors.js';

const crewInclude = {
  ownerUser: { include: { profile: true } },
  members: { include: { user: { include: { profile: true } } } },
} as const;

type CrewPerson = {
  id: string;
  name: string | null;
  profile: { displayName: string | null } | null;
};

type LoadedCrew = {
  id: string;
  ownerUserId: string;
  name: string;
  ownerUser: CrewPerson;
  members: {
    userId: string;
    leftAt: Date | null;
    user: CrewPerson;
  }[];
};

/**
 * Saved rosters. A crew is a selection shortcut, not a place: there is no crew
 * page, feed, or chat, and no flow to assemble one from nothing. It is offered
 * retroactively from a contest that already happened.
 */
@Injectable()
export class CrewsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListCrewsDto> {
    const user = requireUser(currentUser);
    const crews = await this.prisma.crew.findMany({
      where: {
        OR: [
          { ownerUserId: user.id },
          { members: { some: { userId: user.id, leftAt: null } } },
        ],
      },
      include: crewInclude,
      orderBy: { createdAt: 'desc' },
    });

    return { crews: this.presentMany(crews, user.id) };
  }

  /**
   * People the caller has already shared a private contest with — picker
   * source only, never a friends graph or directory.
   */
  async listAcquaintances(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListAcquaintancesDto> {
    const user = requireUser(currentUser);
    return { people: await this.acquaintancesFor(user.id) };
  }

  /**
   * True when every id is someone the host competed with or shares an active
   * crew with. Used before seating strangers into a new contest.
   */
  async assertInviteesAllowed(
    hostUserId: string,
    userIds: readonly string[],
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const allowed = await this.allowedInviteeIds(hostUserId);
    for (const userId of userIds) {
      if (userId === hostUserId) {
        continue;
      }
      if (!allowed.has(userId)) {
        throw new ORPCError('FORBIDDEN', { message: CREW_STRANGER });
      }
    }
  }

  async allowedInviteeIds(hostUserId: string): Promise<Set<string>> {
    const people = await this.acquaintancesFor(hostUserId);
    const allowed = new Set(people.map((person) => person.userId));

    const ownedCrews = await this.prisma.crew.findMany({
      where: { ownerUserId: hostUserId },
      select: {
        members: {
          where: { leftAt: null },
          select: { userId: true },
        },
      },
    });
    for (const crew of ownedCrews) {
      for (const member of crew.members) {
        if (member.userId !== hostUserId) {
          allowed.add(member.userId);
        }
      }
    }

    const memberCrews = await this.prisma.crewMember.findMany({
      where: { userId: hostUserId, leftAt: null },
      select: {
        crew: {
          select: {
            ownerUserId: true,
            members: {
              where: { leftAt: null },
              select: { userId: true },
            },
          },
        },
      },
    });
    for (const row of memberCrews) {
      if (row.crew.ownerUserId !== hostUserId) {
        allowed.add(row.crew.ownerUserId);
      }
      for (const member of row.crew.members) {
        if (member.userId !== hostUserId) {
          allowed.add(member.userId);
        }
      }
    }

    return allowed;
  }

  private async acquaintancesFor(
    userId: string,
  ): Promise<ListAcquaintancesDto['people']> {
    const participations = await this.prisma.matchParticipant.findMany({
      where: { userId },
      select: { matchId: true },
    });
    const matchIds = [...new Set(participations.map((row) => row.matchId))];
    if (matchIds.length === 0) {
      return [];
    }

    const others = await this.prisma.matchParticipant.findMany({
      where: {
        matchId: { in: matchIds },
        userId: { not: userId },
      },
      select: {
        userId: true,
        joinedAt: true,
        user: { include: { profile: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const seen = new Set<string>();
    const people: ListAcquaintancesDto['people'] = [];
    for (const row of others) {
      if (seen.has(row.userId)) {
        continue;
      }
      seen.add(row.userId);
      people.push({
        userId: row.userId,
        displayName: groupNameFor(row.user),
      });
    }

    return people;
  }

  /**
   * Keeps the roster of a finished contest. One tap: the members are already
   * known, and the name is derived from them unless the host supplies one.
   */
  async save(
    currentUser: AuthenticatedUser | null | undefined,
    matchId: string,
    name?: string,
  ): Promise<SaveCrewDto> {
    const user = requireUser(currentUser);
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: { include: { user: { include: { profile: true } } } } },
    });

    if (!match || !match.participants.some((row) => row.userId === user.id)) {
      throw new ORPCError('NOT_FOUND', { message: CREW_NOT_FOUND });
    }

    if (match.status === 'open') {
      throw new ORPCError('BAD_REQUEST', { message: CREW_MATCH_NOT_FINISHED });
    }

    const others = match.participants.filter((row) => row.userId !== user.id);

    if (others.length === 0) {
      throw new ORPCError('BAD_REQUEST', { message: CREW_MATCH_TOO_SMALL });
    }

    const memberUserIds = others.map((row) => row.userId);
    const existing = await this.findByMemberSet(user.id, memberUserIds);

    if (existing) {
      return { crew: this.present(existing, user.id), alreadyExisted: true };
    }

    const derived = crewLabel(
      others.map((row) => groupNameFor(row.user)),
    );

    const created = await this.prisma.crew.create({
      data: {
        ownerUserId: user.id,
        name: name?.trim() || derived,
        members: {
          create: memberUserIds.map((userId) => ({ userId })),
        },
      },
      include: crewInclude,
    });

    return { crew: this.present(created, user.id), alreadyExisted: false };
  }

  async rename(
    currentUser: AuthenticatedUser | null | undefined,
    crewId: string,
    name: string,
  ): Promise<CrewDto> {
    const user = requireUser(currentUser);
    const crew = await this.loadForViewer(crewId, user.id);

    if (crew.ownerUserId !== user.id) {
      throw new ORPCError('FORBIDDEN', { message: CREW_NOT_OWNER });
    }

    const renamed = await this.prisma.crew.update({
      where: { id: crew.id },
      data: { name },
      include: crewInclude,
    });

    return this.present(renamed, user.id);
  }

  /**
   * The member holds the veto. Leaving marks the membership rather than
   * deleting it, so the unique key stops the same person being seated from
   * this crew again. An owner leaving has nothing left to own, so the crew
   * goes with them.
   */
  async leave(
    currentUser: AuthenticatedUser | null | undefined,
    crewId: string,
  ): Promise<ListCrewsDto> {
    const user = requireUser(currentUser);
    const crew = await this.loadForViewer(crewId, user.id);

    if (crew.ownerUserId === user.id) {
      await this.prisma.crew.delete({ where: { id: crew.id } });
      return this.list(user);
    }

    await this.prisma.crewMember.updateMany({
      where: { crewId: crew.id, userId: user.id, leftAt: null },
      data: { leftAt: new Date() },
    });

    return this.list(user);
  }

  /**
   * Members still in the crew, for seating a new contest. Owner-only: a crew
   * is one person's shortcut, not a shared object other members can spend.
   */
  async activeMemberIdsForOwner(
    ownerUserId: string,
    crewId: string,
  ): Promise<string[]> {
    const crew = await this.prisma.crew.findUnique({
      where: { id: crewId },
      include: crewInclude,
    });

    if (!crew || crew.ownerUserId !== ownerUserId) {
      throw new ORPCError('NOT_FOUND', { message: CREW_NOT_FOUND });
    }

    return this.activeMembers(crew).map((row) => row.userId);
  }

  private async loadForViewer(
    crewId: string,
    viewerId: string,
  ): Promise<LoadedCrew> {
    const crew = await this.prisma.crew.findUnique({
      where: { id: crewId },
      include: crewInclude,
    });

    if (!crew) {
      throw new ORPCError('NOT_FOUND', { message: CREW_NOT_FOUND });
    }

    const isOwner = crew.ownerUserId === viewerId;
    const isMember = this.activeMembers(crew).some(
      (row) => row.userId === viewerId,
    );

    if (!isOwner && !isMember) {
      throw new ORPCError('FORBIDDEN', { message: CREW_NOT_MEMBER });
    }

    return crew;
  }

  /**
   * Beneficiary lists rot because nothing dedupes them. An identical roster is
   * offered back instead of saved twice.
   */
  private async findByMemberSet(
    ownerUserId: string,
    memberUserIds: string[],
  ): Promise<LoadedCrew | null> {
    const candidates = await this.prisma.crew.findMany({
      where: { ownerUserId },
      include: crewInclude,
    });

    const wanted = new Set(memberUserIds);

    return (
      candidates.find((crew) => {
        const active = this.activeMembers(crew).map((row) => row.userId);
        return (
          active.length === wanted.size &&
          active.every((userId) => wanted.has(userId))
        );
      }) ?? null
    );
  }

  private activeMembers(crew: LoadedCrew): LoadedCrew['members'] {
    return crew.members.filter((row) => row.leftAt === null);
  }

  /** A crew everyone has left is not selectable, so it is not listed either. */
  private presentMany(crews: LoadedCrew[], viewerId: string): Crew[] {
    return crews
      .filter((crew) => this.activeMembers(crew).length > 0)
      .map((crew) => this.present(crew, viewerId));
  }

  /**
   * A crew reads as "the other people in it", so the owner counts as one of
   * them to everybody except themselves. Otherwise a member would open a
   * two-person crew and find it empty.
   */
  private present(crew: LoadedCrew, viewerId: string): Crew {
    const roster = [
      {
        userId: crew.ownerUserId,
        displayName: groupNameFor(crew.ownerUser),
      },
      ...this.activeMembers(crew).map((row) => ({
        userId: row.userId,
        displayName: groupNameFor(row.user),
      })),
    ].filter((person) => person.userId !== viewerId);

    return {
      id: crew.id,
      name: crew.name,
      memberCount: roster.length,
      memberNames: roster.map((person) => person.displayName),
      isOwner: crew.ownerUserId === viewerId,
    };
  }
}
