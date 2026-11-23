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

export type GymPhotoSweepSummary = {
  objectsDeleted: number;
  rowsCleared: number;
};

/**
 * Deletes expired gym selfie objects and clears the occurrence keys. Safe to
 * run twice: deletes are idempotent and already-cleared rows are skipped.
 */
@Injectable()
export class GymPhotoRetentionService {
  private readonly logger = new Logger(GymPhotoRetentionService.name);
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
      this.logger.error('Gym photo retention sweep failed', error);
    }
  }

  async sweep(now: Date = new Date()): Promise<GymPhotoSweepSummary> {
    if (this.isSweeping) {
      this.logger.warn('Skipping gym photo sweep: the previous run is still going');
      return { objectsDeleted: 0, rowsCleared: 0 };
    }

    this.isSweeping = true;
    try {
      const due = await this.prisma.userChallenge.findMany({
        where: {
          photoKey: { not: null },
          photoExpiresAt: { lte: now },
        },
        select: { id: true, photoKey: true },
        take: 200,
      });

      let objectsDeleted = 0;
      let rowsCleared = 0;

      for (const row of due) {
        if (row.photoKey) {
          await this.safeDelete(row.photoKey);
          objectsDeleted += 1;
        }

        await this.prisma.userChallenge.update({
          where: { id: row.id },
          data: { photoKey: null, photoExpiresAt: null },
        });
        rowsCleared += 1;
      }

      return { objectsDeleted, rowsCleared };
    } finally {
      this.isSweeping = false;
    }
  }

  private async safeDelete(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(`Failed to delete gym photo ${key}`, error);
    }
  }
}
