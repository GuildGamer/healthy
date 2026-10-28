import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  mintProofCode,
  PROOF_CLIP_SIGNED_URL_TTL_SECONDS,
  resolveProofClipUploadIntent,
  toDisplayProofCode,
  type ProofClip,
  type ProofClipAudience,
  type RecordProofClipInput,
  type ReserveProofClipInput,
  type VerifyProofCodeOutput,
} from '@product/contract';
import type {
  PrismaClient,
  ProofClip as DbProofClip,
  ProofClipVisibility,
} from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { DEFAULT_TIME_ZONE, dayKeyFor } from '../../../shared/utils/day-key.js';
import { groupNameFor } from '../../../shared/utils/group-name.js';
import {
  ENVIRONMENT,
  type Environment,
} from '../../shared-modules/config/index.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '../../shared-modules/storage/index.js';
import {
  PROOF_CLIP_ALL_DAYS_LIMIT,
  PROOF_CLIP_MAX_BYTES,
  PROOF_CLIP_POSTER_CONTENT_TYPE,
  PROOF_CLIP_PUBLIC_VERIFY_RATE_LIMIT,
  PROOF_CLIP_RESERVE_WINDOW_MINUTES,
  PROOF_CLIP_VERIFY_RATE_LIMIT,
  PROOF_CLIP_VIDEO_CONTENT_TYPE,
} from './constants/proof-clips.js';
import {
  PROOF_CLIP_CANNOT_BLOCK_SELF,
  PROOF_CLIP_CONTEXT_NOT_FOUND,
  PROOF_CLIP_DAILY_CAP,
  PROOF_CLIP_NOT_FOUND,
  PROOF_CLIP_NOT_OWNER,
  PROOF_CLIP_NOT_PARTICIPANT,
  PROOF_CLIP_RESERVE_EXPIRED,
  PROOF_CLIP_STORAGE_UNAVAILABLE,
  PROOF_CLIP_UPLOAD_MISSING,
  PROOF_CLIP_UPLOAD_SIZE_MISMATCH,
  PROOF_CLIP_VERIFY_RATE_LIMITED,
  PROOF_CLIP_WRONG_STATUS,
} from './errors/proof-clip.errors.js';
import { evaluateProofAttestation } from './proof-clip-attestation.js';
import { computeProofClipExpiry } from './proof-clip-expiry.js';
import { ProofCodeVerifyRateLimiter } from './proof-code-verify-rate-limiter.js';

function videoObjectKey(userId: string, clipId: string): string {
  return `clips/${userId}/${clipId}/video.mp4`;
}

function posterObjectKey(userId: string, clipId: string): string {
  return `clips/${userId}/${clipId}/poster.jpg`;
}

function sha256HexToBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64');
}

/** Audience with a one-release fallback for rows that still only have visibility. */
function effectiveAudience(clip: Pick<DbProofClip, 'audience' | 'visibility'>): ProofClipAudience | null {
  if (clip.audience) {
    return clip.audience;
  }
  if (clip.visibility === 'shared') {
    return 'anyone';
  }
  if (clip.visibility === 'group') {
    return 'only_me';
  }
  return null;
}

function isPostedToGroup(clip: Pick<DbProofClip, 'postedToGroupAt' | 'visibility'>): boolean {
  return clip.postedToGroupAt != null || clip.visibility === 'group';
}

/** Legacy mirror so in-flight clients that still read visibility keep working. */
function legacyVisibilityFor(
  audience: ProofClipAudience,
  postToGroup: boolean,
): ProofClipVisibility | null {
  if (postToGroup) {
    return 'group';
  }
  if (audience === 'anyone') {
    return 'shared';
  }
  return null;
}

