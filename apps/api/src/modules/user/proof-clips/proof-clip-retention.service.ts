import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { PrismaClient } from '@product/db';
import { ENVIRONMENT } from '../../shared-modules/config/config.tokens.js';
import type { Environment } from '../../shared-modules/config/environment.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '../../shared-modules/storage/index.js';
import { PROOF_CLIP_RESERVE_TTL_HOURS } from './constants/proof-clips.js';

export type ProofClipSweepSummary = {
  expiredMarked: number;
  objectsDeleted: number;
  reservedDeleted: number;
};

/**
 * Deletes expired and removed clip objects, then marks rows `expired`. Safe to
 * run twice: deletes are idempotent and already-expired rows are skipped.
 */
@Injectable()
export class ProofClipRetentionService {
  private readonly logger = new Logger(ProofClipRetentionService.name);
  private isSweeping = false;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick(): Promise<void> {
    if (this.environment.schedulerMode !== 'in_process') {
      return;
    }

    try {
      await this.sweep();
    } catch (error) {
      this.logger.error('Proof clip retention sweep failed', error);
    }
  }

  async sweep(now: Date = new Date()): Promise<ProofClipSweepSummary> {
    if (this.isSweeping) {
      this.logger.warn('Skipping sweep: the previous run is still going');
      return { expiredMarked: 0, objectsDeleted: 0, reservedDeleted: 0 };
    }

    this.isSweeping = true;
    try {
      const due = await this.prisma.proofClip.findMany({
        where: {
          OR: [
            { status: 'ready', expiresAt: { lte: now } },
            { status: 'removed', OR: [{ videoKey: { not: null } }, { posterKey: { not: null } }] },
            { status: 'expired', OR: [{ videoKey: { not: null } }, { posterKey: { not: null } }] },
          ],
        },
        select: { id: true, videoKey: true, posterKey: true, status: true },
        take: 200,
      });

      let objectsDeleted = 0;
      let expiredMarked = 0;

      for (const clip of due) {
        if (clip.videoKey) {
          await this.safeDelete(clip.videoKey);
          objectsDeleted += 1;
        }
        if (clip.posterKey) {
          await this.safeDelete(clip.posterKey);
          objectsDeleted += 1;
        }

        await this.prisma.proofClip.update({
          where: { id: clip.id },
          data: {
            videoKey: null,
            posterKey: null,
            status: clip.status === 'removed' ? 'removed' : 'expired',
          },
        });
        if (clip.status !== 'removed') {
          expiredMarked += 1;
        }
      }

      const reserveCutoff = new Date(
        now.getTime() - PROOF_CLIP_RESERVE_TTL_HOURS * 60 * 60 * 1000,
      );
      const reserved = await this.prisma.proofClip.deleteMany({
        where: { status: 'reserved', reservedAt: { lt: reserveCutoff } },
      });

      return {
        expiredMarked,
        objectsDeleted,
        reservedDeleted: reserved.count,
      };
    } finally {
      this.isSweeping = false;
    }
  }

  private async safeDelete(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(`Failed to delete object ${key}`, error);
    }
  }
}
