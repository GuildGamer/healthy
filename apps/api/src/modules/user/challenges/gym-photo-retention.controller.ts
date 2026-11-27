import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import { InternalSecretGuard } from '../../shared-modules/engagement/dispatch/internal-secret.guard.js';
import {
  GymPhotoRetentionService,
  type GymPhotoSweepSummary,
} from './gym-photo-retention.service.js';

@Controller('internal/gym-photos')
export class GymPhotoRetentionController {
  constructor(private readonly retention: GymPhotoRetentionService) {}

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('sweep')
  @HttpCode(200)
  async sweep(): Promise<GymPhotoSweepSummary> {
    return this.retention.sweep();
  }
}