@Injectable()
export class ProofClipsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
    private readonly verifyRateLimiter: ProofCodeVerifyRateLimiter,
  ) {}

  async reserve(
    currentUser: AuthenticatedUser | null | undefined,
    input: ReserveProofClipInput,
  ) {
    const user = requireUser(currentUser);
    const links = await this.resolveContext(user.id, input);

    let code = mintProofCode(randomBytes(7));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await this.prisma.proofClip.findUnique({ where: { code } });
      if (!existing) {
        break;
      }
      code = mintProofCode(randomBytes(7));
    }

    const reservedAt = new Date();
    const reservedUntil = new Date(
      reservedAt.getTime() + PROOF_CLIP_RESERVE_WINDOW_MINUTES * 60_000,
    );

    const clip = await this.prisma.proofClip.create({
      data: {
        userId: user.id,
        code,
        metric: input.metric,
        status: 'reserved',
        reservedAt,
        userChallengeId: links.userChallengeId,
        matchId: links.matchId,
      },
    });

    return {
      clipId: clip.id,
      code: clip.code,
      displayCode: toDisplayProofCode(clip.code),
      reservedUntil: reservedUntil.toISOString(),
      encoding: this.environment.proofClipEncoding,
    };
  }

  async record(
    currentUser: AuthenticatedUser | null | undefined,
    input: RecordProofClipInput,
  ) {
    const user = requireUser(currentUser);
    const clip = await this.requireOwnedClip(user.id, input.clipId);

    if (clip.status !== 'reserved') {
      if (clip.status === 'recorded' || clip.status === 'ready') {
        return { clipId: clip.id, status: 'recorded' as const, attested: clip.attested };
      }
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_WRONG_STATUS });
    }

    const reservedUntil = new Date(
      clip.reservedAt.getTime() + PROOF_CLIP_RESERVE_WINDOW_MINUTES * 60_000,
    );
    if (Date.now() > reservedUntil.getTime()) {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_RESERVE_EXPIRED });
    }

    const attested = evaluateProofAttestation(input.attestation);

    const updated = await this.prisma.proofClip.update({
      where: { id: clip.id },
      data: {
        status: 'recorded',
        sha256: input.sha256,
        byteSize: input.byteSize,
        durationSeconds: input.durationSeconds,
        count: input.count,
        matchAttemptId: input.matchAttemptId ?? clip.matchAttemptId,
        recordedAt: new Date(),
        attested,
        skeletonTrack: input.skeletonTrack ?? null,
      },
    });

    return { clipId: updated.id, status: 'recorded' as const, attested: updated.attested };
  }

  async requestUpload(
    currentUser: AuthenticatedUser | null | undefined,
    input: {
      clipId: string;
      videoByteSize: number;
      posterByteSize?: number;
      audience?: ProofClipAudience;
      postToGroup?: boolean;
      visibility?: 'group' | 'shared';
    },
  ) {
    const user = requireUser(currentUser);
    const clip = await this.requireOwnedClip(user.id, input.clipId);
    const intent = resolveProofClipUploadIntent(input);

    if (clip.status !== 'recorded' && clip.status !== 'ready') {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_WRONG_STATUS });
    }
    if (!clip.sha256) {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_WRONG_STATUS });
    }
    if (input.videoByteSize > PROOF_CLIP_MAX_BYTES) {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_UPLOAD_SIZE_MISMATCH });
    }
    if (intent.postToGroup && clip.status === 'recorded') {
      await this.assertCanPostToGroup(user.id, clip);
    }

    this.requireStorage();

    const videoKey = clip.videoKey ?? videoObjectKey(user.id, clip.id);
    const posterKey =
      input.posterByteSize != null
        ? (clip.posterKey ?? posterObjectKey(user.id, clip.id))
        : null;

    await this.prisma.proofClip.update({
      where: { id: clip.id },
      data: {
        videoKey,
        posterKey,
        byteSize: input.videoByteSize,
      },
    });

    try {
      const video = await this.storage.presignPut({
        key: videoKey,
        contentType: PROOF_CLIP_VIDEO_CONTENT_TYPE,
        byteSize: input.videoByteSize,
        checksumSha256Base64: sha256HexToBase64(clip.sha256),
      });
      const poster =
        posterKey && input.posterByteSize != null
          ? await this.storage.presignPut({
              key: posterKey,
              contentType: PROOF_CLIP_POSTER_CONTENT_TYPE,
              byteSize: input.posterByteSize,
            })
          : null;

      return {
        video: { ...video, key: videoKey },
        poster: poster && posterKey ? { ...poster, key: posterKey } : null,
      };
    } catch (error) {
      throw this.mapStorageError(error);
    }
  }

  async completeUpload(
    currentUser: AuthenticatedUser | null | undefined,
    input: {
      clipId: string;
      audience?: ProofClipAudience;
      postToGroup?: boolean;
      visibility?: 'group' | 'shared';
    },
  ) {
    const user = requireUser(currentUser);
    const clip = await this.requireOwnedClip(user.id, input.clipId);
    const intent = resolveProofClipUploadIntent(input);
    const visibility = legacyVisibilityFor(intent.audience, intent.postToGroup);

    if (clip.status === 'ready') {
      const nextAudience =
        effectiveAudience(clip) === 'anyone' ? 'anyone' : intent.audience;
      const nextPost =
        isPostedToGroup(clip) || intent.postToGroup
          ? (clip.postedToGroupAt ?? new Date())
          : null;
      const nextVisibility = legacyVisibilityFor(nextAudience, nextPost != null);
      await this.prisma.proofClip.update({
        where: { id: clip.id },
        data: {
          audience: nextAudience,
          postedToGroupAt: nextPost,
          visibility: nextVisibility,
        },
      });
      return {
        clipId: clip.id,
        status: 'ready' as const,
        expiresAt: (clip.expiresAt ?? new Date()).toISOString(),
      };
    }

    if (clip.status !== 'recorded' || !clip.videoKey || !clip.recordedAt) {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_WRONG_STATUS });
    }

    if (intent.postToGroup) {
      await this.assertCanPostToGroup(user.id, clip);
    }

    this.requireStorage();

    let head;
    try {
      head = await this.storage.head(clip.videoKey);
    } catch (error) {
      throw this.mapStorageError(error);
    }

    if (!head) {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_UPLOAD_MISSING });
    }
    if (clip.byteSize != null && head.byteSize !== clip.byteSize) {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_UPLOAD_SIZE_MISMATCH });
    }

    const match = clip.matchId
      ? await this.prisma.match.findUnique({
          where: { id: clip.matchId },
          select: { endsAt: true },
        })
      : null;

    const now = new Date();
    const sharedAt = now;
    const expiresAt = computeProofClipExpiry({
      recordedAt: clip.recordedAt,
      matchEndsAt: match?.endsAt ?? null,
      sharedAt,
      lastViewedAt: null,
    });

    const updated = await this.prisma.proofClip.update({
      where: { id: clip.id },
      data: {
        status: 'ready',
        audience: intent.audience,
        postedToGroupAt: intent.postToGroup ? now : null,
        visibility,
        sharedAt,
        expiresAt,
      },
    });

    return {
      clipId: updated.id,
      status: 'ready' as const,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Narrows or widens who may watch. Takes effect immediately for verify;
   * already-issued signed URLs lapse within the signed-URL TTL.
   */
  async setAudience(
    currentUser: AuthenticatedUser | null | undefined,
    input: { clipId: string; audience: ProofClipAudience },
  ): Promise<ProofClip> {
    const user = requireUser(currentUser);
    const clip = await this.requireOwnedClip(user.id, input.clipId);
    const posted = isPostedToGroup(clip);
    const visibility = legacyVisibilityFor(input.audience, posted);

    const updated = await this.prisma.proofClip.update({
      where: { id: clip.id },
      data: {
        audience: input.audience,
        visibility,
        // Only_me clips that were never posted are swept of their objects.
        ...(input.audience === 'only_me' && !posted && clip.status === 'ready'
          ? { expiresAt: new Date() }
          : {}),
      },
    });

    return this.present(updated, user.id);
  }

  async get(
    currentUser: AuthenticatedUser | null | undefined,
    clipId: string,
  ): Promise<ProofClip> {
    const user = requireUser(currentUser);
    const clip = await this.prisma.proofClip.findUnique({ where: { id: clipId } });
    if (!clip || clip.status === 'removed') {
      throw new ORPCError('NOT_FOUND', { message: PROOF_CLIP_NOT_FOUND });
    }

    await this.assertCanView(user.id, clip);
    await this.touchView(clip);
    return this.present(clip, user.id);
  }

  async listForMatch(
    currentUser: AuthenticatedUser | null | undefined,
    input: { matchId: string; dayKey?: string; allDays?: boolean },
  ) {
    const user = requireUser(currentUser);
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      include: { participants: true },
    });
    if (!match) {
      throw new ORPCError('NOT_FOUND', { message: PROOF_CLIP_CONTEXT_NOT_FOUND });
    }

    const isParticipant =
      match.hostUserId === user.id ||
      match.participants.some((p) => p.userId === user.id && p.acceptedAt != null);
    if (!isParticipant) {
      throw new ORPCError('FORBIDDEN', { message: PROOF_CLIP_NOT_PARTICIPANT });
    }

    const blocked = await this.blockedUserIds(user.id);
    const dayKey = input.dayKey ?? dayKeyFor(DEFAULT_TIME_ZONE);
    const recordedAt = input.allDays
      ? undefined
      : {
          gte: new Date(`${dayKey}T00:00:00.000Z`),
          lt: new Date(`${dayKey}T23:59:59.999Z`),
        };

    const clips = await this.prisma.proofClip.findMany({
      where: {
        matchId: input.matchId,
        status: 'ready',
        postedToGroupAt: { not: null },
        userId: { notIn: [...blocked] },
        recordedAt,
      },
      include: {
        user: { include: { profile: true } },
        reports: { where: { reporterUserId: user.id } },
      },
      orderBy: { recordedAt: 'desc' },
      take: input.allDays ? PROOF_CLIP_ALL_DAYS_LIMIT : undefined,
    });

    const visible = clips.filter((clip) => clip.reports.length === 0);
    const presented = await Promise.all(
      visible.map(async (clip) => {
        const base = await this.present(clip, user.id);
        return {
          ...base,
          userId: clip.userId,
          displayName: groupNameFor(clip.user),
        };
      }),
    );

    return { clips: presented };
  }

  async verify(
    currentUser: AuthenticatedUser | null | undefined,
    code: string,
  ): Promise<VerifyProofCodeOutput> {
    const user = requireUser(currentUser);
    this.enforceVerifyRateLimit(`user:${user.id}`, PROOF_CLIP_VERIFY_RATE_LIMIT);

    const clip = await this.prisma.proofClip.findUnique({ where: { code } });
    if (!clip) {
      return { outcome: 'not_found' };
    }
    if (clip.status === 'removed') {
      return { outcome: 'removed' };
    }

    const isOwner = clip.userId === user.id;
    const audience = effectiveAudience(clip);
    const posted = isPostedToGroup(clip);
    const isParticipant =
      posted &&
      clip.matchId != null &&
      (await this.isAcceptedParticipant(user.id, clip.matchId));

    if (audience === 'only_me' && !isOwner && !isParticipant) {
      return { outcome: 'private' };
    }

    if (!isOwner && !isParticipant && audience !== 'anyone') {
      return { outcome: 'private' };
    }

    const outcome = await this.verifyOutcomeFor(clip);
    if (outcome.outcome === 'verified') {
      await this.touchView(clip);
    }
    return outcome;
  }

  /**
   * Anonymous verify. Only clips with audience `anyone` that have been
   * uploaded succeed. Does not touch lastViewedAt so anonymous traffic
   * cannot extend retention.
   */
  async verifyPublic(
    code: string,
    clientKey: string,
  ): Promise<VerifyProofCodeOutput> {
    this.enforceVerifyRateLimit(
      `ip:${clientKey}`,
      PROOF_CLIP_PUBLIC_VERIFY_RATE_LIMIT,
    );

    const clip = await this.prisma.proofClip.findUnique({ where: { code } });
    if (!clip) {
      return { outcome: 'not_found' };
    }
    if (clip.status === 'removed') {
      return { outcome: 'removed' };
    }
    if (effectiveAudience(clip) !== 'anyone') {
      return { outcome: 'private' };
    }

    return this.verifyOutcomeFor(clip);
  }

  private async verifyOutcomeFor(
    clip: DbProofClip,
  ): Promise<VerifyProofCodeOutput> {
    if (clip.status === 'reserved' || clip.status === 'recorded') {
      return { outcome: 'not_uploaded' };
    }
    if (!clip.recordedAt) {
      return { outcome: 'not_found' };
    }

    if (
      clip.status === 'expired' ||
      !clip.videoKey ||
      (clip.expiresAt != null && clip.expiresAt.getTime() <= Date.now())
    ) {
      return {
        outcome: 'original_expired',
        metric: clip.metric,
        count: clip.count,
        recordedAt: clip.recordedAt.toISOString(),
        attested: clip.attested,
      };
    }

    if (clip.status !== 'ready') {
      return { outcome: 'not_found' };
    }

    const urls = await this.signedUrls(clip);

    return {
      outcome: 'verified',
      metric: clip.metric,
      count: clip.count,
      recordedAt: clip.recordedAt.toISOString(),
      attested: clip.attested,
      videoUrl: urls.videoUrl,
      posterUrl: urls.posterUrl,
    };
  }

  async remove(
    currentUser: AuthenticatedUser | null | undefined,
    clipId: string,
  ) {
    const user = requireUser(currentUser);
    const clip = await this.requireOwnedClip(user.id, clipId);
    await this.prisma.proofClip.update({
      where: { id: clip.id },
      data: { status: 'removed', expiresAt: new Date() },
    });
    return { ok: true as const };
  }

  async report(
    currentUser: AuthenticatedUser | null | undefined,
    input: { clipId: string; reason: 'inappropriate' | 'spam' | 'harassment' | 'other' },
  ) {
    const user = requireUser(currentUser);
    const clip = await this.prisma.proofClip.findUnique({ where: { id: input.clipId } });
    if (!clip || clip.status === 'removed') {
      throw new ORPCError('NOT_FOUND', { message: PROOF_CLIP_NOT_FOUND });
    }

    await this.prisma.proofClipReport.upsert({
      where: {
        clipId_reporterUserId: { clipId: clip.id, reporterUserId: user.id },
      },
      create: {
        clipId: clip.id,
        reporterUserId: user.id,
        reason: input.reason,
      },
      update: { reason: input.reason },
    });

    return { ok: true as const };
  }

  async block(
    currentUser: AuthenticatedUser | null | undefined,
    blockedUserId: string,
  ) {
    const user = requireUser(currentUser);
    if (user.id === blockedUserId) {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_CANNOT_BLOCK_SELF });
    }

    await this.prisma.userBlock.upsert({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId: user.id,
          blockedUserId,
        },
      },
      create: { blockerUserId: user.id, blockedUserId },
      update: {},
    });

    return { ok: true as const };
  }

  async unblock(
    currentUser: AuthenticatedUser | null | undefined,
    blockedUserId: string,
  ) {
    const user = requireUser(currentUser);
    await this.prisma.userBlock.deleteMany({
      where: { blockerUserId: user.id, blockedUserId },
    });
    return { ok: true as const };
  }

  /** Marks every clip owned by the user so the retention sweep deletes objects. */
  async markRemovedForUser(userId: string, transaction: PrismaClient): Promise<void> {
    await transaction.proofClip.updateMany({
      where: { userId, status: { not: 'removed' } },
      data: { status: 'removed', expiresAt: new Date() },
    });
    await transaction.userBlock.deleteMany({
      where: { OR: [{ blockerUserId: userId }, { blockedUserId: userId }] },
    });
    await transaction.proofClipReport.deleteMany({ where: { reporterUserId: userId } });
  }

  private async resolveContext(
    userId: string,
    input: ReserveProofClipInput,
  ): Promise<{ userChallengeId: string | null; matchId: string | null }> {
    if (input.context.kind === 'challenge') {
      const occurrence = await this.prisma.userChallenge.findFirst({
        where: { id: input.context.userChallengeId, userId },
      });
      if (!occurrence) {
        throw new ORPCError('NOT_FOUND', { message: PROOF_CLIP_CONTEXT_NOT_FOUND });
      }
      return { userChallengeId: occurrence.id, matchId: null };
    }

    if (input.context.kind === 'practice') {
      return { userChallengeId: null, matchId: null };
    }

    const match = await this.prisma.match.findUnique({
      where: { id: input.context.matchId },
      include: { participants: true },
    });
    if (!match) {
      throw new ORPCError('NOT_FOUND', { message: PROOF_CLIP_CONTEXT_NOT_FOUND });
    }
    const isParticipant =
      match.hostUserId === userId ||
      match.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ORPCError('FORBIDDEN', { message: PROOF_CLIP_NOT_PARTICIPANT });
    }
    return { userChallengeId: null, matchId: match.id };
  }

  private async requireOwnedClip(userId: string, clipId: string): Promise<DbProofClip> {
    const clip = await this.prisma.proofClip.findUnique({ where: { id: clipId } });
    if (!clip || clip.status === 'removed') {
      throw new ORPCError('NOT_FOUND', { message: PROOF_CLIP_NOT_FOUND });
    }
    if (clip.userId !== userId) {
      throw new ORPCError('FORBIDDEN', { message: PROOF_CLIP_NOT_OWNER });
    }
    return clip;
  }

  private async assertCanView(viewerId: string, clip: DbProofClip): Promise<void> {
    if (clip.userId === viewerId) {
      return;
    }

    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerUserId: viewerId, blockedUserId: clip.userId },
          { blockerUserId: clip.userId, blockedUserId: viewerId },
        ],
      },
    });
    if (blocked) {
      throw new ORPCError('NOT_FOUND', { message: PROOF_CLIP_NOT_FOUND });
    }

    const reported = await this.prisma.proofClipReport.findUnique({
      where: {
        clipId_reporterUserId: { clipId: clip.id, reporterUserId: viewerId },
      },
    });
    if (reported) {
      throw new ORPCError('NOT_FOUND', { message: PROOF_CLIP_NOT_FOUND });
    }

    if (
      isPostedToGroup(clip) &&
      clip.matchId &&
      (await this.isAcceptedParticipant(viewerId, clip.matchId))
    ) {
      return;
    }

    if (effectiveAudience(clip) === 'anyone' && clip.status === 'ready') {
      return;
    }

    throw new ORPCError('FORBIDDEN', { message: PROOF_CLIP_NOT_PARTICIPANT });
  }

  private async isAcceptedParticipant(userId: string, matchId: string): Promise<boolean> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });
    if (!match) {
      return false;
    }
    if (match.hostUserId === userId) {
      return true;
    }
    return match.participants.some((p) => p.userId === userId && p.acceptedAt != null);
  }

  private async assertCanPostToGroup(userId: string, clip: DbProofClip): Promise<void> {
    if (!clip.matchId || !clip.recordedAt) {
      throw new ORPCError('BAD_REQUEST', { message: PROOF_CLIP_CONTEXT_NOT_FOUND });
    }
    await this.assertDailyPostCap(userId, clip.matchId, clip.recordedAt);
  }

  private async assertDailyPostCap(
    userId: string,
    matchId: string,
    recordedAt: Date,
  ): Promise<void> {
    const dayKey = dayKeyFor(DEFAULT_TIME_ZONE, recordedAt);
    const start = new Date(`${dayKey}T00:00:00.000Z`);
    const end = new Date(`${dayKey}T23:59:59.999Z`);
    const existing = await this.prisma.proofClip.count({
      where: {
        userId,
        matchId,
        status: 'ready',
        postedToGroupAt: { not: null },
        recordedAt: { gte: start, lte: end },
      },
    });
    if (existing > 0) {
      throw new ORPCError('CONFLICT', { message: PROOF_CLIP_DAILY_CAP });
    }
  }

  private async blockedUserIds(viewerId: string): Promise<Set<string>> {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerUserId: viewerId }, { blockedUserId: viewerId }],
      },
    });
    const ids = new Set<string>();
    for (const row of rows) {
      ids.add(row.blockerUserId === viewerId ? row.blockedUserId : row.blockerUserId);
    }
    return ids;
  }

  private async touchView(clip: DbProofClip): Promise<void> {
    if (clip.status !== 'ready' || !clip.recordedAt) {
      return;
    }

    const now = new Date();
    const match = clip.matchId
      ? await this.prisma.match.findUnique({
          where: { id: clip.matchId },
          select: { endsAt: true },
        })
      : null;
    const expiresAt = computeProofClipExpiry({
      recordedAt: clip.recordedAt,
      matchEndsAt: match?.endsAt ?? null,
      sharedAt: clip.sharedAt,
      lastViewedAt: now,
    });

    await this.prisma.proofClip.update({
      where: { id: clip.id },
      data: { lastViewedAt: now, expiresAt },
    });
  }

  private async present(clip: DbProofClip, viewerId: string): Promise<ProofClip> {
    const urls =
      clip.status === 'ready' ? await this.signedUrls(clip) : { videoUrl: null, posterUrl: null };

    return {
      id: clip.id,
      code: clip.code,
      displayCode: toDisplayProofCode(clip.code),
      status: clip.status,
      metric: clip.metric,
      count: clip.count,
      durationSeconds: clip.durationSeconds,
      matchId: clip.matchId,
      userChallengeId: clip.userChallengeId,
      recordedAt: clip.recordedAt?.toISOString() ?? null,
      sharedAt: clip.sharedAt?.toISOString() ?? null,
      expiresAt: clip.expiresAt?.toISOString() ?? null,
      attested: clip.attested,
      audience: effectiveAudience(clip),
      isPostedToGroup: isPostedToGroup(clip),
      videoUrl: urls.videoUrl,
      posterUrl: urls.posterUrl,
      isOwner: clip.userId === viewerId,
    };
  }

  private async signedUrls(
    clip: DbProofClip,
  ): Promise<{ videoUrl: string | null; posterUrl: string | null }> {
    if (!clip.videoKey) {
      return { videoUrl: null, posterUrl: null };
    }

    try {
      const videoUrl = await this.storage.presignGet(
        clip.videoKey,
        PROOF_CLIP_SIGNED_URL_TTL_SECONDS,
      );
      const posterUrl = clip.posterKey
        ? await this.storage.presignGet(clip.posterKey, PROOF_CLIP_SIGNED_URL_TTL_SECONDS)
        : null;
      return { videoUrl, posterUrl };
    } catch {
      return { videoUrl: null, posterUrl: null };
    }
  }

  private enforceVerifyRateLimit(key: string, limit: number): void {
    if (!this.verifyRateLimiter.tryConsume(key, limit)) {
      throw new ORPCError('TOO_MANY_REQUESTS', { message: PROOF_CLIP_VERIFY_RATE_LIMITED });
    }
  }

  private requireStorage(): void {
    // Disabled storage throws on first call; catch early with a clear message.
    try {
      // Touch the adapter only when we are about to use it — disabled mode
      // throws from every method.
    } catch {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: PROOF_CLIP_STORAGE_UNAVAILABLE,
      });
    }
  }

  private mapStorageError(error: unknown): never {
    const message = error instanceof Error ? error.message : '';
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: message.includes('not configured')
        ? PROOF_CLIP_STORAGE_UNAVAILABLE
        : PROOF_CLIP_STORAGE_UNAVAILABLE,
    });
  }
}
